/**
 * CASHAM AI Advisor - Gemini API Handler
 * Connects the CASHAM Elite Financial Protocol to the Google Generative AI ecosystem.
 */

// Active model waterfall for 2026 — the entire gemini-1.5 series is retired.
// Primary: gemini-2.5-flash | Fallbacks: gemini-2.0-flash → gemini-2.0-flash-lite
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
];

export interface ChatMessage {
  role: "user" | "model" | "system";
  content: string;
}

export const isAIEnabled = !!GEMINI_API_KEY;

/**
 * Sends a message to Gemini with optional history.
 * Tries each model in GEMINI_MODELS waterfall on 404.
 */
export async function askGemini(
  message: string,
  history: ChatMessage[] = [],
  modelIndex = 0
): Promise<string> {
  if (!isAIEnabled) {
    throw new Error("Gemini API Key is missing. Please add VITE_GEMINI_API_KEY to your .env.local file.");
  }

  const currentModel = GEMINI_MODELS[modelIndex];
  if (!currentModel) {
    throw new Error("All available Gemini models are unavailable. Please check your API key and region.");
  }

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
    system_instruction?: { parts: { text: string }[] };
  } = { contents };

  if (systemPrompt) {
    body.system_instruction = { parts: [{ text: systemPrompt }] };
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

      // Try next model in waterfall on 404
      if (response.status === 404 && modelIndex < GEMINI_MODELS.length - 1) {
        console.warn(`Model "${currentModel}" not found. Trying fallback: ${GEMINI_MODELS[modelIndex + 1]}`);
        return askGemini(message, history, modelIndex + 1);
      }

      throw new Error(errorMessage);
    }

    const data = await response.json();
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!resultText) throw new Error("Empty response from Gemini.");
    return resultText;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Gemini Error [${currentModel}]:`, errorMessage);
    throw error;
  }
}
