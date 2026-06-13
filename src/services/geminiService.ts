import { AIAnalysis } from "../types/proof";
import { authenticatedFetch } from "../lib/api";
import { compressImage } from "./storageService";

export async function analyzeSubmissionImage(
  base64Image: string,
  challengeTitle: string,
  instructions: string,
  requiredSubjects: string[] = [],
  proofId?: string,
  missionId?: string,
  deckId?: string
): Promise<AIAnalysis> {
  try {
    // Client-side image size control / compression before sending to backend
    let processedBase64 = base64Image;
    try {
      if (base64Image && base64Image.length > 50000) {
        // Compress to cheap, highly reliable size for visual verification
        const compressed = await compressImage(base64Image, 800, 0.7);
        if (compressed) {
          processedBase64 = compressed;
        }
      }
    } catch (compressErr) {
      console.warn("[geminiService] Pre-transmission compression error:", compressErr);
    }

    const response = await authenticatedFetch('/api/analyze-proof', {
      method: 'POST',
      body: JSON.stringify({
        base64Image: processedBase64,
        challengeTitle,
        instructions,
        requiredSubjects,
        proofId,
        missionId,
        deckId
      }),
    });

    if (!response.ok) {
      let errorMessage = `HQ_API_ERROR: ${response.status}`;
      try {
        const errorData = await response.json();
        if (errorData.reason) {
          errorMessage += ` - ${errorData.reason}`;
        } else if (errorData.error) {
          errorMessage += ` - ${errorData.error}`;
        }
      } catch (e) {
        // Fallback if not JSON
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return {
      status: data.status || "detected",
      requiredSubject: data.requiredSubject || requiredSubjects[0] || challengeTitle,
      detectedSubject: data.detectedSubject !== undefined ? data.detectedSubject : true,
      confidence: data.confidence !== undefined ? data.confidence : 0.9,
      detectedItems: data.detectedItems || [],
      missingItems: data.missingItems || [],
      displayTitle: data.displayTitle || "Subject Acquired",
      displayDetail: data.displayDetail || "Matched visual catalog evidence.",
      missionMatchScore: data.missionMatchScore !== undefined ? data.missionMatchScore : 90,
      analyzedAt: data.analyzedAt || new Date().toISOString(),
      modelUsed: data.modelUsed || "gemini-1.5-flash",
      
      // Legacy fields mapping
      labels: data.detectedItems || [],
      flagged: false,
      visible_evidence: data.detectedItems || [],
      reason: data.displayDetail || "Matched visual catalog evidence.",
      suggested_lore_tags: ["AI_Uplink", "Visual_Scan"]
    };
  } catch (error) {
    console.error("Gemini Analysis Fetch Error:", error);
    const fallbackSubject = requiredSubjects[0] || challengeTitle || "Target Match";
    return {
      status: "error",
      requiredSubject: fallbackSubject,
      detectedSubject: false,
      confidence: 0,
      detectedItems: [],
      missingItems: ["NETWORK_COMM_FAILURE"],
      displayTitle: "Scan Failed",
      displayDetail: "The Fieldtrip field uplink is experiencing high latency or failure.",
      missionMatchScore: 0,
      analyzedAt: new Date().toISOString(),
      modelUsed: "error_fallback",
      
      // Legacy fields mapping
      labels: [],
      flagged: false,
      visible_evidence: [],
      reason: "The Fieldtrip field uplink is experiencing high latency or failure.",
      suggested_lore_tags: ["Desync_Ghost"]
    };
  }
}
