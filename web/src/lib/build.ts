/**
 * Сборка тренировки под заданное время. Без React — чтобы логику можно было
 * прогнать отдельно, без сборки приложения.
 */

import type { Exercise, MuscleId, MuscleLoad } from "@shared/types";
import { demoExercises, exerciseById } from "./demo";
import { contribution, landmarks, muscleIds } from "./volume";
import type { Program, ProgramSlot } from "./store";

/** Минуты на упражнение: подходы × (работа + отдых) */
export const slotCost = (s: ProgramSlot) => (s.sets * (40 + s.rest)) / 60;

export const programMinutes = (p: Program) =>
  Math.round(p.slots.reduce((sum, s) => sum + slotCost(s), 0));

const restFor = (difficulty: string) =>
  difficulty === "high" ? 150 : difficulty === "medium" ? 90 : 60;

const repsFor = (muscle: MuscleId) =>
  muscle === "abs" || muscle === "obliques" || muscle === "calves"
    ? "12–15"
    : "8–10";

export const slotOf = (
  exerciseId: string,
  sets: number,
  key: string,
): ProgramSlot => {
  const ex = exerciseById(exerciseId);
  return {
    key,
    exerciseId,
    sets,
    reps: repsFor(ex.primary),
    rest: restFor(ex.difficulty),
  };
};

/* ── Порядок упражнений внутри тренировки ─────────────────────────────────── */

/**
 * Очередь групп: крупные раньше мелких, пресс и икры — в конец.
 * Порядок общепринятый в планировании: базовые движения делаются свежими,
 * а мелкие группы не выключаются раньше, чем понадобятся как помощники.
 */
const tier: Record<MuscleId, number> = {
  quads: 0,
  hamstrings: 0,
  glutes: 0,
  back: 0,
  chest: 0,
  delts: 1,
  traps: 1,
  triceps: 1,
  biceps: 1,
  forearms: 1,
  abs: 2,
  obliques: 2,
  calves: 2,
};

/**
 * Базовое движение: заметно грузит хотя бы три группы. Порог 0.4 отсекает
 * попутные мышцы — по этому признаку в базовые попадают присед, тяга, жим,
 * подтягивания и переноска, а планка и сгибания на бицепс не попадают.
 */
const isCompound = (ex: Exercise) =>
  Object.values(ex.involvement).filter((v) => v >= 0.4).length >= 3;

/** Чем меньше, тем раньше упражнение в тренировке */
export const orderRank = (ex: Exercise) => (isCompound(ex) ? 0 : 3) + tier[ex.primary];

/**
 * Подпись движения: группы, которые оно грузит почти по максимуму. У приседа
 * это «ягодицы + квадрицепс», и по ней в каталоге сходятся присед со штангой,
 * болгарский и присед на спине — то есть одно движение, заведённое под разные
 * целевые группы. Два таких в тренировке не нужны.
 *
 * Подпись из одной группы ничего не значит: жим лёжа и бабочка тоже «грудь»,
 * но это разные упражнения. Поэтому проверяются только составные подписи.
 *
 * ponytail: подпись ловит только совпадение по нагрузке. Румынская тяга и
 * наклоны со штангой — оба наклона на бицепс бедра, но подпись у них одна
 * группа, и в одну тренировку они попадут вместе. Чтобы различать наклон,
 * присед и сгибание, в каталоге нужно поле с типом движения — это правка
 * данных на 62 упражнения, не алгоритма.
 */
const pattern = (ex: Exercise): string | null => {
  const heavy = muscleIds.filter((m) => (ex.involvement[m] ?? 0) >= 0.8);
  return heavy.length >= 2 ? heavy.join("+") : null;
};

/** Больше двух упражнений на группу за тренировку — уже перекос */
const MAX_PER_MUSCLE = 2;

/** Базовое движение ценнее изоляции с тем же недобором, но не любой ценой */
const COMPOUND_WEIGHT = 2;

/**
 * Насколько прямая работа важнее попутной. Без этого группа, которую только
 * задевают (икры в приседе), никогда не получит своего упражнения, даже если
 * она самая пустая за неделю.
 */
const DIRECT_WEIGHT = 2;

/** Потолок подходов: остаток времени идёт сюда, а не в девятое упражнение */
const MAX_SETS = 5;

/** Дальше тренировка перестаёт помещаться в разумное время */
const MAX_SLOTS = 8;

