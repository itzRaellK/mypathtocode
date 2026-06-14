"use server";

import { revalidatePath } from "next/cache";
import { generateJson } from "@/lib/gemini";
import { arenaModes, type ArenaChallengeContent, type ArenaFile, type ArenaMode } from "@/lib/arena";
import type { CodeEvaluation } from "@/lib/learning";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const validModes = new Set(arenaModes.map((mode) => mode.key));

export async function generateArenaToolbox(challengeId: string) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Sessão expirada." };
  const { data: challenge } = await supabase.from("arena_challenges").select("*").eq("id", challengeId).eq("user_id", user.id).maybeSingle();
  if (!challenge) return { ok: false, message: "Desafio não encontrado." };

  const prompt = `Crie uma caixa de ferramentas para ajudar um estudante a resolver este desafio de programação sem entregar a solução.
Desafio: ${JSON.stringify({
    title: challenge.title,
    summary: challenge.summary,
    brief: challenge.brief,
    starterFiles: challenge.starter_files,
    acceptanceCriteria: challenge.acceptance_criteria,
  })}

Liste todas as funções, tipos, macros, operadores e conceitos necessários ou muito úteis.
Explique de forma simples o propósito e a forma de uso de cada recurso.
Não entregue a implementação completa nem a ordem exata da solução.

Retorne SOMENTE JSON:
{
  "toolbox": [
    {
      "name": "nome ou assinatura do recurso",
      "purpose": "para que ele serve neste contexto",
      "usage": "como utilizar sem entregar a resposta",
      "examples": ["exemplo curto e isolado", "segundo exemplo curto opcional"]
    }
  ]
}`;

  try {
    const generated = await generateJson<{ toolbox: ArenaChallengeContent["toolbox"] }>(prompt);
    if (!generated.data?.toolbox?.length) throw new Error("A IA não retornou recursos úteis.");
    const { error } = await supabase.from("arena_challenges").update({ toolbox: generated.data.toolbox }).eq("id", challengeId).eq("user_id", user.id);
    if (error) throw new Error(error.message);
    revalidatePath("/practice");
    return { ok: true, message: "Caixa de ferramentas gerada." };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Falha ao gerar caixa de ferramentas." };
  }
}

export async function generateArenaChallenge(mode: ArenaMode) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Sessão expirada." };
  if (!validModes.has(mode)) return { ok: false, message: "Modo de treino inválido." };

  const [{ data: recent }, { data: recentArenaAttempts }, { data: recentLessonEvaluations }, { data: tracks }] = await Promise.all([
    supabase.from("arena_challenges").select("title,mode,best_score,status").eq("user_id", user.id).order("created_at", { ascending: false }).limit(12),
    supabase.from("arena_attempts").select("score,feedback,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(8),
    supabase.from("evaluations").select("score,feedback,created_at,attempts!inner(user_id)").eq("attempts.user_id", user.id).order("created_at", { ascending: false }).limit(8),
    supabase.from("tracks").select("title,topic,level,goal").eq("user_id", user.id).eq("status", "active").limit(8),
  ]);
  const modeData = arenaModes.find((item) => item.key === mode)!;
  const { data: run } = await supabase.from("ai_runs").insert({
    user_id: user.id,
    operation: "arena_challenge",
    target_type: "arena_challenge",
    status: "processing",
    input: { mode, recent, recentArenaAttempts, recentLessonEvaluations, tracks },
  }).select("id").single();

  const prompt = `Crie UM desafio inédito e autocontido de programação para uma arena de prática infinita.
Modo escolhido: ${JSON.stringify(modeData)}
Trilhas atuais do estudante: ${JSON.stringify(tracks ?? [])}
Desafios recentes, que não devem ser repetidos: ${JSON.stringify(recent ?? [])}
Avaliações recentes da Arena: ${JSON.stringify(recentArenaAttempts ?? [])}
Avaliações recentes das aulas: ${JSON.stringify(recentLessonEvaluations ?? [])}

O desafio não pertence a uma aula. Ele precisa fornecer contexto suficiente para ser resolvido sozinho.
Use os erros e melhorias apontados nas avaliações para treinar fraquezas recorrentes em um contexto diferente, sem repetir o mesmo enunciado.
No modo adaptativo, priorize explicitamente os erros recentes que ainda não foram dominados.
No modo caça ao bug, forneça código inicial com um problema concreto a corrigir.
Não invente APIs. Para Unreal Engine, use APIs reais e informe claramente qualquer contexto necessário.
Inclua em toolbox todas as funções, tipos, macros, operadores e conceitos necessários para resolver o desafio.
Cada item da toolbox deve explicar finalidade e forma de uso e trazer um ou dois exemplos curtos e isolados.
Os exemplos devem demonstrar apenas o recurso individual, sem entregar a implementação completa nem a ordem exata da solução.

Retorne SOMENTE JSON:
{
  "title": "título curto",
  "summary": "o que será treinado",
  "brief": "enunciado completo e inequívoco",
  "starterFiles": [{"path":"arquivo.ext","language":"cpp","content":"código inicial"}],
  "toolbox": [{"name":"FMath::Sin(float)","purpose":"calcular uma oscilação suave","usage":"recebe um valor em radianos e retorna entre -1 e 1","examples":["const float Wave = FMath::Sin(Time);"]}],
  "acceptanceCriteria": ["critério objetivo"],
  "evaluationFocus": ["aspecto que será avaliado"]
}`;

  try {
    const generated = await generateJson<ArenaChallengeContent>(prompt);
    if (!generated.data?.title || !generated.data?.brief || !generated.data?.starterFiles?.length) throw new Error("A IA retornou um desafio inválido.");
    await supabase.from("arena_challenges").update({ status: "archived" }).eq("user_id", user.id).eq("status", "active");
    const { data: challenge, error } = await supabase.from("arena_challenges").insert({
      user_id: user.id,
      mode,
      difficulty: "adaptive",
      title: generated.data.title,
      summary: generated.data.summary,
      brief: generated.data.brief,
      starter_files: generated.data.starterFiles,
      toolbox: generated.data.toolbox ?? [],
      acceptance_criteria: generated.data.acceptanceCriteria,
      evaluation_focus: generated.data.evaluationFocus,
      draft_files: generated.data.starterFiles,
      generation: { model: generated.model, usage: generated.usage },
    }).select("id").single();
    if (error || !challenge) throw new Error(error?.message ?? "Falha ao salvar desafio.");
    if (run) await supabase.from("ai_runs").update({ status: "completed", target_id: challenge.id, model: generated.model, output: generated.data, usage: generated.usage, completed_at: new Date().toISOString() }).eq("id", run.id);
    revalidatePath("/practice");
    return { ok: true, message: "Novo desafio gerado." };
  } catch (error) {
    if (run) await supabase.from("ai_runs").update({ status: "failed", error_message: error instanceof Error ? error.message : "Falha desconhecida.", completed_at: new Date().toISOString() }).eq("id", run.id);
    return { ok: false, message: error instanceof Error ? error.message : "Falha ao gerar desafio." };
  }
}

