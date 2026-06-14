export function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function difficultyLabel(value: string) {
  const labels: Record<string, string> = {
    beginner: "Básico",
    intermediate: "Intermediário",
    advanced: "Avançado",
    expert: "Especialista",
  };
  return labels[value] ?? value;
}

export function statusLabel(value: string) {
  const labels: Record<string, string> = {
    draft: "Rascunho",
    in_review: "Em revisão",
    published: "Publicado",
    archived: "Arquivado",
    superseded: "Substituído",
    rejected: "Rejeitado",
  };
  return labels[value] ?? value;
}

export function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}
