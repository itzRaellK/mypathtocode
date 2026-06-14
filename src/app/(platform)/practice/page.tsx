import { CheckCircle2, CircleX, Dumbbell, History, Sparkles, Target, TrendingUp, Trophy, Wrench } from "lucide-react";
import { generateArenaChallenge, generateArenaToolbox } from "@/app/(platform)/practice/actions";
import { ArenaToolReference } from "@/components/arena-tool-reference";
import { ArenaWorkspace } from "@/components/arena-workspace";
import { AsyncActionButton } from "@/components/async-action-button";
import { ArenaChallengeModal } from "@/components/arena-challenge-modal";
import { arenaModes, type ArenaAttempt, type ArenaChallenge } from "@/lib/arena";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function ModePicker({ activeMode }: { activeMode?: string }) {
  return <section className="arena-modes">
    {arenaModes.map((mode) => <article className={`panel arena-mode-card ${activeMode === mode.key ? "arena-mode-active" : ""}`} key={mode.key}>
      <Sparkles size={18} /><h2>{mode.title}</h2><p>{mode.description}</p>
      <AsyncActionButton action={generateArenaChallenge.bind(null, mode.key)} label="Gerar desafio" pendingLabel="Criando desafio..." className="button button-secondary" />
    </article>)}
  </section>;
}

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

  if (!challenge) {
    return <main className="workspace-page arena-page">
      <header className="workspace-header">
        <div><span className="eyebrow"><span /> ARENA INFINITA</span><h1>Um desafio novo. Sempre.</h1><p>Escolha um tipo de treino. A IA criará um problema inédito e autocontido para você resolver.</p></div>
        <div className="workspace-stat panel"><Dumbbell size={18} /><span><strong>{completedCount ?? 0}</strong><small>desafios vencidos</small></span></div>
      </header>
      <ModePicker />
      <div className="empty-state panel arena-empty"><Target size={24} /><h3>A Arena está pronta</h3><p>Escolha um modo acima para gerar seu primeiro desafio independente.</p></div>
    </main>;
  }

  return <main className="workspace-page arena-page arena-active-page">
    <header className="arena-active-header">
      <div><span className="eyebrow">{challenge.mode} · {challenge.status === "completed" ? "CONCLUÍDO" : "EM JOGO"}</span><h1>{challenge.title}</h1><p>{challenge.summary}</p></div>
      <div className="arena-active-actions">
        {challenge.best_score !== null && <div className="arena-compact-score"><span>MELHOR NOTA</span><strong>{challenge.best_score}</strong></div>}
        <ArenaChallengeModal activeMode={challenge.mode} completed={challenge.status === "completed"} />
      </div>
    </header>

    <section className="arena-brief arena-brief-compact panel"><span className="recommendation-icon"><Target size={20} /></span><div><span className="eyebrow">MISSÃO ATUAL</span><p>{challenge.brief}</p></div></section>

    <section className="arena-solve-layout">
      <div className="arena-editor-column">
        {files && <ArenaWorkspace challengeId={challenge.id} initialFiles={files} />}
      </div>
      <aside className="arena-reference-panel panel">
        <section>
          <header><Wrench size={16} /><div><span className="eyebrow">FERRAMENTAS</span><h2>Recursos disponíveis</h2></div></header>
          {challenge.toolbox?.length > 0
            ? <><ArenaToolReference tools={challenge.toolbox} />{challenge.toolbox.some((tool) => !tool.examples?.length) && <div className="arena-add-examples"><AsyncActionButton action={generateArenaToolbox.bind(null, challenge.id)} label="Adicionar exemplos" pendingLabel="Criando exemplos..." icon="refresh" className="text-button" /></div>}</>
            : <div className="arena-reference-empty"><p>Gere referências para este desafio.</p><AsyncActionButton action={generateArenaToolbox.bind(null, challenge.id)} label="Gerar ferramentas" pendingLabel="Analisando..." className="button button-secondary compact-button" /></div>}
        </section>
      </aside>
    </section>

    <section className="arena-criteria-wide panel">
      <header><CheckCircle2 size={17} /><div><span className="eyebrow">CRITÉRIOS</span><h2>Condições de vitória</h2></div></header>
      <ul>{challenge.acceptance_criteria.map((criterion) => <li key={criterion}><CheckCircle2 size={14} /> {criterion}</li>)}</ul>
    </section>

    {latestAttempt && <section className={`arena-evaluation-summary panel ${latestAttempt.passed ? "evaluation-passed" : "evaluation-retry"}`}>
      <header>
        <div><span className="eyebrow">ÚLTIMA AVALIAÇÃO</span><h2>{latestAttempt.passed ? "Desafio vencido" : "Continue tentando"}</h2><p>{latestAttempt.feedback.summary}</p></div>
        <div className="evaluation-score"><span>NOTA</span><strong>{Number(latestAttempt.score).toFixed(1)}</strong><small>/ 10</small></div>
      </header>
      <div className="arena-evaluation-next">
        <article><h3><TrendingUp size={16} /> Próximo foco</h3><p>{latestAttempt.feedback.improvements?.[0] ?? "Continue praticando para consolidar o domínio."}</p></article>
        <details className="arena-report-details">
          <summary><span>Relatório completo</span><small>Abrir detalhes da avaliação</small></summary>
          <div className="arena-full-report">
            <div className="evaluation-columns">
              <article><h3><CheckCircle2 size={17} /> Pontos fortes</h3><ul>{latestAttempt.feedback.strengths?.map((item) => <li key={item}>{item}</li>)}</ul></article>
              <article><h3><TrendingUp size={17} /> Próximas melhorias</h3><ul>{latestAttempt.feedback.improvements?.map((item) => <li key={item}>{item}</li>)}</ul></article>
            </div>
            <div className="evaluation-criteria"><h3>Critérios avaliados</h3>{latestAttempt.feedback.criteria?.map((item) => <article className={item.met ? "criterion-met" : "criterion-missed"} key={item.criterion}>{item.met ? <CheckCircle2 size={16} /> : <CircleX size={16} />}<div><strong>{item.criterion}</strong><p>{item.feedback}</p></div></article>)}</div>
          </div>
        </details>
      </div>
    </section>}

    {challenges && challenges.length > 1 && <details className="arena-history arena-history-collapsed">
      <summary><span><History size={14} /> Histórico de desafios</span><small>{count ?? 0} gerados</small></summary>
      <div>{challenges.slice(1).map((item) => <article className="panel" key={item.id}><span>{item.status === "completed" ? <Trophy size={15} /> : <Dumbbell size={15} />}</span><div><strong>{item.title}</strong><small>{item.mode} · {item.best_score !== null ? `nota ${item.best_score}` : "sem avaliação"}</small></div></article>)}</div>
    </details>}
  </main>;
}
