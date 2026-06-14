import { Award } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AchievementsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { count } = await supabase.from("lesson_states").select("*", { count: "exact", head: true }).eq("user_id", user!.id).eq("status", "passed");
  return <main className="workspace-page"><header className="workspace-header"><div><span className="eyebrow"><span /> CONQUISTAS</span><h1>Domínio comprovado.</h1><p>Esta área será derivada do seu progresso real, sem catálogo administrativo separado.</p></div></header><div className="empty-state panel"><Award size={24} /><h3>{count ?? 0} aulas dominadas</h3><p>Conquistas serão calculadas a partir das aulas, notas e sequências registradas.</p></div></main>;
}
