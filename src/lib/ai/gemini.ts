import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";

// Get the API key from environment variables
const apiKey = process.env.GEMINI_API_KEY;
const modelName = process.env.GEMINI_MODEL || "gemini-2.0-flash-lite";

if (!apiKey) {
  throw new Error("GEMINI_API_KEY is required in .env.local");
}

// Initialize the Gemini client
const genAI = new GoogleGenerativeAI(apiKey);
let model: GenerativeModel | null = null;

function getModel(): GenerativeModel {
  if (!model) {
    model = genAI.getGenerativeModel({ model: modelName });
  }
  return model;
}

/**
 * Sends a prompt to Gemini and returns the text response
 */
export async function generateText(prompt: string, options?: {
  temperature?: number;
  maxTokens?: number;
}): Promise<string> {
  try {
    const model = getModel();
    
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: options?.temperature ?? 0.3,
        maxOutputTokens: options?.maxTokens ?? 1000,
      },
    });

    const response = result.response;
    return response.text();
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("Failed to generate text from Gemini");
  }
}

/**
 * Sends a system prompt + user prompt and returns structured JSON
 * Forces Gemini to return valid JSON only
 */
export async function generateStructuredJSON<T>(
  systemPrompt: string,
  userPrompt: string,
  options?: {
    temperature?: number;
    maxTokens?: number;
  }
): Promise<T> {
  try {
    const model = getModel();
    
    // Combine system and user prompts
    const fullPrompt = `${systemPrompt}\n\n${userPrompt}\n\nReturn ONLY valid JSON. No markdown, no explanations.`;
    
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
      generationConfig: {
        temperature: options?.temperature ?? 0.2,
        maxOutputTokens: options?.maxTokens ?? 1024,
      },
    });

    const response = result.response;
    const text = response.text();
    
    // Clean the response (remove markdown code fences if any)
    let cleanText = text.trim();
    if (cleanText.startsWith("```json")) {
      cleanText = cleanText.replace(/^```json\n?/, "").replace(/\n?```$/, "");
    } else if (cleanText.startsWith("```")) {
      cleanText = cleanText.replace(/^```\n?/, "").replace(/\n?```$/, "");
    }
    
    return JSON.parse(cleanText) as T;
  } catch (error) {
    console.error("Gemini Structured JSON Error:", error);
    throw new Error("Failed to generate structured JSON from Gemini");
  }
}