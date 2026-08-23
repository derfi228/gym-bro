/** Состояние идущей тренировки. Без React — чтобы логика проверялась отдельно. */

export type SessionSlot = {
  exerciseId: string;
  sets: number;
  rest: number;
  reps?: string;
};

export type Session = {
  name: string;
  slots: SessionSlot[];
  /** Текущее упражнение */
  index: number;
  /** Сделано подходов в текущем упражнении */
  doneSets: number;
  startedAt: number;
  /** Момент окончания отдыха, null — отдых не идёт */
  restEnds: number | null;
  /** Момент постановки на паузу. Часы и отдых сдвигаются при снятии */
  pausedAt: number | null;
};

/** Отсчёт перед первым подходом, мс */
export const COUNTDOWN = 3000;

export const startSession = (
  name: string,
  slots: SessionSlot[],
  now = Date.now(),
): Session => ({
  name,
  slots,
  index: 0,
  doneSets: 0,
  // Часы включаются после отсчёта, поэтому старт сдвинут вперёд
  startedAt: now + COUNTDOWN,
  restEnds: null,
  pausedAt: null,
});

/** Секунд до начала: 0 — отсчёт кончился */
export const countdownLeft = (s: Session, now = Date.now()) =>
  Math.max(0, Math.ceil((s.startedAt - clock(s, now)) / 1000));

/** Отметить подход: запускает отдых, а по исчерпании подходов — следующее упражнение */
export function completeSet(s: Session, now = Date.now()): Session {
  const slot = s.slots[s.index];
  if (!slot) return s;
  const doneSets = s.doneSets + 1;
  const withRest = { ...s, restEnds: now + slot.rest * 1000 };
  return doneSets >= slot.sets
    ? { ...withRest, index: s.index + 1, doneSets: 0 }
    : { ...withRest, doneSets };
}

export const pause = (s: Session, now = Date.now()): Session =>
  s.pausedAt ? s : { ...s, pausedAt: now };

/** Снятие с паузы: время простоя переносится вперёд, ничего не «сгорает» */
export function resume(s: Session, now = Date.now()): Session {
  if (!s.pausedAt) return s;
  const idle = now - s.pausedAt;
  return {
    ...s,
    pausedAt: null,
    startedAt: s.startedAt + idle,
    restEnds: s.restEnds === null ? null : s.restEnds + idle,
  };
}

/** «Сейчас» с учётом паузы: на паузе время стоит */
export const clock = (s: Session, now = Date.now()) => s.pausedAt ?? now;

export const isDone = (s: Session) => s.index >= s.slots.length;

export const mmss = (sec: number) => {
  const t = Math.max(0, Math.floor(sec));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
};

/* ── Рабочий вес ──────────────────────────────────────────────────────────── */

/** Нижняя граница диапазона повторов: «8–10» → 8 */
export const lowReps = (reps?: string) => Number(reps?.match(/\d+/)?.[0]) || 10;

const toPlate = (kg: number) => Math.max(2.5, Math.round(kg / 2.5) * 2.5);

/**
 * Рекомендуемый вес. Рабочий берётся как есть; если задан только разовый
 * максимум — пересчёт по формуле Эпли под нужное число повторов.
 * Ничего не задано — рекомендации нет, число не выдумываем.
 */
export function suggestKg(
  w: { peakKg?: number; workingKg?: number } | undefined,
  reps: number,
): number | null {
  if (w?.workingKg) return w.workingKg;
  if (w?.peakKg) return toPlate(w.peakKg / (1 + reps / 30));
  return null;
}

export type Feedback = "easy" | "ok" | "hard" | "failed";

export const feedbackLabels: Record<Feedback, string> = {
  easy: "Легко",
  ok: "В самый раз",
  hard: "Тяжело",
  failed: "Не доделал",
};

/**
 * Насколько подвинуть рабочий вес после подхода.
 * ponytail: линейный шаг 2.5 кг — блин с каждой стороны. Нормальная
 * прогрессия смотрит на историю подходов, заводить её до бэкенда незачем.
 */
export const feedbackDelta: Record<Feedback, number> = {
  easy: 2.5,
  ok: 0,
  hard: -2.5,
  failed: -5,
};

/** Новый рабочий вес после ответа. null — двигать нечего */
export function adjustKg(current: number | null, f: Feedback): number | null {
  if (current === null) return null;
  return Math.max(2.5, current + feedbackDelta[f]);
}