export async function saveArenaDraft(challengeId: string, files: ArenaFile[]) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Sessão expirada." };
  const { error } = await supabase.from("arena_challenges").update({ draft_files: files }).eq("id", challengeId).eq("user_id", user.id);
  return error ? { ok: false, message: error.message } : { ok: true, message: "Rascunho salvo." };
}

export async function evaluateArenaChallenge(challengeId: string, files: ArenaFile[]) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Sessão expirada." };
  if (!files.length || files.every((file) => !file.content.trim())) return { ok: false, message: "Escreva uma solução antes de enviar." };
  const { data: challenge } = await supabase.from("arena_challenges").select("*").eq("id", challengeId).eq("user_id", user.id).maybeSingle();
  if (!challenge) return { ok: false, message: "Desafio não encontrado." };

  const { data: run } = await supabase.from("ai_runs").insert({
    user_id: user.id,
    operation: "arena_evaluation",
    target_type: "arena_challenge",
    target_id: challenge.id,
    status: "processing",
    input: { challenge, files },
  }).select("id").single();

  const prompt = `Avalie com rigor e justiça a solução deste desafio independente de programação.
Desafio: ${JSON.stringify({ title: challenge.title, brief: challenge.brief, acceptanceCriteria: challenge.acceptance_criteria, evaluationFocus: challenge.evaluation_focus })}
Arquivos enviados: ${JSON.stringify(files)}

Retorne SOMENTE JSON:
{
  "score": 0,
  "passed": false,
  "summary": "feedback direto",
  "strengths": ["ponto positivo concreto"],
  "improvements": ["correção concreta e acionável"],
  "criteria": [{"criterion":"critério avaliado","met":false,"feedback":"justificativa"}]
}
A nota deve estar entre 0 e 10. Aprovação exige nota maior ou igual a 9. Não presuma que o código compila quando houver erro visível.`;

  try {
    const generated = await generateJson<CodeEvaluation>(prompt);
    const score = Math.min(10, Math.max(0, Number(generated.data?.score) || 0));
    const evaluation = { ...generated.data, score, passed: score >= 9 };
    const { data: attempt, error } = await supabase.from("arena_attempts").insert({
      user_id: user.id,
      challenge_id: challenge.id,
      files,
      score,
      passed: evaluation.passed,
      feedback: evaluation,
      generation: { model: generated.model, usage: generated.usage },
    }).select("id").single();
    if (error || !attempt) throw new Error(error?.message ?? "Falha ao salvar tentativa.");
    await supabase.from("arena_challenges").update({
      draft_files: files,
      best_score: Math.max(Number(challenge.best_score) || 0, score),
      status: evaluation.passed ? "completed" : challenge.status,
      completed_at: evaluation.passed ? new Date().toISOString() : challenge.completed_at,
    }).eq("id", challenge.id).eq("user_id", user.id);
    if (run) await supabase.from("ai_runs").update({ status: "completed", target_type: "arena_attempt", target_id: attempt.id, model: generated.model, output: evaluation, usage: generated.usage, completed_at: new Date().toISOString() }).eq("id", run.id);
    revalidatePath("/practice");
    return { ok: true, message: "Avaliação concluída." };
  } catch (error) {
    if (run) await supabase.from("ai_runs").update({ status: "failed", error_message: error instanceof Error ? error.message : "Falha desconhecida.", completed_at: new Date().toISOString() }).eq("id", run.id);
    return { ok: false, message: error instanceof Error ? error.message : "Falha ao avaliar desafio." };
  }
}
