import { Flame, Target, Zap } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { updateProfile } from "../account-actions";

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ message?: string }> }) {
  const { message } = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [{ data: profile }, { count: passedLessons }, { count: attempts }] = await Promise.all([
    supabase.from("profiles").select("*").eq("user_id", user!.id).single(),
    supabase.from("lesson_states").select("*", { count: "exact", head: true }).eq("user_id", user!.id).eq("status", "passed"),
    supabase.from("attempts").select("*", { count: "exact", head: true }).eq("user_id", user!.id),
  ]);
  const stats = (profile?.stats ?? {}) as Record<string, number>;
  const cards = [
    { label: "XP total", value: stats.xp ?? 0, icon: Zap },
    { label: "Aulas dominadas", value: passedLessons ?? 0, icon: Target },
    { label: "Sequência atual", value: `${stats.currentStreak ?? 0} dias`, icon: Flame },
    { label: "Tentativas", value: attempts ?? 0, icon: Target },
  ];
  return <main className="workspace-page"><header className="workspace-header"><div><span className="eyebrow"><span /> PERFIL TÉCNICO</span><h1>{profile?.display_name ?? "Estudante"}</h1><p>{profile?.bio || "Adicione uma descrição sobre sua jornada."}</p></div><div className="profile-level panel"><span>NÍVEL</span><strong>{stats.level ?? 1}</strong></div></header>
    {message && <div className="workspace-message">{message}</div>}
    <section className="metric-grid profile-metrics">{cards.map(({ label, value, icon: Icon }) => <article className="metric-card panel" key={label}><span className="metric-icon"><Icon size={18} /></span><span className="metric-label">{label}</span><strong>{value}</strong></article>)}</section>
    <section className="account-grid"><article className="panel account-card"><span className="eyebrow">IDENTIDADE</span><h2>Dados do perfil</h2><form className="account-form" action={updateProfile}><label>Nome<input name="displayName" defaultValue={profile?.display_name ?? "Estudante"} required /></label><label>Bio<textarea name="bio" rows={5} defaultValue={profile?.bio ?? ""} /></label><button className="button button-primary" type="submit">Salvar perfil</button></form></article>
      <article className="panel account-card account-summary"><span className="eyebrow">CONTA</span><h2>{user!.email}</h2><p>Conta criada em {new Date(user!.created_at).toLocaleDateString("pt-BR")}.</p><dl><div><dt>Maior sequência</dt><dd>{stats.longestStreak ?? 0} dias</dd></div><div><dt>Trilhas pessoais</dt><dd>Geradas pela IA</dd></div></dl></article></section>
  </main>;
}
