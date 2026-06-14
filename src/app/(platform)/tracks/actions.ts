"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { generateJson } from "@/lib/gemini";
import type { TrackOutline } from "@/lib/learning";
import { trackPresets } from "@/lib/presets";

function validOutline(value: TrackOutline) {
  return Boolean(value?.summary && Array.isArray(value.modules) && value.modules.length > 0
    && value.modules.every((moduleData) => moduleData.key && moduleData.title && Array.isArray(moduleData.lessons)
      && moduleData.lessons.every((lesson) => lesson.key && lesson.title && lesson.summary && Array.isArray(lesson.objectives))));
}

export async function generatePresetTrack(presetId: string) {
  const preset = trackPresets.find((item) => item.id === presetId);
  if (!preset) return { ok: false, message: "Preset inválido." };
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Sessão expirada." };

  const { data: existingTracks } = await supabase.from("tracks")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .or(`slug.eq.${preset.id},slug.like.${preset.id}-%`)
    .order("created_at", { ascending: false })
    .limit(1);
  if (existingTracks?.length) {
    const existing = existingTracks[0];
    return { ok: true, message: "Esta trilha já existe. Abrindo o mapa salvo.", href: `/tracks/${existing.id}` };
  }

  const { data: run } = await supabase.from("ai_runs").insert({
    user_id: user.id,
    operation: "track_outline",
    target_type: "track",
    status: "processing",
    input: preset,
  }).select("id").single();

  const prompt = `Crie apenas o MAPA CURRICULAR LEVE de uma trilha prática.
Tema: ${preset.topic}
Nível: ${preset.level}
Público: ${preset.audience}
Pré-requisitos permitidos: ${preset.prerequisites}
Objetivo final: ${preset.goal}
Regras obrigatórias de progressão: ${JSON.stringify(preset.curriculumRules)}

Decida os conteúdos adequados ao nível. Organize uma progressão sem lacunas, sem antecipar tópicos avançados e sem gerar explicações detalhadas ou exercícios.
Nunca utilize um conceito antes de ensiná-lo. Para uma trilha sem pré-requisitos, comece no zero absoluto: não interprete "básico" como "básico para quem já programa".
Para níveis intermediário, avançado e especializações, trate os pré-requisitos declarados como o limite exato do conhecimento inicial. Reintroduza brevemente cada dependência antes de aprofundá-la e ensine todo conceito novo em ordem incremental.
Cada resumo deve deixar claro qual novo conceito será apresentado e por que ele pertence àquele ponto da progressão.
Retorne SOMENTE JSON:
{
  "summary": "resumo curto da trilha",
  "modules": [
    {
      "key": "slug-unico-do-modulo",
      "title": "título",
      "summary": "o que este módulo desenvolve",
      "lessons": [
        {
          "key": "slug-unico-na-trilha",
          "title": "título da aula",
          "summary": "o que será ensinado e por que importa",
          "objectives": ["objetivo verificável"],
          "estimatedMinutes": 30
        }
      ]
    }
  ]
}
Use português do Brasil. Prefira 5 a 8 módulos e 4 a 7 aulas por módulo.`;

  try {
    const generated = await generateJson<TrackOutline>(prompt);
    if (!validOutline(generated.data)) throw new Error("A IA retornou um mapa curricular inválido.");
    const { data: track, error } = await supabase.from("tracks").insert({
      user_id: user.id,
      slug: preset.id,
      title: preset.title,
      topic: preset.topic,
      level: preset.level,
      goal: preset.goal,
      summary: generated.data.summary,
      outline: generated.data,
      generation: {
        model: generated.model,
        usage: generated.usage,
        curriculum: {
          presetId: preset.id,
          audience: preset.audience,
          prerequisites: preset.prerequisites,
          rules: preset.curriculumRules,
        },
      },
    }).select("id").single();
    if (error || !track) throw new Error(error?.message || "Não foi possível salvar a trilha.");
    if (run) await supabase.from("ai_runs").update({
      target_id: track.id,
      status: "completed",
      model: generated.model,
      output: generated.data,
      usage: generated.usage,
      completed_at: new Date().toISOString(),
    }).eq("id", run.id);
    revalidatePath("/tracks");
    revalidatePath("/dashboard");
    return { ok: true, message: "Mapa curricular gerado.", href: `/tracks/${track.id}` };
  } catch (error) {
    if (run) await supabase.from("ai_runs").update({
      status: "failed",
      error_message: error instanceof Error ? error.message : "Falha desconhecida.",
      completed_at: new Date().toISOString(),
    }).eq("id", run.id);
    return { ok: false, message: error instanceof Error ? error.message : "Falha ao gerar trilha." };
  }
}
