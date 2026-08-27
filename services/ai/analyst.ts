export class AnalystProviderUnavailableError extends Error {
  constructor() {
    super("The AI analyst provider is not configured.");
    this.name = "AnalystProviderUnavailableError";
  }
}

export async function askGroundedAnalyst(input: { question: string; context: Record<string, unknown> }): Promise<string> {
  const apiKey = process.env.AI_API_KEY;
  const configuredBase = process.env.AI_API_BASE;
  if (!apiKey || !configuredBase) throw new AnalystProviderUnavailableError();
  const base = configuredBase.replace(/\/$/, "");
  const endpoint = base.endsWith("/v1") ? `${base}/chat/completions` : `${base}/v1/chat/completions`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.AI_MODEL ?? "gpt-5-mini",
      messages: [
        { role: "system", content: "You are a cautious Moroccan football analyst. Answer only from the supplied canonical context. If the context does not contain the answer, say that the data is unavailable. Distinguish observed facts from interpretation, never invent live scores or player facts, and mention the relevant team or player names." },
        { role: "user", content: JSON.stringify({ question: input.question, canonicalContext: input.context }) },
      ],
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`Analyst provider returned HTTP ${response.status}.`);
  const body = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  const content = body.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("Analyst provider returned no answer.");
  return content;
}
