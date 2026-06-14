import { LockKeyhole, Settings2 } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { updatePassword, updateSettings } from "../account-actions";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ message?: string }> }) {
  const { message } = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("preferences").eq("user_id", user!.id).single();
  const settings = (profile?.preferences ?? {}) as Record<string, string | boolean>;
  return <main className="workspace-page"><header className="workspace-header"><div><span className="eyebrow"><span /> CONFIGURAÇÕES</span><h1>Ajuste sua experiência.</h1><p>Preferências de estudo, acessibilidade e segurança.</p></div></header>{message && <div className="workspace-message">{message}</div>}
    <section className="account-grid"><article className="panel account-card"><Settings2 size={21} /><span className="eyebrow">PREFERÊNCIAS</span><h2>Estudo e interface</h2><form className="account-form" action={updateSettings}><label>Atmosfera<select name="accent" defaultValue={String(settings.accent ?? "green")}><option value="green">Verde</option><option value="blue">Azul</option><option value="purple">Roxo</option><option value="orange">Laranja</option></select></label><label>Dificuldade sugerida<select name="suggestedDifficulty" defaultValue={String(settings.suggestedDifficulty ?? "adaptive")}><option value="adaptive">Adaptativa</option><option value="beginner">Básica</option><option value="intermediate">Intermediária</option><option value="advanced">Avançada</option></select></label><label className="check-label"><input name="notificationsEnabled" type="checkbox" defaultChecked={Boolean(settings.notificationsEnabled)} /> Notificações habilitadas</label><label className="check-label"><input name="reducedMotion" type="checkbox" defaultChecked={Boolean(settings.reducedMotion)} /> Reduzir movimentos</label><button className="button button-primary" type="submit">Salvar preferências</button></form></article>
      <article className="panel account-card"><LockKeyhole size={21} /><span className="eyebrow">SEGURANÇA</span><h2>Alterar senha</h2><form className="account-form" action={updatePassword}><label>Nova senha<input name="password" type="password" minLength={8} required /></label><button className="button button-ghost" type="submit">Atualizar senha</button></form></article></section>
  </main>;
}
