import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for parsing JSON with large limits for images
  app.use(express.json({ limit: '10mb' }));

  // Initialize Gemini
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

  // API Routes
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

      const response = await ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: [
          {
            parts: [
              { text: prompt },
              { inlineData: { data: base64Data, mimeType: "image/jpeg" } }
            ]
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              contains_required_subject: { type: Type.BOOLEAN },
              visible_evidence: { type: Type.ARRAY, items: { type: Type.STRING } },
              missing_evidence: { type: Type.ARRAY, items: { type: Type.STRING } },
              confidence: { type: Type.NUMBER },
              reason: { type: Type.STRING },
              suggested_lore_tags: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["contains_required_subject", "visible_evidence", "missing_evidence", "confidence", "reason", "suggested_lore_tags"]
          }
        }
      });

      res.json(JSON.parse(response.text || '{}'));

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
