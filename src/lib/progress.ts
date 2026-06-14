const STUDY_TIME_ZONE = "America/Sao_Paulo";

function dateKey(value: string | Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: STUDY_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function dayNumber(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
}

export function calculateStreak(values: Array<string | null | undefined>, now = new Date()) {
  const days = [...new Set(values.filter((value): value is string => Boolean(value)).map(dateKey))]
    .sort((a, b) => dayNumber(b) - dayNumber(a));
  if (!days.length) return { current: 0, longest: 0, activeDays: 0 };

  let longest = 1;
  let run = 1;
  for (let index = 1; index < days.length; index += 1) {
    if (dayNumber(days[index - 1]) - dayNumber(days[index]) === 1) {
      run += 1;
      longest = Math.max(longest, run);
    } else {
      run = 1;
    }
  }

  const distanceFromToday = dayNumber(dateKey(now)) - dayNumber(days[0]);
  let current = distanceFromToday <= 1 ? 1 : 0;
  if (current) {
    for (let index = 1; index < days.length; index += 1) {
      if (dayNumber(days[index - 1]) - dayNumber(days[index]) !== 1) break;
      current += 1;
    }
  }
  return { current, longest, activeDays: days.length };
}

export function calculateProgress({
  passedLessons,
  arenaWins,
  activityDates,
}: {
  passedLessons: number;
  arenaWins: number;
  activityDates: Array<string | null | undefined>;
}) {
  const streak = calculateStreak(activityDates);
  const totalXp = passedLessons * 100 + arenaWins * 100;
  return {
    totalXp,
    level: Math.floor(totalXp / 500) + 1,
    currentStreak: streak.current,
    longestStreak: streak.longest,
    activeDays: streak.activeDays,
  };
}

export function lessonCompletionDates(
  passedStates: Array<{ track_id: string; lesson_key: string; passed_at: string | null }>,
  passedEvaluations: Array<{
    created_at: string;
    attempts: { track_id: string; lesson_key: string } | Array<{ track_id: string; lesson_key: string }>;
  }>,
) {
  const earliestEvaluation = new Map<string, string>();
  for (const evaluation of passedEvaluations) {
    const attempt = Array.isArray(evaluation.attempts) ? evaluation.attempts[0] : evaluation.attempts;
    if (!attempt) continue;
    const key = `${attempt.track_id}/${attempt.lesson_key}`;
    const current = earliestEvaluation.get(key);
    if (!current || new Date(evaluation.created_at).getTime() < new Date(current).getTime()) {
      earliestEvaluation.set(key, evaluation.created_at);
    }
  }
  return passedStates.map((state) => earliestEvaluation.get(`${state.track_id}/${state.lesson_key}`) ?? state.passed_at);
}
