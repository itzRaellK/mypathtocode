export type TrackOutline = {
  summary: string;
  modules: Array<{
    key: string;
    title: string;
    summary: string;
    lessons: Array<{
      key: string;
      title: string;
      summary: string;
      objectives: string[];
      estimatedMinutes: number;
    }>;
  }>;
};

export type LessonContent = {
  introduction: string;
  explanation: string;
  example: string;
  exercise: {
    brief: string;
    starterFiles: Array<{ path: string; language: string; content: string }>;
    acceptanceCriteria: string[];
    evaluationFocus: string[];
  };
};

export type CodeEvaluation = {
  score: number;
  passed: boolean;
  summary: string;
  strengths: string[];
  improvements: string[];
  criteria: Array<{ criterion: string; met: boolean; feedback: string }>;
};

export function lessonsFromOutline(outline: TrackOutline) {
  return outline.modules.flatMap((moduleData) =>
    moduleData.lessons.map((lesson) => ({ ...lesson, moduleKey: moduleData.key, moduleTitle: moduleData.title })),
  );
}

export function findLesson(outline: TrackOutline, lessonKey: string) {
  return lessonsFromOutline(outline).find((lesson) => lesson.key === lessonKey) ?? null;
}
