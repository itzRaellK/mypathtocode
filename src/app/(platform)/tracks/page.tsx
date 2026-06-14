import { ArrowRight, BookOpen, Clock3, Layers3, Sparkles } from "lucide-react";
import Link from "next/link";
import { AsyncActionButton } from "@/components/async-action-button";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { difficultyLabel } from "@/lib/format";
import { lessonsFromOutline, type TrackOutline } from "@/lib/learning";
import { trackPresets } from "@/lib/presets";
import { generatePresetTrack } from "./actions";

const presetGroups = [
  { key: "core", eyebrow: "PROGRESSÃO PRINCIPAL", title: "Do zero à engenharia avançada" },
  { key: "specialization", eyebrow: "ESPECIALIZAÇÕES", title: "Escolha uma área para dominar" },
] as const;

export default async function TracksPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: tracks } = await supabase.from("tracks")
    .select("*")
    .eq("user_id", user!.id)
    .neq("status", "generating")
    .order("created_at", { ascending: false });

  const presetIdFor = (slug: string) => trackPresets.find((preset) => slug === preset.id || slug.startsWith(`${preset.id}-`))?.id;
  const latestByPreset = new Map<string, NonNullable<typeof tracks>[number]>();
  tracks?.forEach((track) => {
    const presetId = presetIdFor(track.slug);
    if (presetId && !latestByPreset.has(presetId)) latestByPreset.set(presetId, track);
  });

  return (
    <main className="workspace-page">
      <header className="workspace-header">
        <div><span className="eyebrow"><span /> TRILHAS GERADAS</span><h1>Escolha. Gere. Estude.</h1><p>Suas trilhas salvas ficam sempre acessíveis aqui.</p></div>
        <div className="workspace-stat panel"><BookOpen size={18} /><span><strong>{tracks?.length ?? 0}</strong><small>trilhas salvas</small></span></div>
      </header>

      <section className="workspace-section first-section">
        <div className="section-heading"><div><span className="eyebrow">MINHAS TRILHAS</span><h2>Continue estudando</h2></div></div>
        {!tracks?.length ? <div className="empty-state panel"><Sparkles size={24} /><h3>Nenhuma trilha gerada</h3><p>Escolha uma trilha abaixo para a IA criar seu mapa curricular.</p></div> : (
          <section className="track-grid">
            {tracks.map((track) => {
              const outline = track.outline as TrackOutline;
              return <Link className="track-card panel" href={`/tracks/${track.id}`} key={track.id}>
                <div className="track-card-visual"><span>{difficultyLabel(track.level).slice(0, 1)}</span><i /></div>
                <div className="track-card-copy"><div className="catalog-card-top"><span className="status-badge status-published">{track.status === "archived" ? "Recuperada" : "Salva"}</span><small>{track.topic}</small></div>
                  <h2>{track.title}</h2><p>{track.summary}</p>
                  <div className="track-meta"><span><Layers3 size={13} /> {outline.modules.length} módulos</span><span><Clock3 size={13} /> {lessonsFromOutline(outline).length} aulas</span></div>
                  <span className="track-open">Abrir trilha e aulas <ArrowRight size={14} /></span>
                </div>
              </Link>;
            })}
          </section>
        )}
      </section>

      {presetGroups.map((group) => (
        <section className="workspace-section" key={group.key}>
          <div className="section-heading"><div><span className="eyebrow">{group.eyebrow}</span><h2>{group.title}</h2></div></div>
          <div className="preset-grid">
            {trackPresets.filter((preset) => preset.group === group.key).map((preset) => {
              const existing = latestByPreset.get(preset.id);
              return <article className="preset-card panel" key={preset.id}>
                <span className="status-badge status-draft">{difficultyLabel(preset.level)}</span>
                <h3>{preset.title}</h3><p>{preset.description}</p>
                {existing
                  ? <Link className="button button-primary" href={`/tracks/${existing.id}`}><BookOpen size={15} /> Abrir trilha salva</Link>
                  : <AsyncActionButton action={generatePresetTrack.bind(null, preset.id)} label="Gerar mapa curricular" />}
              </article>;
            })}
          </div>
        </section>
      ))}
    </main>
  );
}
