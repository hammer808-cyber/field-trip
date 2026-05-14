import { AIAnalysis } from "../types/proof";

export async function analyzeSubmissionImage(
  base64Image: string,
  challengeTitle: string,
  instructions: string,
  requiredSubjects: string[] = []
): Promise<AIAnalysis> {
  try {
    const response = await fetch('/api/analyze-proof', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        base64Image,
        challengeTitle,
        instructions,
        requiredSubjects
      }),
    });

    if (!response.ok) {
      throw new Error(`BUREAU_API_ERROR: ${response.status}`);
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
      reason: "The Bureau's field uplink is experiencing high latency or failure.",
      suggested_lore_tags: ["Desync_Ghost"]
    };
  }
}
