import type { MuscleId } from "@shared/types";

/**
 * Недельный объём в подходах на мышечную группу.
 *
 * Ориентиры MEV / MAV / MRV — из «Scientific Principles of Hypertrophy
 * Training» (Israetel и др.). Нижняя граница согласуется с дозозависимой
 * мета-аналитикой: Schoenfeld, Ogborn, Krieger 2017 и систематический обзор
 * Baz-Valle и др. 2022 — прирост растёт до примерно 10 подходов в неделю на
 * группу, дальше эффект есть, но затухает.
 *
 * Ссылки — в README. Цифры описывают диапазон для среднего человека, а не
 * норму: индивидуальная переносимость объёма различается в разы.
 */
export interface VolumeLandmark {
  /** Минимальный объём, ниже которого роста практически нет */
  mev: number;
  /** Нижняя граница рабочего диапазона */
  mavLow: number;
  /** Верхняя граница рабочего диапазона */
  mavHigh: number;
  /** Потолок: выше него восстановление обычно не успевает */
  mrv: number;
  /** Насколько цифра подкреплена: meta — есть мета-анализ, model — только ориентиры */
  basis: "meta" | "model";
}

export const landmarks: Record<MuscleId, VolumeLandmark> = {
  chest: { mev: 10, mavLow: 12, mavHigh: 20, mrv: 22, basis: "meta" },
  back: { mev: 10, mavLow: 14, mavHigh: 22, mrv: 25, basis: "meta" },
  delts: { mev: 8, mavLow: 16, mavHigh: 22, mrv: 26, basis: "model" },
  traps: { mev: 4, mavLow: 12, mavHigh: 20, mrv: 26, basis: "model" },
  biceps: { mev: 8, mavLow: 14, mavHigh: 20, mrv: 26, basis: "meta" },
  triceps: { mev: 6, mavLow: 10, mavHigh: 14, mrv: 18, basis: "meta" },
  forearms: { mev: 2, mavLow: 8, mavHigh: 16, mrv: 20, basis: "model" },
  abs: { mev: 0, mavLow: 16, mavHigh: 20, mrv: 25, basis: "model" },
  obliques: { mev: 0, mavLow: 8, mavHigh: 12, mrv: 16, basis: "model" },
  glutes: { mev: 4, mavLow: 8, mavHigh: 12, mrv: 16, basis: "model" },
  quads: { mev: 8, mavLow: 12, mavHigh: 18, mrv: 20, basis: "meta" },
  hamstrings: { mev: 4, mavLow: 10, mavHigh: 16, mrv: 20, basis: "meta" },
  calves: { mev: 8, mavLow: 12, mavHigh: 16, mrv: 20, basis: "model" },
};

/** Целевой объём — середина рабочего диапазона */
export const targetSets = (m: MuscleId): number => {
  const l = landmarks[m];
  return Math.round((l.mavLow + l.mavHigh) / 2);
};

export const muscleIds = Object.keys(landmarks) as MuscleId[];

/** Подходы за неделю по группам */
export type SetsByMuscle = Partial<Record<MuscleId, number>>;

/* ── Статус группы ────────────────────────────────────────────────────────── */

export type MuscleStatus = "none" | "low" | "optimal" | "high" | "over";

export const statusLabels: Record<MuscleStatus, string> = {
  none: "Не затронута",
  low: "Мало",
  optimal: "В диапазоне",
  high: "Много",
  over: "Перебор",
};

/**
 * Доля недельного диапазона, которая приходится на одну тренировку.
 * Группу обычно нагружают дважды в неделю — при равном объёме такая частота
 * даёт больше прироста, чем один раз: Schoenfeld и др., 2016.
 */
export const SESSION_SHARE = 0.5;

/**
 * Статус группы. `scale` — доля недельного диапазона, с которой сравниваем:
 * 1 для недели, SESSION_SHARE для одной тренировки.
 */
export function statusOf(m: MuscleId, sets: number, scale = 1): MuscleStatus {
  const l = landmarks[m];
  if (sets <= 0) return "none";
  if (sets < Math.max(l.mev * scale, 1)) return "low";
  if (sets <= l.mavHigh * scale) return "optimal";
  if (sets <= l.mrv * scale) return "high";
  return "over";
}

/** Заполненность 0..1+ для отрисовки: 1 — верх рабочего диапазона */
export const fillOf = (m: MuscleId, sets: number, scale = 1) =>
  sets / (landmarks[m].mavHigh * scale);

export interface MuscleReport {
  muscleId: MuscleId;
  sets: number;
  target: number;
  status: MuscleStatus;
  fill: number;
}

export function report(sets: SetsByMuscle, scale = 1): MuscleReport[] {
  return muscleIds.map((m) => {
    const s = Math.round((sets[m] ?? 0) * 10) / 10;
    return {
      muscleId: m,
      sets: s,
      target: Math.round(targetSets(m) * scale),
      status: statusOf(m, s, scale),
      fill: fillOf(m, s, scale),
    };
  });
}

/** Значения 0..1+ для схемы тела */
export const fillValues = (
  sets: SetsByMuscle,
  scale = 1,
): Partial<Record<MuscleId, number>> =>
  Object.fromEntries(muscleIds.map((m) => [m, fillOf(m, sets[m] ?? 0, scale)]));

export const statusValues = (
  sets: SetsByMuscle,
  scale = 1,
): Partial<Record<MuscleId, MuscleStatus>> =>
  Object.fromEntries(
    muscleIds.map((m) => [m, statusOf(m, sets[m] ?? 0, scale)]),
  );
