import "server-only";

const MAX_ATTEMPTS = 3;
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

type GeminiErrorBody = {
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
};

function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function retryDelay(response: Response, attempt: number) {
  const retryAfter = Number(response.headers.get("retry-after"));
  if (Number.isFinite(retryAfter) && retryAfter > 0) {
    return Math.min(retryAfter * 1000, 5000);
  }
  return 700 * 2 ** attempt + Math.floor(Math.random() * 300);
}

function temporaryErrorMessage(status?: number) {
  if (status === 429) {
    return "A IA atingiu o limite temporário de solicitações. Nada foi perdido; aguarde um instante e tente novamente.";
  }
  return "A IA está com alta demanda no momento. Nada foi perdido; aguarde um instante e tente novamente.";
}

export async function generateJson<T>(prompt: string): Promise<{ data: T; model: string; usage: Record<string, unknown> }> {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || "gemini-3.5-flash";
  if (!apiKey) throw new Error("Configure GEMINI_API_KEY no servidor.");

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    let response: Response;

    try {
      response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json", temperature: 0.35 },
        }),
      });
    } catch {
      if (attempt < MAX_ATTEMPTS - 1) {
        await wait(700 * 2 ** attempt);
        continue;
      }
      throw new Error("Não foi possível conectar à IA. Nada foi perdido; verifique sua conexão e tente novamente.");
    }

    const raw = await response.json().catch(() => null) as GeminiErrorBody | null;

    if (!response.ok) {
      const retryable = RETRYABLE_STATUS.has(response.status);
      if (retryable && attempt < MAX_ATTEMPTS - 1) {
        await wait(retryDelay(response, attempt));
        continue;
      }
      if (retryable) throw new Error(temporaryErrorMessage(response.status));
      throw new Error(raw?.error?.message || "Falha ao chamar a IA.");
    }

    const text = (raw as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      usageMetadata?: Record<string, unknown>;
    })?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) throw new Error("A IA não retornou conteúdo.");

    try {
      return {
        data: JSON.parse(text) as T,
        model,
        usage: (raw as { usageMetadata?: Record<string, unknown> })?.usageMetadata ?? {},
      };
    } catch {
      throw new Error("A IA retornou uma resposta inválida. Tente gerar novamente.");
    }
  }

  throw new Error(temporaryErrorMessage());
}
