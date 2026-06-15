import { Dashboard } from "@/components/dashboard";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { lessonsFromOutline, type CodeEvaluation, type TrackOutline } from "@/lib/learning";
import { calculateProgress } from "@/lib/progress";

type LessonEvaluationRow = {
  created_at: string;
  score: number;
  passed: boolean;
  feedback: CodeEvaluation;
  attempts: { track_id: string; lesson_key: string } | Array<{ track_id: string; lesson_key: string }>;
};

type ArenaAttemptRow = {
  id: string;
  challenge_id: string;
  created_at: string;
  score: number;
  passed: boolean;
  feedback: CodeEvaluation;
};

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [
    { data: profile },
    { data: tracks },
    { data: states },
    { data: lessonEvaluations },
    { data: arenaChallenges },
    { data: arenaAttempts },
    { data: activeArena },
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("user_id", user!.id).maybeSingle(),
    supabase.from("tracks").select("*").eq("user_id", user!.id).eq("status", "active").order("created_at", { ascending: false }),
    supabase.from("lesson_states").select("*").eq("user_id", user!.id),
    supabase.from("evaluations").select("created_at,score,passed,feedback,attempts!inner(user_id,track_id,lesson_key)").eq("attempts.user_id", user!.id).order("created_at", { ascending: false }).limit(12),
    supabase.from("arena_challenges").select("id,title,mode,status,completed_at").eq("user_id", user!.id),
    supabase.from("arena_attempts").select("id,challenge_id,created_at,score,passed,feedback").eq("user_id", user!.id).order("created_at", { ascending: false }).limit(30),
    supabase.from("arena_challenges").select("id,title,summary,best_score").eq("user_id", user!.id).eq("status", "active").order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);

  const savedTracks = tracks ?? [];
  const savedStates = states ?? [];
  const stateMap = new Map(savedStates.map((state) => [`${state.track_id}/${state.lesson_key}`, state]));
  const lessonMap = new Map(savedTracks.flatMap((track) => lessonsFromOutline(track.outline as TrackOutline).map((lesson) => [`${track.id}/${lesson.key}`, { ...lesson, track }] as const)));

  const resumable = savedTracks.flatMap((track) =>
    lessonsFromOutline(track.outline as TrackOutline).map((lesson) => ({
      track,
      lesson,
      state: stateMap.get(`${track.id}/${lesson.key}`),
    })),
  ).filter((item) => item.state?.status !== "passed");
  const next = [...resumable].sort((a, b) => {
    const aTime = a.state?.last_opened_at ? new Date(a.state.last_opened_at).getTime() : 0;
    const bTime = b.state?.last_opened_at ? new Date(b.state.last_opened_at).getTime() : 0;
    return bTime - aTime;
  })[0];

  const lessonCount = savedTracks.reduce((total, track) => total + lessonsFromOutline(track.outline as TrackOutline).length, 0);
  const passedLessons = savedStates.filter((state) => state.status === "passed").length;
  const arenaCompleted = arenaChallenges?.filter((challenge) => challenge.status === "completed") ?? [];
  const progress = calculateProgress({ passedLessons, arenaWins: arenaCompleted.length, activityDates: [] });

  const trackProgress = savedTracks.map((track) => {
    const outline = track.outline as TrackOutline;
    const lessons = lessonsFromOutline(outline);
    const completed = lessons.filter((lesson) => stateMap.get(`${track.id}/${lesson.key}`)?.status === "passed").length;
    return {
      id: track.id,
      title: track.title,
      topic: track.topic,
      completed,
      total: lessons.length,
      percentage: lessons.length ? Math.round((completed / lessons.length) * 100) : 0,
      href: `/tracks/${track.id}`,
      modules: outline.modules.map((moduleData) => {
        const moduleCompleted = moduleData.lessons.filter((lesson) => stateMap.get(`${track.id}/${lesson.key}`)?.status === "passed").length;
        return {
          title: moduleData.title,
          completed: moduleCompleted,
          total: moduleData.lessons.length,
          percentage: moduleData.lessons.length ? Math.round((moduleCompleted / moduleData.lessons.length) * 100) : 0,
        };
      }),
    };
  });

  const lessonActivity = ((lessonEvaluations ?? []) as LessonEvaluationRow[]).map((evaluation) => {
    const attempt = Array.isArray(evaluation.attempts) ? evaluation.attempts[0] : evaluation.attempts;
    const lesson = attempt ? lessonMap.get(`${attempt.track_id}/${attempt.lesson_key}`) : null;
    return {
      id: `lesson-${evaluation.created_at}-${attempt?.lesson_key ?? "unknown"}`,
      title: lesson?.title ?? "Avaliação de aula",
      context: lesson?.track.title ?? "Trilha",
      score: Number(evaluation.score),
      passed: evaluation.passed,
      href: attempt ? `/tracks/${attempt.track_id}/lessons/${attempt.lesson_key}` : "/tracks",
      createdAt: evaluation.created_at,
      feedback: evaluation.feedback,
    };
  });

  const arenaChallengeIds = new Set(((arenaAttempts ?? []) as ArenaAttemptRow[]).map((attempt) => attempt.challenge_id));
  const { data: activityChallenges } = arenaChallengeIds.size
    ? await supabase.from("arena_challenges").select("id,title").in("id", [...arenaChallengeIds])
    : { data: [] };
  const challengeMap = new Map([
    ...(arenaChallenges?.map((challenge) => [challenge.id, challenge.title] as const) ?? []),
    ...(activityChallenges?.map((challenge) => [challenge.id, challenge.title] as const) ?? []),
  ]);
  const arenaActivity = ((arenaAttempts ?? []) as ArenaAttemptRow[]).map((attempt) => ({
    id: `arena-${attempt.id}`,
    title: challengeMap.get(attempt.challenge_id) ?? "Desafio da Arena",
    context: "Arena",
    score: Number(attempt.score),
    passed: attempt.passed,
    href: "/practice",
    createdAt: attempt.created_at,
    feedback: attempt.feedback,
  }));

  const allActivity = [...lessonActivity, ...arenaActivity].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const reviewItems = allActivity.flatMap((activity) => activity.feedback?.improvements ?? []).filter(Boolean);
  const completionRate = lessonCount ? Math.round((passedLessons / lessonCount) * 100) : 0;
  const savedArenaAttempts = (arenaAttempts ?? []) as ArenaAttemptRow[];
  const arenaAverage = savedArenaAttempts.length
    ? savedArenaAttempts.reduce((total, attempt) => total + Number(attempt.score), 0) / savedArenaAttempts.length
    : 0;
  const arenaPassRate = savedArenaAttempts.length
    ? Math.round((savedArenaAttempts.filter((attempt) => attempt.passed).length / savedArenaAttempts.length) * 100)
    : 0;
  const arenaModes = [...new Set(arenaChallenges?.map((challenge) => challenge.mode) ?? [])].map((mode) => ({
    mode,
    completed: arenaCompleted.filter((challenge) => challenge.mode === mode).length,
  })).sort((a, b) => b.completed - a.completed);

  return <Dashboard
    displayName={profile?.display_name ?? user?.user_metadata.display_name ?? "Estudante"}
    stats={{
      totalXp: progress.totalXp,
      level: progress.level,
      lessonsPassed: passedLessons,
      arenaWins: arenaCompleted.length,
      approvedSolutions: passedLessons + arenaCompleted.length,
      completionRate,
    }}
    catalog={{ tracks: savedTracks.length, lessons: lessonCount }}
    nextLesson={next ? { href: `/tracks/${next.track.id}/lessons/${next.lesson.key}`, title: next.lesson.title, summary: next.lesson.summary, moduleTitle: next.lesson.moduleTitle, trackTitle: next.track.title } : null}
    trackProgress={trackProgress}
    recentActivity={allActivity.slice(0, 5)}
    arenaChallenge={activeArena ? { title: activeArena.title, summary: activeArena.summary, bestScore: activeArena.best_score } : null}
    arenaInsights={{
      completed: arenaCompleted.length,
      attempts: savedArenaAttempts.length,
      averageScore: arenaAverage,
      passRate: arenaPassRate,
      scoreTrend: savedArenaAttempts.slice(0, 8).reverse().map((attempt) => Number(attempt.score)),
      modes: arenaModes,
    }}
    reviewItems={[...new Set(reviewItems)].slice(0, 4)}
  />;
}
