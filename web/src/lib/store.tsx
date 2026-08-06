"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type { ExerciseWeights, MuscleId, MuscleLoad } from "@shared/types";
import { demoExercises, exerciseById, exercisesFor, initialLoads } from "./demo";
import { contribution, landmarks, muscleIds, targetSets } from "./volume";

/* ── Модель программы в интерфейсе ────────────────────────────────────────── */

export type ProgramSlot = {
  /** Стабильный ключ слота: упражнение можно заменить, слот остаётся */
  key: string;
  exerciseId: string;
  sets: number;
  reps: string;
  /** Пауза между подходами, сек */
  rest: number;
};

export type Program = {
  id: string;
  name: string;
  targetMin: number;
  slots: ProgramSlot[];
  aiGenerated: boolean;
  /** Чем обоснована программа — заполняет помощник */
  note?: string;
};

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
  key: string
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

/**
 * Собирает программу под заданное время.
 *
 * Группы ранжируются по нехватке недельного объёма относительно целевого;
 * упражнения добираются по кругу, пока хватает времени, и каждое добавление
 * пересчитывает набранный объём — так одна группа не забирает всю тренировку.
 */
export function buildProgram(
  minutes: number,
  loads: MuscleLoad[],
  opts: { avoid?: MuscleId[]; name?: string; note?: string } = {}
): Program {
  const avoid = new Set(opts.avoid ?? []);
  const done = new Map(loads.map((l) => [l.muscleId, l.setsDone]));

  // Сколько подходов группа наберёт с учётом уже добавленных упражнений
  const planned = new Map<MuscleId, number>();
  const gained = (m: MuscleId) => (done.get(m) ?? 0) + (planned.get(m) ?? 0);

  const slots: ProgramSlot[] = [];
  const used = new Set<string>();
  let spent = 0;

  // До 8 упражнений: дальше тренировка перестаёт помещаться в разумное время
  for (let round = 0; round < 8; round++) {
    const next = muscleIds
      .filter((m) => !avoid.has(m) && gained(m) < landmarks[m].mavLow)
      .sort((a, b) => gained(a) / targetSets(a) - gained(b) / targetSets(b));

    let added = false;
    for (const m of next) {
      const best = exercisesFor(m).find((e) => !used.has(e.id));
      if (!best) continue;

      const sets = gained(m) < landmarks[m].mev / 2 ? 4 : 3;
      const slot = slotOf(best.id, sets, `${m}-${slots.length}`);
      if (spent + slotCost(slot) > minutes) continue;

      slots.push(slot);
      used.add(best.id);
      spent += slotCost(slot);
      for (const mm of muscleIds) {
        const c = contribution(best, mm);
        if (c > 0) planned.set(mm, (planned.get(mm) ?? 0) + sets * c);
      }
      added = true;
      break;
    }
    if (!added) break;
  }

  return {
    id: `prog-${Date.now()}-${Math.round(spent)}`,
    name: opts.name ?? `Программа на ${minutes} мин`,
    targetMin: minutes,
    slots,
    aiGenerated: Boolean(opts.note),
    note: opts.note,
  };
}

/* ── Готовые программы ────────────────────────────────────────────────────── */

const slot = (
  exerciseId: string,
  sets: number,
  reps: string,
  rest: number,
  i: number
): ProgramSlot => ({ key: `s${i}`, exerciseId, sets, reps, rest });

const presetPrograms: Program[] = [
  {
    id: "full-body",
    name: "Всё тело",
    targetMin: 55,
    aiGenerated: false,
    slots: [
      slot("back-squat", 4, "8", 150, 0),
      slot("bb-bench", 4, "8", 150, 1),
      slot("incline-row-45", 3, "10", 90, 2),
      slot("db-shoulder-press", 3, "10", 90, 3),
      slot("bicycle-crunch", 3, "15", 45, 4),
    ],
  },
  {
    id: "push",
    name: "Жимовая: грудь, плечи, трицепс",
    targetMin: 45,
    aiGenerated: false,
    slots: [
      slot("bb-bench", 4, "8", 150, 0),
      slot("db-shoulder-press", 3, "10", 90, 1),
      slot("cable-crossover", 3, "12", 60, 2),
      slot("triangle-push-up", 3, "12", 60, 3),
      slot("rope-pushdown", 3, "12", 60, 4),
    ],
  },
  {
    id: "quick",
    name: "Быстрая на 20 минут",
    targetMin: 20,
    aiGenerated: false,
    slots: [
      slot("leg-press", 3, "12", 90, 0),
      slot("bb-bench", 3, "8", 120, 1),
    ],
  },
];

/* ── Контекст ─────────────────────────────────────────────────────────────── */

