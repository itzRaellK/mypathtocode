"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { generateJson } from "@/lib/gemini";
import { findLesson, type CodeEvaluation, type LessonContent, type TrackOutline } from "@/lib/learning";

export async function generateLesson(trackId: string, lessonKey: string) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Sessão expirada." };
  const { data: track } = await supabase.from("tracks").select("*").eq("id", trackId).eq("user_id", user.id).maybeSingle();
  if (!track) return { ok: false, message: "Trilha não encontrada." };
  const outline = track.outline as TrackOutline;
  const lesson = findLesson(outline, lessonKey);
  if (!lesson) return { ok: false, message: "Aula não encontrada no mapa curricular." };
  const index = outline.modules.flatMap((moduleData) => moduleData.lessons).findIndex((item) => item.key === lessonKey);
  const neighbors = outline.modules.flatMap((moduleData) => moduleData.lessons).slice(Math.max(0, index - 2), index + 3);

  const { data: run } = await supabase.from("ai_runs").insert({
    user_id: user.id,
    operation: "lesson_content",
    target_type: "lesson",
    target_id: track.id,
    target_key: lessonKey,
    status: "processing",
    input: { track: { title: track.title, level: track.level, goal: track.goal }, lesson, neighbors },
  }).select("id").single();

  const prompt = `Crie o conteúdo detalhado de UMA aula prática de programação.
Contexto da trilha: ${JSON.stringify({ title: track.title, topic: track.topic, level: track.level, goal: track.goal, curriculum: track.generation?.curriculum })}
Aula atual: ${JSON.stringify(lesson)}
Aulas próximas para controlar progressão e evitar repetição: ${JSON.stringify(neighbors)}

Respeite rigorosamente o nível da trilha. Se for iniciante, assuma zero conhecimento prévio de programação, C++ e Unreal.
Para níveis intermediário, avançado e especializações, assuma somente os pré-requisitos declarados no contexto da trilha. Reintroduza a dependência necessária antes de aprofundá-la.
Apresente e defina cada termo novo antes de utilizá-lo. Explique a anatomia e a função de cada parte relevante do código.
Não dependa de conceitos que não aparecem na aula atual ou nas aulas anteriores informadas.

Retorne SOMENTE JSON:
{
  "introduction": "visão geral curta",
  "explanation": "explicação direta, correta e suficiente",
  "example": "exemplo de código completo e comentado apenas quando necessário",
  "exercise": {
    "brief": "desafio focado exatamente nesta aula",
    "starterFiles": [{"path":"arquivo.ext","language":"cpp","content":"código inicial"}],
    "acceptanceCriteria": ["critério objetivo"],
    "evaluationFocus": ["aspecto que a IA deve avaliar"]
  }
}
Não use markdown envolvendo o JSON. Não invente APIs. O exercício deve ser exigente, justo e possível com o conteúdo já estudado.`;

  try {
    const generated = await generateJson<LessonContent>(prompt);
    if (!generated.data?.explanation || !generated.data?.exercise?.starterFiles) throw new Error("Conteúdo de aula inválido.");
    const { data: last } = await supabase.from("lesson_contents").select("version").eq("track_id", trackId).eq("lesson_key", lessonKey).order("version", { ascending: false }).limit(1).maybeSingle();
    await supabase.from("lesson_contents").update({ status: "superseded" }).eq("track_id", trackId).eq("lesson_key", lessonKey).eq("status", "active");
    const { error } = await supabase.from("lesson_contents").insert({
      track_id: trackId,
      lesson_key: lessonKey,
      version: (last?.version ?? 0) + 1,
      content: generated.data,
      generation: { model: generated.model, usage: generated.usage },
    });
    if (error) throw new Error(error.message);
    await supabase.from("lesson_states").upsert({
      user_id: user.id,
      track_id: trackId,
      lesson_key: lessonKey,
      status: "in_progress",
      last_opened_at: new Date().toISOString(),
    }, { onConflict: "user_id,track_id,lesson_key" });
    if (run) await supabase.from("ai_runs").update({
      status: "completed",
      model: generated.model,
      output: generated.data,
      usage: generated.usage,
      completed_at: new Date().toISOString(),
    }).eq("id", run.id);
    revalidatePath(`/tracks/${trackId}/lessons/${lessonKey}`);
    return { ok: true, message: "Conteúdo da aula gerado." };
  } catch (error) {
    if (run) await supabase.from("ai_runs").update({
      status: "failed",
      error_message: error instanceof Error ? error.message : "Falha desconhecida.",
      completed_at: new Date().toISOString(),
    }).eq("id", run.id);
    return { ok: false, message: error instanceof Error ? error.message : "Falha ao gerar aula." };
  }
}

export async function saveDraft(trackId: string, lessonKey: string, files: Array<{ path: string; language: string; content: string }>) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Sessão expirada." };
  const { error } = await supabase.from("lesson_states").upsert({
    user_id: user.id,
    track_id: trackId,
    lesson_key: lessonKey,
    status: "in_progress",
    draft_files: files,
    last_opened_at: new Date().toISOString(),
  }, { onConflict: "user_id,track_id,lesson_key" });
  return error ? { ok: false, message: error.message } : { ok: true, message: "Rascunho salvo." };
}

