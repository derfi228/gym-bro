import type { Exercise, MuscleId, MuscleLoad } from "@shared/types";
import { demoExercises, exerciseById, exercisesFor } from "./demo";
import {
  landmarks,
  muscleIds,
  report,
  SESSION_SHARE,
  type SetsByMuscle,
} from "./landmarks";
import type { Program, ProgramSlot } from "./store";

export * from "./landmarks";

/* ── Вклад упражнения в объём группы ──────────────────────────────────────── */

/**
 * Сколько подходов засчитывается группе за один подход упражнения.
 * Целевая мышца — полный подход, ощутимо вовлечённая — половина.
 * Так объём считают в практике планирования: прямая работа против косвенной.
 */
export function contribution(ex: Exercise, m: MuscleId): number {
  const v = ex.involvement[m];
  if (v === undefined) return 0;
  if (m === ex.primary || v >= 0.85) return 1;
  if (v >= 0.3) return 0.5;
  return 0;
}

/** Объём, который даёт набор слотов программы */
export function slotsSets(slots: ProgramSlot[]): SetsByMuscle {
  const out: SetsByMuscle = {};
  for (const s of slots) {
    const ex = exerciseById(s.exerciseId);
    for (const m of muscleIds) {
      const c = contribution(ex, m);
      if (c > 0) out[m] = (out[m] ?? 0) + s.sets * c;
    }
  }
  return out;
}

export const programSets = (p: Program): SetsByMuscle => slotsSets(p.slots);

/** Недельный объём плюс то, что добавит программа */
export function withWeek(sets: SetsByMuscle, loads: MuscleLoad[]): SetsByMuscle {
  const out: SetsByMuscle = { ...sets };
  for (const l of loads) out[l.muscleId] = (out[l.muscleId] ?? 0) + l.setsDone;
  return out;
}

/* ── Правки к программе ───────────────────────────────────────────────────── */

export type FixKind = "add" | "reduce";

export interface Fix {
  id: string;
  kind: FixKind;
  muscleId: MuscleId;
  /** Что показать пользователю */
  text: string;
  /** Упражнение, которое предлагается добавить */
  exerciseId?: string;
  /** Сколько подходов добавить или снять */
  sets: number;
  /** Слот, у которого предлагается срезать подходы */
  slotKey?: string;
}

/**
 * Разбор программы: чего не хватает и где перебор.
 *
 * Считается недельный итог — уже сделанное плюс то, что даст программа.
 * Сравнивать одну тренировку с недельным диапазоном нельзя: столько подходов
 * на каждую группу за раз не делают.
 *
 * Пропущенные группы идут первыми — они дороже всего обходятся.
 */
export function fixesFor(
  program: Program,
  opts: { avoid?: MuscleId[]; only?: MuscleId[]; week?: MuscleLoad[] } = {}
): Fix[] {
  const own = programSets(program);
  const sets = opts.week ? withWeek(own, opts.week) : own;
  const avoid = new Set(opts.avoid ?? []);
  const only = opts.only ? new Set(opts.only) : null;
  const fixes: Fix[] = [];

  for (const r of report(sets)) {
    const m = r.muscleId;
    if (avoid.has(m)) continue;
    if (only && !only.has(m)) continue;

    if (r.status === "over" || r.status === "high") {
      // Срезаем у слота, который даёт группе больше всего
      const worst = [...program.slots]
        .filter((s) => contribution(exerciseById(s.exerciseId), m) === 1)
        .sort((a, b) => b.sets - a.sets)[0];
      if (!worst || worst.sets <= 1) continue;
      const excess = Math.ceil(r.sets - landmarks[m].mavHigh);
      const cut = Math.min(worst.sets - 1, Math.max(1, excess));
      fixes.push({
        id: `cut-${m}`,
        kind: "reduce",
        muscleId: m,
        slotKey: worst.key,
        sets: cut,
        text: `${r.sets} подходов — выше рабочего диапазона (до ${landmarks[m].mavHigh}). Снять ${cut} у «${exerciseById(worst.exerciseId).name}»`,
      });
      continue;
    }

    if (r.status === "none" || r.status === "low") {
      const best = exercisesFor(m).find(
        (e) => !program.slots.some((s) => s.exerciseId === e.id)
      );
      if (!best) continue;
      const need = Math.max(1, Math.ceil((landmarks[m].mavLow - r.sets) / 2));
      fixes.push({
        id: `add-${m}`,
        kind: "add",
        muscleId: m,
        exerciseId: best.id,
        sets: Math.min(4, need),
        text:
          r.status === "none"
            ? `За неделю ни одного подхода. Добавить «${best.name}»`
            : `За неделю ${r.sets} — ниже минимума в ${landmarks[m].mev}. Добавить «${best.name}»`,
      });
    }
  }

  // Перегруз внутри одной тренировки: за раз столько подходов не усваивается
  for (const r of report(own, SESSION_SHARE)) {
    const m = r.muscleId;
    if (avoid.has(m) || (only && !only.has(m))) continue;
    if (r.status !== "over" && r.status !== "high") continue;
    if (fixes.some((f) => f.muscleId === m && f.kind === "reduce")) continue;

    const worst = [...program.slots]
      .filter((s) => contribution(exerciseById(s.exerciseId), m) === 1)
      .sort((a, b) => b.sets - a.sets)[0];
    if (!worst || worst.sets <= 1) continue;

    const ceiling = landmarks[m].mavHigh * SESSION_SHARE;
    const cut = Math.min(worst.sets - 1, Math.max(1, Math.ceil(r.sets - ceiling)));
    fixes.push({
      id: `session-${m}`,
      kind: "reduce",
      muscleId: m,
      slotKey: worst.key,
      sets: cut,
      text: `${r.sets} подходов за одну тренировку — много для группы. Снять ${cut} у «${exerciseById(worst.exerciseId).name}»`,
    });
  }

  // Перебор важнее недобора, пустая группа важнее просевшей
  const weight = (f: Fix) => (f.kind === "reduce" ? 0 : f.sets >= 4 ? 1 : 2);
  return fixes.sort((a, b) => weight(a) - weight(b)).slice(0, 6);
}

/** Упражнения, которых ещё нет в программе, для добавления вручную */
export function candidatesFor(program: Program, m: MuscleId): Exercise[] {
  const used = new Set(program.slots.map((s) => s.exerciseId));
  return exercisesFor(m).filter((e) => !used.has(e.id));
}

/** Все группы, которые вообще затрагивает упражнение */
export const musclesOf = (ex: Exercise): MuscleId[] =>
  muscleIds.filter((m) => contribution(ex, m) > 0);

/** Сколько групп в каталоге вообще имеет упражнения — для подписи охвата */
export const coveredMuscles = new Set(demoExercises.map((e) => e.primary));
