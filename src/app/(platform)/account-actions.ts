"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function message(path: string, value: string) {
  return `${path}?message=${encodeURIComponent(value)}`;
}

async function session() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

export async function updateProfile(formData: FormData) {
  const { supabase, user } = await session();
  const { error } = await supabase.from("profiles").update({
    display_name: text(formData, "displayName"),
    bio: text(formData, "bio") || null,
  }).eq("user_id", user.id);
  if (error) redirect(message("/profile", error.message));
  revalidatePath("/", "layout");
  redirect(message("/profile", "Perfil atualizado."));
}

export async function updatePassword(formData: FormData) {
  const { supabase } = await session();
  const { error } = await supabase.auth.updateUser({ password: text(formData, "password") });
  if (error) redirect(message("/settings", error.message));
  redirect(message("/settings", "Senha atualizada."));
}

export async function updateSettings(formData: FormData) {
  const { supabase, user } = await session();
  const preferences = {
    accent: text(formData, "accent"),
    suggestedDifficulty: text(formData, "suggestedDifficulty"),
    notificationsEnabled: formData.get("notificationsEnabled") === "on",
    reducedMotion: formData.get("reducedMotion") === "on",
  };
  const { error } = await supabase.from("profiles").update({ preferences }).eq("user_id", user.id);
  if (error) redirect(message("/settings", error.message));
  redirect(message("/settings", "Preferências atualizadas."));
}
