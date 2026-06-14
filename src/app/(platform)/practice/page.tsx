import { CheckCircle2, CircleX, Dumbbell, History, Sparkles, Target, TrendingUp, Trophy } from "lucide-react";
import { AsyncActionButton } from "@/components/async-action-button";
import { ArenaWorkspace } from "@/components/arena-workspace";
import { generateArenaChallenge } from "@/app/(platform)/practice/actions";
import { arenaModes, type ArenaAttempt, type ArenaChallenge } from "@/lib/arena";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function PracticePage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [{ data: challenges, count }, { count: completedCount }] = await Promise.all([
    supabase.from("arena_challenges").select("*", { count: "exact" }).eq("user_id", user!.id).order("created_at", { ascending: false }).limit(8),
    supabase.from("arena_challenges").select("*", { count: "exact", head: true }).eq("user_id", user!.id).eq("status", "completed"),
  ]);
  const challenge = challenges?.[0] as ArenaChallenge | undefined;
  const { data: latestAttemptRow } = challenge
    ? await supabase.from("arena_attempts").select("*").eq("challenge_id", challenge.id).eq("user_id", user!.id).order("created_at", { ascending: false }).limit(1).maybeSingle()
    : { data: null };
  const latestAttempt = latestAttemptRow as ArenaAttempt | null;
  const files = challenge?.draft_files?.length ? challenge.draft_files : challenge?.starter_files;

  return (
    <main className="workspace-page arena-page">
      <header className="workspace-header">
        <div><span className="eyebrow"><span /> ARENA INFINITA</span><h1>Um desafio novo. Sempre.</h1><p>Escolha o tipo de treino, resolva um problema inédito e use a avaliação para decidir o próximo passo.</p></div>
        <div className="workspace-stat panel"><Dumbbell size={18} /><span><strong>{completedCount ?? 0}</strong><small>desafios vencidos</small></span></div>
      </header>

      <section className="arena-modes">
        {arenaModes.map((mode) => <article className={`panel arena-mode-card ${challenge?.mode === mode.key ? "arena-mode-active" : ""}`} key={mode.key}>
          <Sparkles size={18} /><h2>{mode.title}</h2><p>{mode.description}</p>
          <AsyncActionButton action={generateArenaChallenge.bind(null, mode.key)} label="Gerar desafio" pendingLabel="Criando desafio..." className="button button-secondary" />
        </article>)}
      </section>

      {!challenge ? <div className="empty-state panel arena-empty"><Target size={24} /><h3>A Arena está pronta</h3><p>Escolha um modo acima para gerar seu primeiro desafio independente.</p></div> : <>
        <section className={`arena-challenge panel ${challenge.status === "completed" ? "arena-challenge-completed" : ""}`}>
          <header><div><span className="eyebrow">{challenge.mode} · {challenge.status === "completed" ? "CONCLUÍDO" : "EM JOGO"}</span><h2>{challenge.title}</h2><p>{challenge.summary}</p></div>{challenge.best_score !== null && <strong className="arena-best-score">{challenge.best_score}</strong>}</header>
          <div className="arena-brief"><span className="recommendation-icon"><Target size={20} /></span><div><span className="eyebrow">DESAFIO</span><p>{challenge.brief}</p></div></div>
          {files && <ArenaWorkspace challengeId={challenge.id} initialFiles={files} />}
          <div className="arena-criteria"><span className="eyebrow">CONDIÇÕES DE VITÓRIA</span><ul>{challenge.acceptance_criteria.map((criterion) => <li key={criterion}><CheckCircle2 size={14} /> {criterion}</li>)}</ul></div>
        </section>

        {latestAttempt && <section className={`evaluation-report panel ${latestAttempt.passed ? "evaluation-passed" : "evaluation-retry"}`}>
          <header className="evaluation-report-header">
            <div><span className="eyebrow">ÚLTIMA AVALIAÇÃO</span><h2>{latestAttempt.passed ? "Desafio vencido" : "Continue tentando"}</h2><p>{latestAttempt.feedback.summary}</p></div>
            <div className="evaluation-score"><span>NOTA</span><strong>{Number(latestAttempt.score).toFixed(1)}</strong><small>/ 10</small></div>
          </header>
          <div className="evaluation-columns">
            <article><h3><CheckCircle2 size={17} /> Pontos fortes</h3><ul>{latestAttempt.feedback.strengths?.map((item) => <li key={item}>{item}</li>)}</ul></article>
            <article><h3><TrendingUp size={17} /> Próximas melhorias</h3><ul>{latestAttempt.feedback.improvements?.map((item) => <li key={item}>{item}</li>)}</ul></article>
          </div>
          <div className="evaluation-criteria"><h3>Critérios avaliados</h3>{latestAttempt.feedback.criteria?.map((item) => <article className={item.met ? "criterion-met" : "criterion-missed"} key={item.criterion}>{item.met ? <CheckCircle2 size={16} /> : <CircleX size={16} />}<div><strong>{item.criterion}</strong><p>{item.feedback}</p></div></article>)}</div>
        </section>}
      </>}

      {challenges && challenges.length > 1 && <section className="arena-history">
        <header><div><span className="eyebrow">HISTÓRICO</span><h2>Desafios anteriores</h2></div><span><History size={14} /> {count ?? 0} gerados</span></header>
        <div>{challenges.slice(1).map((item) => <article className="panel" key={item.id}><span>{item.status === "completed" ? <Trophy size={15} /> : <Dumbbell size={15} />}</span><div><strong>{item.title}</strong><small>{item.mode} · {item.best_score !== null ? `nota ${item.best_score}` : "sem avaliação"}</small></div></article>)}</div>
      </section>}
    </main>
  );
}

