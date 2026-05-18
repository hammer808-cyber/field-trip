import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import dotenv from "dotenv";
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getAppCheck } from 'firebase-admin/app-check';
import { getStorage } from 'firebase-admin/storage';
import cron from 'node-cron';
import fs from 'fs';

// Types for proof evaluation
type MetadataStatus = 'verified' | 'missing' | 'mismatch' | 'unverified';
type CaptureTrustLevel = 'live' | 'verifiedCameraRoll' | 'unverifiedCameraRoll';
type ReviewStatus = 'approved' | 'pendingReview' | 'rejected' | 'autoRejected' | 'needsMoreProof';

dotenv.config();

// For bundled output compatibility
const rootPath = process.cwd();
const isProduction = process.env.NODE_ENV === 'production';

// Initialize Firebase Admin for background tasks
let adminApp: App | null = null;
let dbAdmin: FirebaseFirestore.Firestore | null = null;

try {
  const firebaseConfigPath = path.join(rootPath, 'firebase-applet-config.json');
  if (fs.existsSync(firebaseConfigPath)) {
    const config = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf8'));
    
    // Revert to a simpler initialization that respects the config projectId
    // and handle potential initialization errors gracefully.
    try {
      if (getApps().length === 0) {
        adminApp = initializeApp({
          projectId: config.projectId,
          storageBucket: config.storageBucket || `${config.projectId}.firebasestorage.app`
        });
      } else {
        adminApp = getApps()[0];
      }
      
      const dbId = config.firestoreDatabaseId;
      dbAdmin = getFirestore(adminApp, dbId);
      console.log(`[BUREAU_ADMIN] Initialized for project: ${config.projectId}, database: ${dbId}`);
    } catch (initErr: any) {
      console.error("[BUREAU_ADMIN] Initialization Error:", initErr.message);
    }
  } else {
    // If no config file, fallback to default credentials
    adminApp = getApps().length === 0 ? initializeApp() : getApps()[0];
    dbAdmin = getFirestore(adminApp);
    console.log(`[BUREAU_ADMIN] Initialized with default credentials (no config file)`);
  }
} catch (e: any) {
  console.error("[BUREAU_ADMIN] FATAL: Firebase Admin initialization failed:", e.message);
}

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
      // Combine filters or fetch and filter in memory if index missing
      // For now, keep the query but handle potential index/permission issues
      entriesSnapshot = await dbAdmin.collection('entries')
        .where('status', '==', 'rejected')
        .where('purgeEligibleAt', '<=', now)
        .get();
    } catch (queryErr: any) {
      const isNotFound = queryErr.code === 5 || queryErr.status === 404 || 
                         String(queryErr).includes("NOT_FOUND") ||
                         queryErr.message?.includes("NOT_FOUND");
      
      const isPermissionDenied = queryErr.code === 7 || queryErr.message?.includes("permission");

      if (isNotFound) {
        console.warn("[PURGE_JOB] 'entries' collection not found yet. Skipping entry purge.");
        entriesSnapshot = { empty: true, docs: [] };
      } else if (isPermissionDenied) {
        console.error("[PURGE_JOB] Permission Denied during entries query. Check IAM and Database ID.");
        throw queryErr;
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
        if (data.imagePurged === true) continue; // Skip already purged
        
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
         if (doc.data().isPurged === true) continue; // Skip already purged
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

// Schedule the task (Daily at Midnight) - DISABLED: REQUIRES IAM PERMISSIONS ON NAMED DATABASE
// cron.schedule('0 0 * * *', () => {
//   runPurgeJob();
// });

// Run once on startup in dev for verification - DISABLED BY DEFAULT AS REQUESTED
if (process.env.NODE_ENV !== 'production' && process.env.ENABLE_STARTUP_PURGE === 'true') {
  setTimeout(runPurgeJob, 5000);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for parsing JSON with large limits for images
  app.use(express.json({ limit: '10mb' }));

  // Initialize Gemini
  const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

  // Middleware for verifying Firebase ID Token and App Check Token
  const authenticate = async (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    const appCheckToken = req.headers['x-firebase-appcheck'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'UNAUTHORIZED' });
    }
    const idToken = authHeader.split('Bearer ')[1];
    
    try {
      if (!adminApp) throw new Error("Admin SDK not initialized.");
      
      // 1. Verify App Check (if enforced)
      if (process.env.ENFORCE_APP_CHECK === 'true') {
        if (!appCheckToken) {
          console.warn('[AUTH_GUARD] Blocked: Missing App Check token.');
          return res.status(401).json({ error: 'APP_CHECK_REQUIRED' });
        }
        try {
          await getAppCheck(adminApp).verifyToken(appCheckToken);
        } catch (acErr) {
          console.error('[AUTH_GUARD] Blocked: Invalid App Check token.', acErr);
          return res.status(401).json({ error: 'INVALID_APP_CHECK_TOKEN' });
        }
      } else if (appCheckToken) {
        // Optional verification if not enforced
        try {
          await getAppCheck(adminApp).verifyToken(appCheckToken);
          console.log('[AUTH_GUARD] App Check verified (optional path)');
        } catch (acErr) {
          console.warn('[AUTH_GUARD] App Check provided but invalid (optional path)');
        }
      }

      // 2. Verify Auth Token
      const decodedToken = await getAuth(adminApp).verifyIdToken(idToken);
      req.user = decodedToken;
      next();
    } catch (error) {
      console.error('Auth Error:', error);
      res.status(401).json({ error: 'INVALID_TOKEN' });
    }
  };

  // API Routes
  app.get("/api/health", async (req, res) => {
    const health: any = { status: "ok", timestamp: Date.now() };
    
    if (dbAdmin) {
      try {
        // Simple write/read test to a reserved health check document
        const healthRef = dbAdmin.collection('_system').doc('health');
        await healthRef.set({ lastCheck: FieldValue.serverTimestamp(), status: 'alive' });
        health.firestore = "connected";
        health.databaseId = dbAdmin.databaseId;
      } catch (err: any) {
        health.firestore = "error";
        health.error = err.message;
        console.error("[HEALTH] Firestore connectivity check failed:", err.message);
      }
    } else {
      health.firestore = "not_initialized";
    }
    
    res.json(health);
  });

  app.get("/api/time", (req, res) => {
    res.json({ serverTime: Date.now() });
  });

  /**
   * ACCESS CODE VALIDATION (BETA CLEARANCE)
   * Hardened server-side validation to prevent client-side connectivity errors
   */
  app.post("/api/auth/validate-clearance", async (req, res) => {
    const code = req.body?.code;
    const normalizedCode = code?.toUpperCase().trim();
    
    console.log(`[BUREAU_AUTH] Received clearance validation request for: ${normalizedCode}`);
    if (!dbAdmin || !adminApp) {
      console.warn("[BUREAU_AUTH] dbAdmin or adminApp not ready. Attempting re-init check...");
      // For some reason if they are null, we have a problem.
      return res.status(500).json({ error: "DB_ADMIN_NOT_READY" });
    }
    
    const projectId = adminApp.options.projectId;
    const databaseId = dbAdmin.databaseId;

    // Log backend target info safely as requested
    if (!isProduction) {
      console.log(`[BUREAU_AUTH] Target: ${projectId}/${databaseId}/accessCodes/${normalizedCode}`);
    }

    try {
      if (!normalizedCode) return res.status(400).json({ error: "MISSING_CODE" });

      const codeRef = dbAdmin.collection('accessCodes').doc(normalizedCode);
      let codeSnap;
      
      try {
        codeSnap = await codeRef.get();
      } catch (getErr: any) {
        console.error(`[BUREAU_AUTH] Permission/Read Error for document ${normalizedCode}:`, getErr.message);
        if (getErr.code === 7 || getErr.message?.includes('permission')) {
          console.error(`[BUREAU_AUTH] Error 7 detected. Verify that database ${databaseId} exists and the service account has permission.`);
        }
        throw getErr;
      }

      // If it doesn't exist and it's the requested default code, create it once.
      // This helps with cold-start or fresh DB environments.
      if (!codeSnap.exists && normalizedCode === 'FIELD-TRIP-001') {
        console.log(`[BUREAU_AUTH] Required access code ${normalizedCode} missing. Creating document in ${databaseId}...`);
        try {
          await codeRef.set({
            active: true,
            maxUses: 1000,
            uses: 0,
            description: "Primary Field Trip Beta Access",
            createdAt: FieldValue.serverTimestamp()
          });
          codeSnap = await codeRef.get();
          console.log(`[BUREAU_AUTH] Access code ${normalizedCode} successfully created.`);
        } catch (createErr: any) {
          console.error(`[BUREAU_AUTH] Failed to create FIELD-TRIP-001: ${createErr.message}`);
          throw createErr;
        }
      }

      if (!codeSnap.exists) {
        console.warn(`[BUREAU_AUTH] Code ${normalizedCode} not found in database ${databaseId}`);
        return res.status(404).json({ 
          valid: false, 
          error: 'INVALID_ACCESS_CODE. CHECK_SPELLING.' 
        });
      }

      const data = codeSnap.data();
      if (!data) return res.status(404).json({ valid: false, error: 'INVALID_ACCESS_CODE' });

      // Support both 'uses' and 'currentUses' based on user request and blueprint
      const currentUses = data.uses !== undefined ? data.uses : (data.currentUses || 0);
      const maxUses = data.maxUses || 0;

      // User's specific validation rules
      if (data.active !== true) {
        return res.status(403).json({ 
          valid: false, 
          error: 'ACCESS_CODE_INACTIVE. CONTACT_BUREAU.' 
        });
      }

      if (maxUses > 0 && currentUses >= maxUses) {
        return res.status(403).json({ 
          valid: false, 
          error: 'ACCESS_CODE_EXPIRED. CAPACITY_REACHED.' 
        });
      }

      // 8. After successful validation, log it
      await codeRef.update({
        lastValidatedAt: FieldValue.serverTimestamp()
      });

      console.log(`[BUREAU_AUTH] Access code validated: ${normalizedCode}`);

      res.json({ 
        valid: true,
        code: normalizedCode 
      });

    } catch (error) {
      console.error('Clearance Validation Error:', error);
      res.status(500).json({ 
        valid: false, 
        error: 'CONNECTIVITY_ERROR. THE_BUREAU_IS_UNREACHABLE.' 
      });
    }
  });

  /**
   * SECURE SCORING ENDPOINT
   * This handles the trusted point awarding logic formerly on the client.
   */
  app.post("/api/game/award-points", authenticate, async (req: any, res) => {
    if (!dbAdmin) return res.status(500).json({ error: "DB_ADMIN_NOT_READY" });

    try {
      const { points, type, details, targetUserId, targetUserName } = req.body;
      const { uid, name, email } = req.user;

      // HARDENING: Prevent excessive point awards from client
      const MAX_AUTO_POINTS = 500;
      
      let isAdminUser = (email === 'hammer808@gmail.com' && req.user.email_verified);
      
      // If not hardcoded admin, check the admins collection
      if (!isAdminUser && dbAdmin) {
        const adminDoc = await dbAdmin.collection('admins').doc(uid).get();
        if (adminDoc.exists) {
          isAdminUser = true;
        }
      }

      if (type === 'admin_adjustment' && !isAdminUser) {
        return res.status(403).json({ error: "UNAUTHORIZED_ADJUSTMENT" });
      }

      if (!isAdminUser && points > MAX_AUTO_POINTS) {
         return res.status(400).json({ error: "INVALID_POINTS_RESERVATION" });
      }

      // Determine recipient
      const finalUserId = (isAdminUser && targetUserId) ? targetUserId : uid;
      const finalUserName = (isAdminUser && targetUserName) ? targetUserName : (name || 'Agent');

      const batch = dbAdmin.batch();
      
      const scoreEventRef = dbAdmin.collection('scoreEvents').doc();
      batch.set(scoreEventRef, {
        userId: finalUserId,
        userName: finalUserName,
        type,
        points: points || 0,
        entryId: details?.entryId || null,
        tripId: details?.tripId || null,
        description: details?.description || 'Automatic Award',
        crewId: details?.crewId || null,
        userAvatar: details?.userAvatar || null,
        createdAt: FieldValue.serverTimestamp()
      });

      const userRef = dbAdmin.collection('users').doc(finalUserId);
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
      res.json({ success: true, pointsAwarded: points, targetUserId: finalUserId });

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

  app.post("/api/analyze-proof", authenticate, async (req: any, res) => {
    try {
      const { base64Image, challengeTitle, instructions, requiredSubjects } = req.body;
      const { uid } = req.user;
      
      console.log(`[PROOF_ANALYSIS] Processing request for user: ${uid}`);
      
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

  /**
   * SECURE REGISTRATION & APPROVAL
   * Creates or updates a user profile to 'approved' status if they have a valid access code.
   * Uses Admin SDK to bypass security rules constraints for promotion.
   */
  app.post("/api/auth/register-profile", authenticate, async (req: any, res) => {
    if (!dbAdmin) return res.status(500).json({ error: "DB_ADMIN_NOT_READY" });

    const { username, accessCode } = req.body;
    const { uid, email } = req.user;
    const normalizedCode = accessCode?.toUpperCase().trim();

    console.log(`[BUREAU_REG] Registration attempt for ${uid} (${username}) with code ${normalizedCode}`);

    try {
      if (!username || !normalizedCode) {
        return res.status(400).json({ error: "MISSING_DATA" });
      }

      // 1. Verify Access Code
      const codeRef = dbAdmin.collection('accessCodes').doc(normalizedCode);
      const codeSnap = await codeRef.get();

      if (!codeSnap.exists) {
        return res.status(404).json({ error: "INVALID_ACCESS_CODE" });
      }

      const codeData = codeSnap.data();
      if (!codeData || !codeData.active) {
        return res.status(403).json({ error: "ACCESS_CODE_INACTIVE" });
      }

      const currentUses = codeData.uses !== undefined ? codeData.uses : (codeData.currentUses || 0);
      if (codeData.maxUses > 0 && currentUses >= codeData.maxUses) {
        return res.status(403).json({ error: "ACCESS_CODE_EXHAUSTED" });
      }

      // 2. Check Username Uniqueness
      const usernameRef = dbAdmin.collection('usernames').doc(username.toLowerCase());
      const usernameSnap = await usernameRef.get();
      if (usernameSnap.exists && usernameSnap.data()?.userId !== uid) {
        return res.status(409).json({ error: "USERNAME_TAKEN" });
      }

      // 3. Atomic Update: Create User + Update Code + Set Username
      const batch = dbAdmin.batch();

      const userRef = dbAdmin.collection('users').doc(uid);
      const userSnap = await userRef.get();

      const userData = {
        id: uid,
        name: username,
        email: email,
        accessStatus: 'approved', // AUTOMATIC PROMOTION ON VALID CODE
        betaAccessCodeUsed: normalizedCode,
        updatedAt: FieldValue.serverTimestamp()
      };

      if (!userSnap.exists) {
        // Full profile for new users
        batch.set(userRef, {
          ...userData,
          points: 0,
          soloTripsCount: 0,
          boldTripsCount: 0,
          crewTripsCount: 0,
          rerollsAvailable: 3,
          onboardingCompleted: false,
          fieldClassificationComplete: false,
          createdAt: FieldValue.serverTimestamp(),
          avatar: {
            id: 'base-shutter',
            title: 'Base Shutter',
            category: 'chassis'
          }
        });
      } else {
        // Just update essentials for existing users (re-registration/recovery)
        batch.update(userRef, userData);
      }

      // Reserve username
      batch.set(usernameRef, { 
        userId: uid, 
        createdAt: FieldValue.serverTimestamp() 
      });

      // Increment code usage
      if (codeData.uses !== undefined) {
        batch.update(codeRef, { 
          uses: FieldValue.increment(1),
          lastRegisteredUser: uid,
          lastRegisteredAt: FieldValue.serverTimestamp()
        });
      } else {
        batch.update(codeRef, { 
          currentUses: FieldValue.increment(1),
          lastRegisteredUser: uid,
          lastRegisteredAt: FieldValue.serverTimestamp()
        });
      }

      await batch.commit();

      console.log(`[BUREAU_REG] Success: User ${uid} approved and registered.`);
      res.json({ success: true, status: 'approved' });

    } catch (error: any) {
      console.error('[BUREAU_REG] Critical Fail:', error);
      res.status(500).json({ error: "REGISTRATION_UPLINK_FAILURE" });
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
    const distPath = path.join(rootPath, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Verification log for access codes - only if dbAdmin ready
  if (dbAdmin) {
    console.log(`[BUREAU_INIT] Admin SDK ready for background tasks.`);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[BUREAU_SERVER] Running on http://localhost:${PORT}`);
    console.log(`[BUREAU_SERVER] Mode: ${process.env.NODE_ENV || 'development'}`);
  });
}

startServer();
