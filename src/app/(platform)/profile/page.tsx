import { Flame, Target, Zap } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { calculateProgress, lessonCompletionDates } from "@/lib/progress";
import { updateProfile } from "../account-actions";

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ message?: string }> }) {
  const { message } = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [{ data: profile }, { data: passedStates }, { count: lessonAttempts }, { data: passedEvaluations }, { data: arenaWins }, { count: arenaAttempts }] = await Promise.all([
    supabase.from("profiles").select("*").eq("user_id", user!.id).single(),
    supabase.from("lesson_states").select("track_id, lesson_key, passed_at").eq("user_id", user!.id).eq("status", "passed"),
    supabase.from("attempts").select("*", { count: "exact", head: true }).eq("user_id", user!.id),
    supabase.from("evaluations").select("created_at, attempts!inner(user_id, track_id, lesson_key)").eq("passed", true).eq("attempts.user_id", user!.id),
    supabase.from("arena_challenges").select("completed_at").eq("user_id", user!.id).eq("status", "completed"),
    supabase.from("arena_attempts").select("*", { count: "exact", head: true }).eq("user_id", user!.id),
  ]);
  const progress = calculateProgress({
    passedLessons: passedStates?.length ?? 0,
    arenaWins: arenaWins?.length ?? 0,
    activityDates: [
      ...lessonCompletionDates(passedStates ?? [], passedEvaluations ?? []),
      ...(arenaWins?.map((challenge) => challenge.completed_at) ?? []),
    ],
  });
  const cards = [
    { label: "XP por domínio", value: progress.totalXp, icon: Zap },
    { label: "Aulas dominadas", value: passedStates?.length ?? 0, icon: Target },
    { label: "Sequência atual", value: `${progress.currentStreak} dias`, icon: Flame },
    { label: "Tentativas", value: (lessonAttempts ?? 0) + (arenaAttempts ?? 0), icon: Target },
  ];

  return <main className="workspace-page">
    <header className="workspace-header">
      <div><span className="eyebrow"><span /> PERFIL TÉCNICO</span><h1>{profile?.display_name ?? "Estudante"}</h1><p>{profile?.bio || "Adicione uma descrição sobre sua jornada."}</p></div>
      <div className="profile-level panel"><span>NÍVEL</span><strong>{progress.level}</strong></div>
    </header>
    {message && <div className="workspace-message">{message}</div>}
    <section className="metric-grid profile-metrics">{cards.map(({ label, value, icon: Icon }) => <article className="metric-card panel" key={label}><span className="metric-icon"><Icon size={18} /></span><span className="metric-label">{label}</span><strong>{value}</strong></article>)}</section>
    <section className="account-grid">
      <article className="panel account-card"><span className="eyebrow">IDENTIDADE</span><h2>Dados do perfil</h2><form className="account-form" action={updateProfile}><label>Nome<input name="displayName" defaultValue={profile?.display_name ?? "Estudante"} required /></label><label>Bio<textarea name="bio" rows={5} defaultValue={profile?.bio ?? ""} /></label><button className="button button-primary" type="submit">Salvar perfil</button></form></article>
      <article className="panel account-card account-summary"><span className="eyebrow">CONTA</span><h2>{user!.email}</h2><p>Conta criada em {new Date(user!.created_at).toLocaleDateString("pt-BR")}.</p><dl><div><dt>Maior sequência</dt><dd>{progress.longestStreak} dias</dd></div><div><dt>Dias ativos</dt><dd>{progress.activeDays}</dd></div></dl></article>
    </section>
  </main>;
}
