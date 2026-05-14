import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import dotenv from "dotenv";
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';
import cron from 'node-cron';
import fs from 'fs';

// Types for proof evaluation
type MetadataStatus = 'verified' | 'missing' | 'mismatch' | 'unverified';
type CaptureTrustLevel = 'live' | 'verifiedCameraRoll' | 'unverifiedCameraRoll';
type ReviewStatus = 'approved' | 'pendingReview' | 'rejected' | 'autoRejected' | 'needsMoreProof';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin for background tasks
let adminApp: App | null = null;
try {
  const firebaseConfigPath = path.join(__dirname, 'firebase-applet-config.json');
  if (fs.existsSync(firebaseConfigPath)) {
    const config = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf8'));
    adminApp = getApps().length === 0 ? initializeApp({
      projectId: config.projectId,
      storageBucket: config.storageBucket || `${config.projectId}.firebasestorage.app`
    }) : getApps()[0];
    console.log(`[BUREAU_ADMIN] Initialized for project: ${config.projectId}`);
  } else {
    adminApp = getApps().length === 0 ? initializeApp() : getApps()[0];
  }
} catch (e) {
  console.warn("[BUREAU_ADMIN] Warning: Firebase Admin initialization failed. Purge job may not run.", e);
}

const dbAdmin = adminApp ? getFirestore() : null;
const storageAdmin = adminApp ? getStorage() : null;

/**
 * DAILY PURGE JOB (Billing Protection)
 * Runs at 00:00 every day
 * Purges rejected images older than 14 days
 */
const runPurgeJob = async () => {
  if (!dbAdmin || !storageAdmin) {
    console.warn("[PURGE_JOB] Skipped: Admin SDK not ready.");
    return;
  }

  console.log(`[PURGE_JOB] Starting scheduled cleanup: ${new Date().toISOString()}`);
  
  try {
    const now = new Date();
    
    // 1. Purge Entries
    let entriesSnapshot;
    try {
      console.log("[PURGE_JOB] Querying entries for purge...");
      entriesSnapshot = await dbAdmin.collection('entries')
        .where('status', '==', 'rejected')
        .where('purgeEligibleAt', '<=', now)
        .where('imagePurged', '!=', true)
        .get();
    } catch (queryErr: any) {
      const isNotFound = queryErr.code === 5 || queryErr.status === 404 || 
                         String(queryErr).includes("NOT_FOUND") ||
                         queryErr.message?.includes("NOT_FOUND");
      
      if (isNotFound) {
        console.warn("[PURGE_JOB] 'entries' collection not found yet. Skipping entry purge.");
        entriesSnapshot = { empty: true, docs: [] };
      } else {
        throw queryErr;
      }
    }

    if (entriesSnapshot.empty) {
      console.log("[PURGE_JOB] No entries eligible for purge today.");
    } else {
      let purgedEntries = 0;
      let entryErrors = 0;

      for (const doc of entriesSnapshot.docs) {
        const data = doc.data();
        const imagePath = data.imageStoragePath;

        try {
          if (imagePath) {
            // Delete from Storage
            try {
              await storageAdmin.bucket().file(imagePath).delete();
            } catch (storageErr: any) {
              const isNotFound = storageErr.code === 404 || storageErr.code === 5 || 
                               storageErr.status === 404 || storageErr.message?.includes("NOT_FOUND");
              if (!isNotFound) throw storageErr;
              console.log(`[PURGE_JOB] Storage file already gone: ${imagePath}`);
            }
          }

          // Mark as purged in Firestore
          await doc.ref.update({
            imagePurged: true,
            purgedAt: FieldValue.serverTimestamp(),
            proofImage: "" 
          });
          
          purgedEntries++;
        } catch (err: any) {
          const isNotFound = err.code === 5 || err.status === 404 || err.message?.includes("NOT_FOUND");
          if (isNotFound) {
             console.log(`[PURGE_JOB] Entry document ${doc.id} already deleted.`);
             continue;
          }
          console.error(`[PURGE_JOB] Failed to purge entry ${doc.id}:`, err);
          entryErrors++;
        }
      }
      console.log(`[PURGE_JOB] Entry cleanup complete. Purged: ${purgedEntries}, Errors: ${entryErrors}`);
    }

    // 2. Purge proofReviews
    let reviewSnapshot;
    try {
      console.log("[PURGE_JOB] Querying proofReviews for purge...");
      reviewSnapshot = await dbAdmin.collection('proofReviews')
        .where('status', '==', 'rejected')
        .where('purgeEligibleAt', '<=', now)
        .where('isPurged', '!=', true)
        .get();
    } catch (queryErr: any) {
      const isNotFound = queryErr.code === 5 || queryErr.status === 404 || 
                         String(queryErr).includes("NOT_FOUND") ||
                         queryErr.message?.includes("NOT_FOUND");
      
      if (isNotFound) {
        console.warn("[PURGE_JOB] 'proofReviews' collection not found yet. Skipping review purge.");
        reviewSnapshot = { empty: true, docs: [] };
      } else {
        throw queryErr;
      }
    }

    if (reviewSnapshot.empty) {
      console.log("[PURGE_JOB] No proofReviews eligible for purge today.");
    } else {
      let purgedReviews = 0;
      for (const doc of reviewSnapshot.docs) {
         try {
           await doc.ref.update({ isPurged: true, purgedAt: FieldValue.serverTimestamp() });
           purgedReviews++;
         } catch (e: any) {
           const isNotFound = e.code === 5 || e.status === 404 || e.message?.includes("NOT_FOUND");
           if (!isNotFound) console.warn(`[PURGE_JOB] Failed to mark review ${doc.id} as purged`, e);
         }
      }
      console.log(`[PURGE_JOB] Review cleanup complete. Purged: ${purgedReviews}`);
    }

  } catch (error) {
    console.error("[PURGE_JOB] Critical Error:", error);
  }
};

