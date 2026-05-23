import { AIAnalysis } from "../types/proof";
import { authenticatedFetch } from "../lib/api";

export async function analyzeSubmissionImage(
  base64Image: string,
  challengeTitle: string,
  instructions: string,
  requiredSubjects: string[] = []
): Promise<AIAnalysis> {
  try {
    const response = await authenticatedFetch('/api/analyze-proof', {
      method: 'POST',
      body: JSON.stringify({
        base64Image,
        challengeTitle,
        instructions,
        requiredSubjects
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

    return await response.json();
  } catch (error) {
    console.error("Gemini Analysis Fetch Error:", error);
    return {
      labels: [],
      flagged: false,
      contains_required_subject: false,
      visible_evidence: [],
      missing_evidence: ["NETWORK_COMM_FAILURE"],
      confidence: 0,
      reason: "The Fieldtrip field uplink is experiencing high latency or failure.",
      suggested_lore_tags: ["Desync_Ghost"]
    };
  }
}
