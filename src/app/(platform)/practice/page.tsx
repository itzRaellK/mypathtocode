import { Dumbbell, Sparkles } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function PracticePage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { count } = await supabase.from("attempts").select("*", { count: "exact", head: true }).eq("user_id", user!.id);
  return <main className="workspace-page"><header className="workspace-header"><div><span className="eyebrow"><span /> PRÁTICA</span><h1>Histórico de exercícios.</h1><p>As práticas nascem dentro das aulas geradas e suas tentativas ficam preservadas aqui.</p></div><div className="workspace-stat panel"><Dumbbell size={18} /><span><strong>{count ?? 0}</strong><small>tentativas salvas</small></span></div></header><div className="empty-state panel"><Sparkles size={24} /><h3>Comece por uma aula</h3><p>Abra uma trilha, gere o conteúdo de uma aula e trabalhe no exercício proposto.</p></div></main>;
}