export async function evaluateSolution(trackId: string, lessonKey: string, files: Array<{ path: string; language: string; content: string }>) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Sessao expirada." };
  if (!files.length || files.every((file) => !file.content.trim())) return { ok: false, message: "Escreva uma solucao antes de enviar." };

  const [{ data: track }, { data: contentRow }, { data: currentState }] = await Promise.all([
    supabase.from("tracks").select("*").eq("id", trackId).eq("user_id", user.id).maybeSingle(),
    supabase.from("lesson_contents").select("*").eq("track_id", trackId).eq("lesson_key", lessonKey).eq("status", "active").maybeSingle(),
    supabase.from("lesson_states").select("status,best_score,attempts_count,passed_at").eq("user_id", user.id).eq("track_id", trackId).eq("lesson_key", lessonKey).maybeSingle(),
  ]);
  if (!track || !contentRow) return { ok: false, message: "Aula ou conteudo nao encontrado." };

  const lesson = findLesson(track.outline as TrackOutline, lessonKey);
  if (!lesson) return { ok: false, message: "Aula nao encontrada no mapa curricular." };
  const content = contentRow.content as LessonContent;

  const { data: attempt, error: attemptError } = await supabase.from("attempts").insert({
    user_id: user.id,
    track_id: trackId,
    lesson_key: lessonKey,
    lesson_content_id: contentRow.id,
    files,
    status: "evaluating",
  }).select("id").single();
  if (attemptError || !attempt) return { ok: false, message: attemptError?.message ?? "Falha ao registrar tentativa." };

  const { data: run } = await supabase.from("ai_runs").insert({
    user_id: user.id,
    operation: "code_evaluation",
    target_type: "attempt",
    target_id: attempt.id,
    target_key: lessonKey,
    status: "processing",
    input: { lesson, exercise: content.exercise, files },
  }).select("id").single();

  const prompt = `Avalie com rigor e justica a solucao de um exercicio de programacao.
Trilha: ${JSON.stringify({ title: track.title, topic: track.topic, level: track.level, goal: track.goal })}
Aula: ${JSON.stringify(lesson)}
Exercicio e criterios: ${JSON.stringify(content.exercise)}
Arquivos enviados: ${JSON.stringify(files)}

Retorne SOMENTE JSON:
{
  "score": 0,
  "passed": false,
  "summary": "feedback direto",
  "strengths": ["ponto positivo concreto"],
  "improvements": ["correcao concreta e acionavel"],
  "criteria": [{"criterion":"criterio avaliado","met":false,"feedback":"justificativa"}]
}
A nota deve estar entre 0 e 10. Aprovacao exige nota maior ou igual a 9.
Nao presuma que o codigo compila quando houver erro visivel. Nao exija conceitos ainda nao apresentados.`;

  try {
    const generated = await generateJson<CodeEvaluation>(prompt);
    const score = Math.min(10, Math.max(0, Number(generated.data?.score) || 0));
    const evaluation = { ...generated.data, score, passed: score >= 9 };

    const { error: evaluationError } = await supabase.from("evaluations").insert({
      attempt_id: attempt.id,
      score,
      passed: evaluation.passed,
      feedback: evaluation,
      generation: { model: generated.model, usage: generated.usage },
    });
    if (evaluationError) throw new Error(evaluationError.message);

    await supabase.from("attempts").update({ status: "evaluated" }).eq("id", attempt.id);
    const isPassed = currentState?.status === "passed" || evaluation.passed;
    await supabase.from("lesson_states").upsert({
      user_id: user.id,
      track_id: trackId,
      lesson_key: lessonKey,
      status: isPassed ? "passed" : "in_progress",
      draft_files: files,
      best_score: Math.max(Number(currentState?.best_score) || 0, score),
      attempts_count: (currentState?.attempts_count ?? 0) + 1,
      last_opened_at: new Date().toISOString(),
      passed_at: currentState?.passed_at ?? (evaluation.passed ? new Date().toISOString() : null),
    }, { onConflict: "user_id,track_id,lesson_key" });
    if (run) await supabase.from("ai_runs").update({
      status: "completed",
      model: generated.model,
      output: evaluation,
      usage: generated.usage,
      completed_at: new Date().toISOString(),
    }).eq("id", run.id);

    revalidatePath(`/tracks/${trackId}/lessons/${lessonKey}`);
    revalidatePath(`/tracks/${trackId}`);
    revalidatePath("/dashboard");
    return { ok: true, message: "Avaliação concluída. Confira o relatório abaixo." };
  } catch (error) {
    await supabase.from("attempts").update({ status: "failed" }).eq("id", attempt.id);
    if (run) await supabase.from("ai_runs").update({
      status: "failed",
      error_message: error instanceof Error ? error.message : "Falha desconhecida.",
      completed_at: new Date().toISOString(),
    }).eq("id", run.id);
    return { ok: false, message: error instanceof Error ? error.message : "Falha ao avaliar solucao." };
  }
}
