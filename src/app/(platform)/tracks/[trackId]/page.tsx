import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, Clock3 } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { difficultyLabel } from "@/lib/format";
import type { TrackOutline } from "@/lib/learning";

export default async function TrackPage({ params }: { params: Promise<{ trackId: string }> }) {
  const { trackId } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: track } = await supabase.from("tracks").select("*").eq("id", trackId).eq("user_id", user!.id).maybeSingle();
  if (!track) notFound();
  const outline = track.outline as TrackOutline;
  const { data: states } = await supabase.from("lesson_states").select("lesson_key, status, best_score").eq("track_id", track.id).eq("user_id", user!.id);
  const stateMap = new Map(states?.map((state) => [state.lesson_key, state]) ?? []);

  return (
    <main className="workspace-page">
      <Link className="back-link" href="/tracks"><ArrowLeft size={14} /> Minhas trilhas</Link>
      <header className="track-hero panel"><div><span className="eyebrow">{track.topic} · {difficultyLabel(track.level)}</span><h1>{track.title}</h1><p>{track.summary}</p><div className="track-meta"><span><Clock3 size={13} /> Conteúdo gerado sob demanda</span><span>Nota mínima 9,0</span></div></div><span className="track-hero-symbol">{track.title.slice(0, 2).toUpperCase()}</span></header>
      <section className="learning-path">
        {outline.modules.map((moduleData, moduleIndex) => <article className="path-module" key={moduleData.key}>
          <header><span className="module-position">{String(moduleIndex + 1).padStart(2, "0")}</span><div><span className="eyebrow">MÓDULO</span><h2>{moduleData.title}</h2><p>{moduleData.summary}</p></div></header>
          <div className="path-lessons">{moduleData.lessons.map((lesson, lessonIndex) => {
            const state = stateMap.get(lesson.key);
            return <Link className="path-lesson panel" href={`/tracks/${track.id}/lessons/${lesson.key}`} key={lesson.key}>
              <span className="path-lesson-state">{state?.status === "passed" ? <CheckCircle2 size={16} /> : <BookOpen size={15} />}</span>
              <div><small>AULA {String(lessonIndex + 1).padStart(2, "0")}</small><strong>{lesson.title}</strong><p>{lesson.summary}</p></div>
              <span className="lesson-time">{state?.best_score ?? lesson.estimatedMinutes} {state?.best_score ? "nota" : "min"}</span><ArrowRight size={15} />
            </Link>;
          })}</div>
        </article>)}
      </section>
    </main>
  );
}
