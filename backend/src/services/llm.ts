import Groq from "groq-sdk";

let client: Groq;

function getClient(): Groq {
  if (client) return client;
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY is not configured");
  client = new Groq({ apiKey });
  return client;
}

/**
 * Send a chat completion request to Groq and return the full text response.
 * Uses the model specified in GROQ_MODEL env var (default: llama-3.3-70b-versatile).
 */
export async function chatCompletion(
  systemPrompt: string,
  userPrompt: string,
  options?: { temperature?: number; maxTokens?: number }
): Promise<string> {
  const groq = getClient();
  const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

  const response = await groq.chat.completions.create({
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: options?.temperature ?? 0.7,
    max_tokens: options?.maxTokens ?? 2048,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("LLM returned empty response");
  return content;
}
