import { z } from "zod";
import { generateStructuredJSON } from "./gemini";

const ClassificationSchema = z.object({
  sentiment: z.enum(["POS", "NEU", "NEG"]),
  sentimentScore: z.number().min(-1).max(1),
  themes: z.array(z.string()),
  featureArea: z.string(),
});

export type ClassificationResult = z.infer<typeof ClassificationSchema>;

const SYSTEM_PROMPT = `You are a customer feedback classifier. Analyze customer feedback and return ONLY a JSON object (no markdown, no explanation) with these exact fields:
- sentiment: "POS", "NEU", or "NEG"
- sentimentScore: number from -1 (very negative) to 1 (very positive)
- themes: array of theme strings (2-4 themes max, use existing ones if appropriate, or create short descriptive ones)
- featureArea: short label for the product area (e.g., "onboarding", "billing", "performance", "ui", "support", "integrations", "mobile", "search", "notifications", "security")

Return ONLY the JSON, no other text.`;

export async function classifyFeedback(
  content: string,
  existingThemes: string[]
): Promise<ClassificationResult> {
  const themesContext =
    existingThemes.length > 0
      ? `\n\nExisting themes to reuse if applicable: ${existingThemes.join(", ")}`
      : "";

  const userMessage = `Classify this customer feedback:
"${content}"${themesContext}`;

  async function attempt(): Promise<ClassificationResult> {
    return await generateStructuredJSON<ClassificationResult>(
      SYSTEM_PROMPT,
      userMessage,
      { temperature: 0.2, maxTokens: 512 }
    );
  }

  try {
    return await attempt();
  } catch {
    // retry once
    try {
      return await attempt();
    } catch {
      // fallback neutral classification
      return {
        sentiment: "NEU",
        sentimentScore: 0,
        themes: ["general"],
        featureArea: "general",
      };
    }
  }
}
