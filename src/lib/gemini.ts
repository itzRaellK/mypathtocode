import "server-only";

export async function generateJson<T>(prompt: string): Promise<{ data: T; model: string; usage: Record<string, unknown> }> {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || "gemini-3.5-flash";
  if (!apiKey) throw new Error("Configure GEMINI_API_KEY no servidor.");

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.35 },
    }),
  });
  const raw = await response.json();
  if (!response.ok) throw new Error(raw?.error?.message || "Falha ao chamar a IA.");
  const text = raw?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("A IA não retornou conteúdo.");
  return { data: JSON.parse(text) as T, model, usage: raw?.usageMetadata ?? {} };
}