type Store = {
  loads: MuscleLoad[];
  programs: Program[];
  activeProgramId: string | null;
  restrictions: MuscleId[];
  /** Пиковый и рабочий вес по упражнениям */
  weights: Record<string, ExerciseWeights>;
  setWeight: (
    exerciseId: string,
    field: "peakKg" | "workingKg",
    value: number | undefined
  ) => void;
  /** Отметить выполненный подход: заполняет схему тела */
  logSet: (exerciseId: string) => void;
  swapExercise: (programId: string, slotKey: string, exerciseId: string) => void;
  /** Изменить число подходов в слоте */
  setSlotSets: (programId: string, slotKey: string, sets: number) => void;
  setSlotRest: (programId: string, slotKey: string, rest: number) => void;
  addSlot: (programId: string, exerciseId: string, sets?: number) => void;
  removeSlot: (programId: string, slotKey: string) => void;
  /** Сдвинуть упражнение в порядке выполнения */
  moveSlot: (programId: string, slotKey: string, dir: -1 | 1) => void;
  setProgramDuration: (programId: string, minutes: number) => void;
  addProgram: (p: Program) => void;
  openProgram: (id: string | null) => void;
  addRestriction: (m: MuscleId) => void;
  resetWeek: () => void;
};

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [loads, setLoads] = useState<MuscleLoad[]>(initialLoads);
  const [programs, setPrograms] = useState<Program[]>(presetPrograms);
  const [activeProgramId, setActiveProgramId] = useState<string | null>(null);
  const [restrictions, setRestrictions] = useState<MuscleId[]>([]);
  const [weights, setWeights] = useState<Record<string, ExerciseWeights>>({});

  const setWeight = useCallback(
    (
      exerciseId: string,
      field: "peakKg" | "workingKg",
      value: number | undefined
    ) => {
      setWeights((prev) => ({
        ...prev,
        [exerciseId]: { ...prev[exerciseId], exerciseId, [field]: value },
      }));
    },
    []
  );

  /** Подход добавляет объём целевой мышце и половину — вспомогательным */
  const logSet = useCallback((exerciseId: string) => {
    const ex = demoExercises.find((e) => e.id === exerciseId);
    if (!ex) return;
    setLoads((prev) =>
      prev.map((l) => {
        const delta = contribution(ex, l.muscleId);
        if (delta === 0) return l;
        const setsDone = l.setsDone + delta;
        return { ...l, setsDone, ratio: setsDone / l.setsTarget };
      })
    );
  }, []);

  /** Общая правка слотов программы */
  const editSlots = useCallback(
    (programId: string, fn: (slots: ProgramSlot[]) => ProgramSlot[]) => {
      setPrograms((prev) =>
        prev.map((p) => (p.id === programId ? { ...p, slots: fn(p.slots) } : p))
      );
    },
    []
  );

  const setSlotSets = useCallback(
    (programId: string, slotKey: string, sets: number) => {
      const v = Math.min(10, Math.max(1, Math.round(sets)));
      editSlots(programId, (slots) =>
        slots.map((s) => (s.key === slotKey ? { ...s, sets: v } : s))
      );
    },
    [editSlots]
  );

  const setSlotRest = useCallback(
    (programId: string, slotKey: string, rest: number) => {
      const v = Math.min(300, Math.max(30, Math.round(rest / 15) * 15));
      editSlots(programId, (slots) =>
        slots.map((s) => (s.key === slotKey ? { ...s, rest: v } : s))
      );
    },
    [editSlots]
  );

  const addSlot = useCallback(
    (programId: string, exerciseId: string, sets = 3) => {
      editSlots(programId, (slots) => [
        ...slots,
        slotOf(exerciseId, sets, `s-${Date.now()}-${slots.length}`),
      ]);
    },
    [editSlots]
  );

  const removeSlot = useCallback(
    (programId: string, slotKey: string) => {
      editSlots(programId, (slots) => slots.filter((s) => s.key !== slotKey));
    },
    [editSlots]
  );

  const moveSlot = useCallback(
    (programId: string, slotKey: string, dir: -1 | 1) => {
      editSlots(programId, (slots) => {
        const i = slots.findIndex((s) => s.key === slotKey);
        const j = i + dir;
        if (i < 0 || j < 0 || j >= slots.length) return slots;
        const next = [...slots];
        [next[i], next[j]] = [next[j], next[i]];
        return next;
      });
    },
    [editSlots]
  );

  const swapExercise = useCallback(
    (programId: string, slotKey: string, exerciseId: string) => {
      setPrograms((prev) =>
        prev.map((p) =>
          p.id !== programId
            ? p
            : {
                ...p,
                slots: p.slots.map((s) =>
                  s.key === slotKey ? { ...s, exerciseId } : s
                ),
              }
        )
      );
    },
    []
  );

  /** Меняет ориентир по времени. Упражнения не режутся — это делает пользователь */
  const setProgramDuration = useCallback(
    (programId: string, minutes: number) => {
      setPrograms((prev) =>
        prev.map((p) => (p.id === programId ? { ...p, targetMin: minutes } : p))
      );
    },
    []
  );

  const addProgram = useCallback((p: Program) => {
    setPrograms((prev) => [p, ...prev]);
  }, []);

  const addRestriction = useCallback((m: MuscleId) => {
    setRestrictions((prev) => (prev.includes(m) ? prev : [...prev, m]));
  }, []);

  const resetWeek = useCallback(() => setLoads(initialLoads), []);

  const value = useMemo<Store>(
    () => ({
      loads,
      programs,
      activeProgramId,
      restrictions,
      weights,
      setWeight,
      logSet,
      swapExercise,
      setSlotSets,
      setSlotRest,
      addSlot,
      removeSlot,
      moveSlot,
      setProgramDuration,
      addProgram,
      openProgram: setActiveProgramId,
      addRestriction,
      resetWeek,
    }),
    [
      loads,
      programs,
      activeProgramId,
      restrictions,
      weights,
      setWeight,
      logSet,
      swapExercise,
      setSlotSets,
      setSlotRest,
      addSlot,
      removeSlot,
      moveSlot,
      setProgramDuration,
      addProgram,
      addRestriction,
      resetWeek,
    ]
  );

  return (
    <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore вне StoreProvider");
  return ctx;
}

/** Название упражнения по id — удобный хелпер для интерфейса */
export const nameOf = (id: string) => exerciseById(id).name;
