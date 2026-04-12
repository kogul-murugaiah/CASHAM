/**
 * CASHAM AI Advisor - Gemini API Handler
 * Connects the CASHAM Elite Financial Protocol to the Google Generative AI ecosystem.
 */

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_MODEL = "gemini-1.5-flash";

export interface ChatMessage {
  role: "user" | "model" | "system";
  content: string;
}

export const isAIEnabled = !!GEMINI_API_KEY;

/**
 * Sends a message to Gemini with optional history.
 */
export async function askGemini(message: string, history: ChatMessage[] = []): Promise<string> {
  if (!isAIEnabled) {
    throw new Error("Gemini API Key is missing. Please add VITE_GEMINI_API_KEY to your .env.local file.");
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  // Format history for Gemini API
  const contents = [
    ...history.filter(m => m.role !== 'system').map(m => ({
      role: m.role === 'model' ? 'model' : 'user',
      parts: [{ text: m.content }]
    })),
    {
        role: "user",
        parts: [{ text: message }]
    }
  ];

  // Extract system prompt
  const systemPrompt = history.find(m => m.role === 'system')?.content;
  
  const body: any = { contents };
  if (systemPrompt) {
    body.system_instruction = {
      parts: [{ text: systemPrompt }]
    };
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || "Gemini API request failed.");
    }

    const data = await response.json();
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!resultText) throw new Error("Empty response from AI.");
    return resultText;
  } catch (error: any) {
    console.error("Gemini Error:", error);
    throw error;
  }
}
