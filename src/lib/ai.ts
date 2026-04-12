/**
 * CASHAM AI Advisor - Gemini API Handler
 * Connects the CASHAM Elite Financial Protocol to the Google Generative AI ecosystem.
 */

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_MODEL = "gemini-1.5-flash-latest"; // Using -latest to avoid legacy versioning issues

export interface ChatMessage {
  role: "user" | "model" | "system";
  content: string;
}

export const isAIEnabled = !!GEMINI_API_KEY;

/**
 * Sends a message to Gemini with optional history.
 */
export async function askGemini(message: string, history: ChatMessage[] = [], retryModel?: string): Promise<string> {
  if (!isAIEnabled) {
    throw new Error("Gemini API Key is missing. Please add VITE_GEMINI_API_KEY to your .env.local file.");
  }

  const currentModel = retryModel || GEMINI_MODEL;
  const baseUrl = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${GEMINI_API_KEY}`;

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
  
  const body: { 
    contents: { role: string; parts: { text: string }[] }[]; 
    system_instruction?: { parts: { text: string }[] } 
  } = { contents };
  if (systemPrompt) {
    body.system_instruction = {
      parts: [{ text: systemPrompt }]
    };
  }

  try {
    const response = await fetch(baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json();
      const errorMessage = errorData.error?.message || "Gemini API request failed.";
      
      // Fallback logic for legacy model errors (404 Not Found)
      if (response.status === 404 && !retryModel) {
        console.warn(`Model ${currentModel} not found. Attempting fallback to gemini-1.5-flash-8b...`);
        return askGemini(message, history, "gemini-1.5-flash-8b");
      }
      
      throw new Error(errorMessage);
    }

    const data = await response.json();
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!resultText) throw new Error("Empty response from AI.");
    return resultText;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Gemini Error:", errorMessage);
    throw error;
  }
}
