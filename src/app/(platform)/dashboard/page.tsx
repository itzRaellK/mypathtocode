import { Dashboard } from "@/components/dashboard";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { lessonsFromOutline, type TrackOutline } from "@/lib/learning";

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [{ data: profile }, { data: tracks }, { data: states }, { count: passedAttempts }] = await Promise.all([
    supabase.from("profiles").select("*").eq("user_id", user!.id).maybeSingle(),
    supabase.from("tracks").select("*").eq("user_id", user!.id).neq("status", "generating").order("created_at", { ascending: false }),
    supabase.from("lesson_states").select("*").eq("user_id", user!.id),
    supabase.from("evaluations").select("*, attempts!inner(user_id)", { count: "exact", head: true }).eq("passed", true).eq("attempts.user_id", user!.id),
  ]);

  const stats = (profile?.stats ?? {}) as Record<string, number>;
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
  const passedLessons = states?.filter((state) => state.status === "passed").length ?? 0;

  return <Dashboard
    displayName={profile?.display_name ?? user?.user_metadata.display_name ?? "Estudante"}
    stats={{ totalXp: stats.xp ?? 0, level: stats.level ?? 1, currentStreak: stats.currentStreak ?? 0, longestStreak: stats.longestStreak ?? 0, lessonsPassed: passedLessons, exercisesPassed: passedAttempts ?? 0 }}
    catalog={{ tracks: savedTracks.length, lessons: lessonCount }}
    nextLesson={next ? { href: `/tracks/${next.track.id}/lessons/${next.lesson.key}`, title: next.lesson.title, summary: next.lesson.summary, moduleTitle: next.lesson.moduleTitle, trackTitle: next.track.title } : null}
  />;
}
