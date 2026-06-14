import { Award, BookCheck, CheckCircle2, Code2, Flame, LockKeyhole, Route, Star, Trophy } from "lucide-react";
import type { TrackOutline } from "@/lib/learning";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AchievementsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [{ data: states }, { data: tracks }, { count: attempts }, { count: arenaWins }] = await Promise.all([
    supabase.from("lesson_states").select("track_id,lesson_key,status,best_score").eq("user_id", user!.id),
    supabase.from("tracks").select("id,title,outline").eq("user_id", user!.id),
    supabase.from("attempts").select("*", { count: "exact", head: true }).eq("user_id", user!.id),
    supabase.from("arena_challenges").select("*", { count: "exact", head: true }).eq("user_id", user!.id).eq("status", "completed"),
  ]);

  const passed = states?.filter((state) => state.status === "passed") ?? [];
  const perfectScores = passed.filter((state) => Number(state.best_score) === 10).length;
  const passedKeys = new Set(passed.map((state) => `${state.track_id}:${state.lesson_key}`));
  let completedModules = 0;
  let completedTracks = 0;
  for (const track of tracks ?? []) {
    const outline = track.outline as TrackOutline;
    const modulesDone = outline.modules.filter((moduleData) => moduleData.lessons.every((lesson) => passedKeys.has(`${track.id}:${lesson.key}`))).length;
    completedModules += modulesDone;
    if (outline.modules.length > 0 && modulesDone === outline.modules.length) completedTracks += 1;
  }

  const achievements = [
    { title: "Primeiro passo", description: "Conclua sua primeira aula com nota mínima 9.", progress: `${Math.min(passed.length, 1)}/1 aula`, earned: passed.length >= 1, icon: BookCheck },
    { title: "Fundação sólida", description: "Conclua 5 aulas.", progress: `${Math.min(passed.length, 5)}/5 aulas`, earned: passed.length >= 5, icon: Code2 },
    { title: "Ritmo de estudo", description: "Conclua 10 aulas.", progress: `${Math.min(passed.length, 10)}/10 aulas`, earned: passed.length >= 10, icon: Flame },
    { title: "Módulo dominado", description: "Conclua todas as aulas de um módulo.", progress: `${Math.min(completedModules, 1)}/1 módulo`, earned: completedModules >= 1, icon: Route },
    { title: "Caminho completo", description: "Conclua uma trilha inteira.", progress: `${Math.min(completedTracks, 1)}/1 trilha`, earned: completedTracks >= 1, icon: Trophy },
    { title: "Execução perfeita", description: "Receba nota 10 em uma aula.", progress: `${Math.min(perfectScores, 1)}/1 nota perfeita`, earned: perfectScores >= 1, icon: Star },
    { title: "Persistência", description: "Envie 10 soluções para avaliação.", progress: `${Math.min(attempts ?? 0, 10)}/10 tentativas`, earned: (attempts ?? 0) >= 10, icon: CheckCircle2 },
    { title: "Campeão da Arena", description: "Vença seu primeiro desafio infinito.", progress: `${Math.min(arenaWins ?? 0, 1)}/1 vitória`, earned: (arenaWins ?? 0) >= 1, icon: Award },
  ];
  const earnedCount = achievements.filter((achievement) => achievement.earned).length;

  return <main className="workspace-page">
    <header className="workspace-header">
      <div><span className="eyebrow"><span /> CONQUISTAS</span><h1>Marcos do seu progresso.</h1><p>Cada conquista nasce de algo que você realmente concluiu nas trilhas ou venceu na Arena.</p></div>
      <div className="workspace-stat panel"><Award size={18} /><span><strong>{earnedCount}</strong><small>de {achievements.length} conquistadas</small></span></div>
    </header>
    <section className="achievement-grid">
      {achievements.map(({ title, description, progress, earned, icon: Icon }) => <article className={`achievement-card panel ${earned ? "achievement-earned" : ""}`} key={title}>
        <span>{earned ? <Icon size={21} /> : <LockKeyhole size={19} />}</span>
        <h2>{title}</h2><p>{description}</p><small>{earned ? "CONQUISTADA · " : "PROGRESSO · "}{progress}</small>
      </article>)}
    </section>
  </main>;
}

