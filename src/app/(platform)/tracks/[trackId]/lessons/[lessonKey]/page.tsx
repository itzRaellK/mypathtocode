import { ArrowLeft, CheckCircle2, CircleX, Code2, Sparkles, Target, TrendingUp } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AsyncActionButton } from "@/components/async-action-button";
import { LessonWorkspace } from "@/components/lesson-workspace";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { findLesson, type CodeEvaluation, type LessonContent, type TrackOutline } from "@/lib/learning";
import { generateLesson } from "@/app/(platform)/lessons/actions";

export default async function LessonPage({ params }: { params: Promise<{ trackId: string; lessonKey: string }> }) {
  const { trackId, lessonKey } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: track } = await supabase.from("tracks").select("*").eq("id", trackId).eq("user_id", user!.id).maybeSingle();
  if (!track) notFound();

  const outline = track.outline as TrackOutline;
  const lesson = findLesson(outline, lessonKey);
  if (!lesson) notFound();

  const [{ data: contentRow }, { data: state }, { data: latestAttempt }] = await Promise.all([
    supabase.from("lesson_contents").select("*").eq("track_id", trackId).eq("lesson_key", lessonKey).eq("status", "active").maybeSingle(),
    supabase.from("lesson_states").select("*").eq("user_id", user!.id).eq("track_id", trackId).eq("lesson_key", lessonKey).maybeSingle(),
    supabase.from("attempts").select("id").eq("user_id", user!.id).eq("track_id", trackId).eq("lesson_key", lessonKey).eq("status", "evaluated").order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const { data: evaluationRow } = latestAttempt
    ? await supabase.from("evaluations").select("*").eq("attempt_id", latestAttempt.id).maybeSingle()
    : { data: null };

  const content = contentRow?.content as LessonContent | undefined;
  const evaluation = evaluationRow?.feedback as CodeEvaluation | undefined;
  const draftFiles = Array.isArray(state?.draft_files) && state.draft_files.length ? state.draft_files : content?.exercise.starterFiles;
  const visitedAt = new Date().toISOString();
  if (state) {
    await supabase.from("lesson_states").update({ last_opened_at: visitedAt }).eq("user_id", user!.id).eq("track_id", trackId).eq("lesson_key", lessonKey);
  } else {
    await supabase.from("lesson_states").insert({ user_id: user!.id, track_id: trackId, lesson_key: lessonKey, status: "available", last_opened_at: visitedAt });
  }

  return (
    <main className="lesson-page">
      <header className="lesson-page-header">
        <Link className="back-link" href={`/tracks/${track.id}`}><ArrowLeft size={14} /> {track.title}</Link>
        <div><span className="eyebrow">{lesson.moduleTitle}</span><h1>{lesson.title}</h1><p>{lesson.summary}</p></div>
        <div className="lesson-header-meta"><span><Target size={14} /> Nota mínima 9,0</span><span>{lesson.estimatedMinutes} min</span></div>
      </header>

      {!content ? <div className="empty-state panel lesson-empty"><Sparkles size={25} /><h3>Esta aula ainda é apenas um resumo</h3><p>Gere agora a explicação, exemplo, exercício, arquivos iniciais e critérios específicos desta aula.</p><AsyncActionButton action={generateLesson.bind(null, track.id, lessonKey)} label="Gerar conteúdo desta aula" /></div> : (
        <div className="lesson-layout">
          <article className="lesson-reading">
            <section className="lesson-block lesson-intro"><span className="eyebrow">VISÃO GERAL</span><p>{content.introduction}</p></section>
            <section className="lesson-block panel"><h2>O que você vai dominar</h2><ul>{lesson.objectives.map((objective) => <li key={objective}><CheckCircle2 size={14} /> {objective}</li>)}</ul></section>
            <section className="lesson-block"><h2>Conceito essencial</h2><div className="prose-text">{content.explanation}</div></section>
            <section className="lesson-block"><h2>Exemplo direto</h2><pre className="lesson-code"><code>{content.example}</code></pre></section>
            <section className="lesson-block practice-brief panel"><span className="recommendation-icon"><Code2 size={20} /></span><div><span className="eyebrow">EXERCÍCIO</span><h2>Agora é com você</h2><p>{content.exercise.brief}</p></div></section>
            {draftFiles && <LessonWorkspace trackId={track.id} lessonKey={lessonKey} initialFiles={draftFiles} />}
            <div className="practice-status-grid">
              <article className="panel lesson-ai-card"><Sparkles size={21} /><span className="eyebrow">CRITÉRIOS</span><h3>A IA avaliará</h3><ul>{content.exercise.acceptanceCriteria.map((criterion) => <li key={criterion}>{criterion}</li>)}</ul></article>
              <article className="panel lesson-progress-card"><span className="eyebrow">PROGRESSÃO</span><strong>{state?.best_score ?? "—"}</strong><p>Seu melhor resultado ficará salvo aqui.</p></article>
            </div>
          </article>
        </div>
      )}
      {content && evaluation && <section className="lesson-results">
        {evaluation && <section className={`evaluation-report panel ${evaluation.passed ? "evaluation-passed" : "evaluation-retry"}`}>
              <header className="evaluation-report-header">
                <div><span className="eyebrow">ÚLTIMA AVALIAÇÃO</span><h2>{evaluation.passed ? "Domínio comprovado" : "Ainda não passou"}</h2><p>{evaluation.summary}</p></div>
                <div className="evaluation-score"><span>NOTA</span><strong>{Number(evaluation.score).toFixed(1)}</strong><small>/ 10</small></div>
              </header>
              <div className="evaluation-columns">
                <article><h3><CheckCircle2 size={17} /> Pontos fortes</h3><ul>{evaluation.strengths?.map((item) => <li key={item}>{item}</li>)}</ul></article>
                <article><h3><TrendingUp size={17} /> Próximas melhorias</h3><ul>{evaluation.improvements?.map((item) => <li key={item}>{item}</li>)}</ul></article>
              </div>
              <div className="evaluation-criteria"><h3>Critérios avaliados</h3>{evaluation.criteria?.map((item) => <article className={item.met ? "criterion-met" : "criterion-missed"} key={item.criterion}>{item.met ? <CheckCircle2 size={16} /> : <CircleX size={16} />}<div><strong>{item.criterion}</strong><p>{item.feedback}</p></div></article>)}</div>
        </section>}
      </section>}
    </main>
  );
}