/**
 * Собирает программу под заданное время.
 *
 * На каждом шаге берётся упражнение, которое закрывает больше всего недобора
 * за минуту работы. Многосуставные выигрывают сами собой: присед закрывает
 * квадрицепс, ягодицы и бицепс бедра одним слотом, поэтому тренировка выходит
 * связной, а не набором изолированных движений. В конце слоты выстраиваются
 * по порядку выполнения — базовые вперёд, пресс и икры в конец.
 */
export function buildProgram(
  minutes: number,
  loads: MuscleLoad[],
  opts: { avoid?: MuscleId[]; name?: string; note?: string } = {},
): Program {
  const avoid = new Set(opts.avoid ?? []);
  const done = new Map(loads.map((l) => [l.muscleId, l.setsDone]));

  // Сколько подходов группа наберёт с учётом уже добавленных упражнений
  const planned = new Map<MuscleId, number>();
  const gained = (m: MuscleId) => (done.get(m) ?? 0) + (planned.get(m) ?? 0);

  /** Насколько группа не добрана: 1 — пусто, 0 — норма уже есть */
  const deficit = (m: MuscleId) => {
    if (avoid.has(m)) return 0;
    const need = landmarks[m].mavLow;
    return Math.max(0, (need - gained(m)) / need);
  };

  const slots: ProgramSlot[] = [];
  const used = new Set<string>();
  const patterns = new Set<string>();
  const perMuscle = new Map<MuscleId, number>();
  let spent = 0;

  for (let round = 0; round < MAX_SLOTS; round++) {
    let best: ProgramSlot | null = null;
    let bestScore = 0;

    for (const ex of demoExercises) {
      if (used.has(ex.id) || avoid.has(ex.primary)) continue;
      if ((perMuscle.get(ex.primary) ?? 0) >= MAX_PER_MUSCLE) continue;
      const pat = pattern(ex);
      if (pat !== null && patterns.has(pat)) continue;

      // Целевая группа идёт полностью, ощутимо вовлечённые — половинками
      let value = deficit(ex.primary) * DIRECT_WEIGHT;
      for (const m of muscleIds)
        if (m !== ex.primary) value += deficit(m) * contribution(ex, m);
      if (value <= 0) continue;

      const sets = gained(ex.primary) < landmarks[ex.primary].mev / 2 ? 4 : 3;
      const slot = slotOf(ex.id, sets, `${ex.primary}-${slots.length}`);
      const cost = slotCost(slot);
      if (spent + cost > minutes) continue;

      // Базовые вперёд: одно такое движение закрывает недобор сразу у трёх
      // групп. Множитель, а не надбавка — иначе второй присед обгоняет
      // изоляцию на пустую группу, хотя ноги уже забиты
      const score = value * (isCompound(ex) ? COMPOUND_WEIGHT : 1);
      if (score > bestScore) {
        bestScore = score;
        best = slot;
      }
    }

    if (!best) break;

    const ex = exerciseById(best.exerciseId);
    slots.push(best);
    used.add(ex.id);
    const chosenPattern = pattern(ex);
    if (chosenPattern !== null) patterns.add(chosenPattern);
    perMuscle.set(ex.primary, (perMuscle.get(ex.primary) ?? 0) + 1);
    spent += slotCost(best);
    for (const m of muscleIds) {
      const c = contribution(ex, m);
      if (c > 0) planned.set(m, (planned.get(m) ?? 0) + best.sets * c);
    }
  }

  // Остаток времени — в подходы уже выбранных движений: так тренировка
  // остаётся связной, а объём набирается там, где он нужнее
  for (let pass = 0; pass < MAX_SETS; pass++) {
    let grew = false;
    for (const s of slots) {
      const step = (40 + s.rest) / 60;
      if (s.sets >= MAX_SETS || spent + step > minutes) continue;
      s.sets += 1;
      spent += step;
      grew = true;
    }
    if (!grew) break;
  }

  slots.sort(
    (a, b) =>
      orderRank(exerciseById(a.exerciseId)) -
      orderRank(exerciseById(b.exerciseId)),
  );

  return {
    id: `prog-${Date.now()}-${Math.round(spent)}`,
    name: opts.name ?? `Программа на ${minutes} мин`,
    targetMin: minutes,
    slots,
    aiGenerated: Boolean(opts.note),
    note: opts.note,
  };
}
