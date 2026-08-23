/**
 * Перевод между таблицами и состоянием приложения. Без React — здесь легко
 * ошибиться в неделе или потерять подходы, поэтому логика проверяется отдельно.
 */

import type { ExerciseWeights, MuscleLoad } from "@shared/types";
import { demoExercises } from "./demo";
import { contribution, muscleIds, targetSets } from "./volume";
import type { Program, ProgramSlot } from "./store";

const byId = new Map(demoExercises.map((e) => [e.id, e]));

/* ── Неделя ───────────────────────────────────────────────────────────────── */

/**
 * Понедельник текущей недели, местное время. Объём считается по неделям, и
 * граница должна совпадать с той, что человек видит в календаре.
 */
export function weekStart(now: Date = new Date()): Date {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  // getDay(): 0 — воскресенье. Сдвигаем так, чтобы 0 стал понедельником
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

/* ── Личные веса ──────────────────────────────────────────────────────────── */

export type WeightRow = {
  exercise_id: string;
  peak_kg: number | null;
  working_kg: number | null;
};

export const weightsFrom = (
  rows: WeightRow[],
): Record<string, ExerciseWeights> =>
  Object.fromEntries(
    rows.map((r) => [
      r.exercise_id,
      {
        exerciseId: r.exercise_id,
        peakKg: r.peak_kg ?? undefined,
        workingKg: r.working_kg ?? undefined,
      },
    ]),
  );

export const weightToRow = (userId: string, w: ExerciseWeights) => ({
  user_id: userId,
  exercise_id: w.exerciseId,
  // undefined в запросе PostgREST пропустит, а очистить поле надо явно
  peak_kg: w.peakKg ?? null,
  working_kg: w.workingKg ?? null,
});

/* ── Недельный объём из выполненных подходов ──────────────────────────────── */

export type SetRow = { exercise_id: string };

/**
 * Сколько подходов набрала каждая группа. Целевая мышца получает подход
 * целиком, ощутимо вовлечённая — половину, как и во всех остальных расчётах.
 *
 * Упражнения, которых больше нет в каталоге, пропускаются: каталог живёт в
 * коде и может измениться, а старые записи в базе остаются.
 */
export function loadsFrom(rows: SetRow[]): MuscleLoad[] {
  const done = new Map<string, number>();
  for (const r of rows) {
    const ex = byId.get(r.exercise_id);
    if (!ex) continue;
    for (const m of muscleIds) {
      const c = contribution(ex, m);
      if (c > 0) done.set(m, (done.get(m) ?? 0) + c);
    }
  }
  return muscleIds.map((muscleId) => {
    const setsDone = done.get(muscleId) ?? 0;
    const setsTarget = targetSets(muscleId);
    return { muscleId, setsDone, setsTarget, ratio: setsDone / setsTarget };
  });
}

/* ── Свои тренировки ──────────────────────────────────────────────────────── */

export type ProgramRow = {
  id: string;
  name: string;
  target_min: number;
  slots: ProgramSlot[];
  ai_generated: boolean;
  note: string | null;
};

export const programFrom = (r: ProgramRow): Program => ({
  id: r.id,
  name: r.name,
  targetMin: r.target_min,
  slots: Array.isArray(r.slots) ? r.slots : [],
  aiGenerated: r.ai_generated,
  note: r.note ?? undefined,
});

/**
 * В базу уходят только собранные пользователем. Заготовки GymBro живут в коде,
 * одинаковы у всех и в базе им делать нечего.
 */
export const programToRow = (userId: string, p: Program) => ({
  id: p.id,
  user_id: userId,
  name: p.name,
  target_min: p.targetMin,
  slots: p.slots,
  ai_generated: p.aiGenerated,
  note: p.note ?? null,
});

/**
 * Идентификатор программы должен быть uuid — в базе такой тип у ключа.
 * Программы, собранные до подключения базы, имеют вид «prog-<время>-<число>»
 * и в базу не поедут, поэтому при создании берётся uuid.
 */
export const isUuid = (id: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

export const newId = (): string =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : // Запасной вариант для окружений без crypto: годится, потому что
      // столкновение проверяет сама база уникальностью ключа
      "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
      });
