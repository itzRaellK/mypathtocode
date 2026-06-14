import { Dashboard } from "@/components/dashboard";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { lessonsFromOutline, type TrackOutline } from "@/lib/learning";
import { calculateProgress, lessonCompletionDates } from "@/lib/progress";

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [{ data: profile }, { data: tracks }, { data: states }, { data: passedEvaluations, count: passedAttempts }, { data: arenaWins }] = await Promise.all([
    supabase.from("profiles").select("*").eq("user_id", user!.id).maybeSingle(),
    supabase.from("tracks").select("*").eq("user_id", user!.id).eq("status", "active").order("created_at", { ascending: false }),
    supabase.from("lesson_states").select("*").eq("user_id", user!.id),
    supabase.from("evaluations").select("created_at, attempts!inner(user_id, track_id, lesson_key)", { count: "exact" }).eq("passed", true).eq("attempts.user_id", user!.id),
    supabase.from("arena_challenges").select("completed_at").eq("user_id", user!.id).eq("status", "completed"),
  ]);

  const stateMap = new Map(states?.map((state) => [`${state.track_id}/${state.lesson_key}`, state]) ?? []);
  const savedTracks = tracks ?? [];
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
  const passedStates = states?.filter((state) => state.status === "passed") ?? [];
  const passedLessons = passedStates.length;
  const progress = calculateProgress({
    passedLessons,
    arenaWins: arenaWins?.length ?? 0,
    activityDates: [
      ...lessonCompletionDates(passedStates, passedEvaluations ?? []),
      ...(arenaWins?.map((challenge) => challenge.completed_at) ?? []),
    ],
  });

  return <Dashboard
    displayName={profile?.display_name ?? user?.user_metadata.display_name ?? "Estudante"}
    stats={{ ...progress, lessonsPassed: passedLessons, exercisesPassed: (passedAttempts ?? 0) + (arenaWins?.length ?? 0) }}
    catalog={{ tracks: savedTracks.length, lessons: lessonCount }}
    nextLesson={next ? { href: `/tracks/${next.track.id}/lessons/${next.lesson.key}`, title: next.lesson.title, summary: next.lesson.summary, moduleTitle: next.lesson.moduleTitle, trackTitle: next.track.title } : null}
  />;
}