// Schedule the task (Daily at Midnight)
cron.schedule('0 0 * * *', () => {
  runPurgeJob();
});

// Run once on startup in dev for verification
if (process.env.NODE_ENV !== 'production') {
  setTimeout(runPurgeJob, 5000);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for parsing JSON with large limits for images
  app.use(express.json({ limit: '10mb' }));

  // Initialize Gemini
  const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

  // Middleware for verifying Firebase ID Token
  const authenticate = async (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'UNAUTHORIZED' });
    }
    const idToken = authHeader.split('Bearer ')[1];
    try {
      if (!adminApp) throw new Error("Admin SDK not initialized.");
      const decodedToken = await getAuth(adminApp).verifyIdToken(idToken);
      req.user = decodedToken;
      next();
    } catch (error) {
      console.error('Auth Error:', error);
      res.status(401).json({ error: 'INVALID_TOKEN' });
    }
  };

  // API Routes
  app.get("/api/health", (req, res) => res.json({ status: "ok" }));

  app.get("/api/time", (req, res) => {
    res.json({ serverTime: Date.now() });
  });

  /**
   * SECURE SCORING ENDPOINT
   * This handles the trusted point awarding logic formerly on the client.
   */
  app.post("/api/game/award-points", authenticate, async (req: any, res) => {
    if (!dbAdmin) return res.status(500).json({ error: "DB_ADMIN_NOT_READY" });

    try {
      const { points, type, details } = req.body;
      const { uid, name, email } = req.user;

      // HARDENING: Prevent excessive point awards from client
      const MAX_AUTO_POINTS = 500;
      const isAdminUser = email === 'hammer808@gmail.com';

      if (type === 'admin_adjustment' && !isAdminUser) {
        return res.status(403).json({ error: "UNAUTHORIZED_ADJUSTMENT" });
      }

      if (!isAdminUser && points > MAX_AUTO_POINTS) {
         return res.status(400).json({ error: "INVALID_POINTS_RESERVATION" });
      }

      const batch = dbAdmin.batch();
      
      const scoreEventRef = dbAdmin.collection('scoreEvents').doc();
      batch.set(scoreEventRef, {
        userId: uid,
        userName: name || 'Explorer',
        type,
        points: points || 0,
        entryId: details?.entryId || null,
        tripId: details?.tripId || null,
        description: details?.description || 'Automatic Award',
        crewId: details?.crewId || null,
        userAvatar: details?.userAvatar || null,
        createdAt: FieldValue.serverTimestamp()
      });

      const userRef = dbAdmin.collection('users').doc(uid);
      batch.update(userRef, {
        points: FieldValue.increment(points || 0),
        updatedAt: FieldValue.serverTimestamp()
      });

      if (details?.crewId) {
        const crewRef = dbAdmin.collection('crews').doc(details.crewId);
        batch.update(crewRef, {
          totalPoints: FieldValue.increment(points || 0),
          updatedAt: FieldValue.serverTimestamp()
        });
      }

      await batch.commit();
      res.json({ success: true, pointsAwarded: points });

    } catch (error) {
      console.error('Point Award Error:', error);
      res.status(500).json({ error: 'FAILED_TO_AWARD_POINTS' });
    }
  });

  app.post("/api/proof/evaluate-metadata", authenticate, async (req: any, res) => {
    try {
      const { metadata, challengeId, challengeWindow } = req.body;
      const { uid } = req.user;

      const photoTakenAt = metadata.photoTakenAt ? new Date(metadata.photoTakenAt) : null;
      const submittedAt = new Date();
      
      let status: MetadataStatus = metadata.metadataStatus;
      let trust: CaptureTrustLevel = metadata.source === 'camera' ? 'live' : 'unverifiedCameraRoll';
      let reviewStatus: ReviewStatus = 'approved';
      let message = "";

      // 1. Live Capture Enforcement
      if (challengeWindow.requireLiveCapture && metadata.source !== 'camera') {
        return res.status(400).json({ 
          error: 'LIVE_CAPTURE_REQUIRED', 
          message: "Live capture required for this mission. Camera roll uploads are blocked." 
        });
      }

      // 2. Camera Roll Logic
      if (metadata.source === 'cameraRoll') {
        if (photoTakenAt) {
          // Verify if it was taken during challenge window
          if (challengeWindow.requirePhotoTakenWithinChallengeWindow) {
            const start = new Date(challengeWindow.startAt);
            const end = new Date(challengeWindow.endAt);
            
            if (photoTakenAt < start || photoTakenAt > end) {
              return res.status(400).json({ 
                error: 'OUTSIDE_WINDOW', 
                message: "This photo looks like it was taken before the challenge started." 
              });
            }
          }
          trust = 'verifiedCameraRoll';
          status = 'verified';
        } else {
          // No metadata
          if (!challengeWindow.allowMissingExif) {
            return res.status(400).json({ 
              error: 'MISSING_METADATA', 
              message: "We couldn’t verify when this photo was taken. Please use a photo with EXIF data or take one live." 
            });
          }
          
          if (challengeWindow.reviewIfMetadataMissing) {
            reviewStatus = 'pendingReview';
            message = "We couldn’t verify when this photo was taken, so it was sent to review.";
          }
          
          status = 'missing';
          trust = 'unverifiedCameraRoll';
        }
      } else {
        // Camera source
        trust = 'live';
        status = 'verified';
      }

      res.json({
        success: true,
        photoTakenAt: photoTakenAt?.toISOString() || null,
        submittedAt: submittedAt.toISOString(),
        metadataStatus: status,
        captureTrustLevel: trust,
        reviewStatus,
        message
      });

    } catch (error) {
      console.error('Metadata evaluation error:', error);
      res.status(500).json({ error: 'METADATA_EVAL_FAILED' });
    }
  });

  app.post("/api/analyze-proof", async (req, res) => {
    try {
      const { base64Image, challengeTitle, instructions, requiredSubjects } = req.body;
      
      if (!process.env.GEMINI_API_KEY) {
         return res.status(500).json({ error: "GEMINI_API_KEY_NOT_CONFIGURED" });
      }

      const prompt = `
        Analyze this field recording for the challenge: "${challengeTitle}".
        Instructions: ${instructions}
        Required Subjects: ${requiredSubjects?.join(', ') || 'None specified'}
        Verify if the image content matches the challenge description.
      `;

      // Remove prefix if present in base64Image
      const base64Data = base64Image.includes(",") ? base64Image.split(",")[1] : base64Image;

      const model = ai.getGenerativeModel({
        model: "gemini-1.5-flash",
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: SchemaType.OBJECT,
            properties: {
              contains_required_subject: { type: SchemaType.BOOLEAN },
              visible_evidence: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
              missing_evidence: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
              confidence: { type: SchemaType.NUMBER },
              reason: { type: SchemaType.STRING },
              suggested_lore_tags: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }
            },
            required: ["contains_required_subject", "visible_evidence", "missing_evidence", "confidence", "reason", "suggested_lore_tags"]
          }
        }
      });

      const result = await model.generateContent([
        { text: prompt },
        { inlineData: { data: base64Data, mimeType: "image/jpeg" } }
      ]);

      const response = result.response;
      res.json(JSON.parse(response.text() || '{}'));

    } catch (error) {
      console.error("Gemini Analysis Error:", error);
      res.status(500).json({ 
        contains_required_subject: false,
        visible_evidence: [],
        missing_evidence: ["API_ERROR"],
        confidence: 0,
        reason: "The Bureau's analytical uplink is currently unstable.",
        suggested_lore_tags: ["Signal_Loss"]
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production static serving
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[BUREAU_SERVER] Running on http://localhost:${PORT}`);
    console.log(`[BUREAU_SERVER] Mode: ${process.env.NODE_ENV || 'development'}`);
  });
}

startServer();
