import type { CodeEvaluation } from "@/lib/learning";

export type ArenaFile = { path: string; language: string; content: string };

export type ArenaChallengeContent = {
  title: string;
  summary: string;
  brief: string;
  starterFiles: ArenaFile[];
  acceptanceCriteria: string[];
  evaluationFocus: string[];
};

export type ArenaChallenge = {
  id: string;
  mode: string;
  difficulty: string;
  title: string;
  summary: string;
  brief: string;
  starter_files: ArenaFile[];
  acceptance_criteria: string[];
  evaluation_focus: string[];
  draft_files: ArenaFile[];
  status: "active" | "completed" | "archived";
  best_score: number | null;
  created_at: string;
};

export type ArenaAttempt = {
  id: string;
  score: number;
  passed: boolean;
  feedback: CodeEvaluation;
  created_at: string;
};

export const arenaModes = [
  { key: "adaptive", title: "Treino adaptativo", description: "A IA escolhe o próximo ponto com base no seu histórico." },
  { key: "logic", title: "Lógica e algoritmos", description: "Problemas de raciocínio, controle de fluxo e estruturas de dados." },
  { key: "cpp", title: "C++ puro", description: "Sintaxe, memória, orientação a objetos e código moderno." },
  { key: "unreal", title: "C++ para Unreal", description: "Desafios práticos de gameplay usando padrões da Unreal Engine." },
  { key: "debugging", title: "Caça ao bug", description: "Código com falhas para investigar, explicar e corrigir." },
] as const;

export type ArenaMode = (typeof arenaModes)[number]["key"];

