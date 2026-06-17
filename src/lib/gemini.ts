import "server-only";

const DEFAULT_MODEL = "gemini-3.5-flash";
const BUILT_IN_FALLBACK_MODELS = ["gemini-3.1-flash-lite", "gemini-2.5-flash-lite"];
const MAX_ATTEMPTS_PER_MODEL = 3;
const MAX_RETRY_DELAY_MS = 10_000;
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

type GeminiErrorBody = {
  error?: {
    code?: number;
    message?: string;
    status?: string;
    details?: Array<{
      "@type"?: string;
      retryDelay?: string;
      quotaMetric?: string;
    }>;
  };
};

type GeminiIssue = {
  model: string;
  status?: number;
  providerStatus?: string;
  message?: string;
};

function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function splitModels(value?: string) {
  return value?.split(",").map((item) => item.trim()).filter(Boolean) ?? [];
}

function configuredModels() {
  return unique([
    ...splitModels(process.env.GEMINI_MODEL || DEFAULT_MODEL),
    ...splitModels(process.env.GEMINI_FALLBACK_MODELS),
    ...BUILT_IN_FALLBACK_MODELS,
  ]);
}

function retryDelay(response: Response, raw: GeminiErrorBody | null, attempt: number) {
  const retryAfter = Number(response.headers.get("retry-after"));
  if (Number.isFinite(retryAfter) && retryAfter > 0) {
    const milliseconds = retryAfter * 1000;
    return milliseconds > MAX_RETRY_DELAY_MS ? null : milliseconds;
  }

  const retryDelayDetail = raw?.error?.details?.find((detail) => detail.retryDelay)?.retryDelay;
  const retryDelaySeconds = retryDelayDetail ? Number(retryDelayDetail.replace(/s$/, "")) : NaN;
  if (Number.isFinite(retryDelaySeconds) && retryDelaySeconds > 0) {
    const milliseconds = retryDelaySeconds * 1000;
    return milliseconds > MAX_RETRY_DELAY_MS ? null : milliseconds;
  }

  return Math.min(900 * 2 ** attempt + Math.floor(Math.random() * 400), MAX_RETRY_DELAY_MS);
}

function temporaryErrorMessage(issues: GeminiIssue[]) {
  const models = unique(issues.map((issue) => issue.model)).join(", ");
  const reachedQuota = issues.some((issue) => issue.status === 429 || issue.providerStatus === "RESOURCE_EXHAUSTED");
  const unavailable = issues.some((issue) => issue.status === 503 || issue.providerStatus === "UNAVAILABLE");

  if (reachedQuota) {
    return `A IA atingiu o limite de solicitações nos modelos configurados (${models}). Nada foi perdido; tente novamente mais tarde ou aumente a cota/billing no AI Studio.`;
  }

  if (unavailable) {
    return `A IA está com alta demanda nos modelos configurados (${models}). Nada foi perdido; aguarde alguns minutos e tente novamente.`;
  }

  return `Não foi possível concluir a chamada à IA nos modelos configurados (${models}). Nada foi perdido; tente novamente.`;
}

function logGeminiIssue(issue: GeminiIssue) {
  console.warn("Gemini request failed", {
    model: issue.model,
    status: issue.status,
    providerStatus: issue.providerStatus,
    message: issue.message,
  });
}

export async function generateJson<T>(prompt: string): Promise<{ data: T; model: string; usage: Record<string, unknown> }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Configure GEMINI_API_KEY no servidor.");

  const issues: GeminiIssue[] = [];

  for (const model of configuredModels()) {
    for (let attempt = 0; attempt < MAX_ATTEMPTS_PER_MODEL; attempt += 1) {
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
      } catch (error) {
        const issue = { model, message: error instanceof Error ? error.message : "Falha de conexão." };
        issues.push(issue);
        logGeminiIssue(issue);
        if (attempt < MAX_ATTEMPTS_PER_MODEL - 1) {
          await wait(Math.min(900 * 2 ** attempt, MAX_RETRY_DELAY_MS));
          continue;
        }
        break;
      }

      const raw = await response.json().catch(() => null) as GeminiErrorBody | null;

      if (!response.ok) {
        const issue = {
          model,
          status: response.status,
          providerStatus: raw?.error?.status,
          message: raw?.error?.message,
        };
        issues.push(issue);
        logGeminiIssue(issue);

        const retryable = RETRYABLE_STATUS.has(response.status);
        const delay = retryable ? retryDelay(response, raw, attempt) : null;
        if (retryable && delay !== null && attempt < MAX_ATTEMPTS_PER_MODEL - 1) {
          await wait(delay);
          continue;
        }
        if (retryable) break;

        throw new Error(raw?.error?.message || `Falha ao chamar a IA com ${model}.`);
      }

      const text = (raw as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
        usageMetadata?: Record<string, unknown>;
      })?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) throw new Error(`A IA não retornou conteúdo usando ${model}.`);

      try {
        return {
          data: JSON.parse(text) as T,
          model,
          usage: (raw as { usageMetadata?: Record<string, unknown> })?.usageMetadata ?? {},
        };
      } catch {
        throw new Error(`A IA retornou uma resposta inválida usando ${model}. Tente gerar novamente.`);
      }
    }
  }

  throw new Error(temporaryErrorMessage(issues));
}
