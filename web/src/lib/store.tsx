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

/**
 * Собирает программу под заданное время.
 * Отстающие мышцы идут первыми, перебранные и запрещённые пропускаются.
 */
export function buildProgram(
  minutes: number,
  loads: MuscleLoad[],
  opts: { avoid?: MuscleId[]; name?: string; note?: string } = {}
): Program {
  const avoid = new Set(opts.avoid ?? []);
  const ranked = [...loads]
    .filter((l) => !avoid.has(l.muscleId) && l.ratio < 1)
    .sort((a, b) => a.ratio - b.ratio);

  const slots: ProgramSlot[] = [];
  let used = 0;

  for (const load of ranked) {
    const best = exercisesFor(load.muscleId)[0];
    if (!best) continue;
    const sets = load.ratio < 0.4 ? 4 : 3;
    const rest = restFor(best.difficulty);
    const cost = (sets * (40 + rest)) / 60;
    if (used + cost > minutes) continue;
    slots.push({
      key: `${load.muscleId}-${slots.length}`,
      exerciseId: best.id,
      sets,
      reps: repsFor(load.muscleId),
      rest,
    });
    used += cost;
  }

  return {
    id: `prog-${Date.now()}-${Math.round(used)}`,
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
        const delta =
          l.muscleId === ex.primary
            ? 1
            : ex.secondary.includes(l.muscleId)
              ? 0.5
              : 0;
        if (delta === 0) return l;
        const setsDone = l.setsDone + delta;
        return { ...l, setsDone, ratio: setsDone / l.setsTarget };
      })
    );
  }, []);

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

  /** Меняет длительность: режет лишние слоты или добирает по объёму */
  const setProgramDuration = useCallback(
    (programId: string, minutes: number) => {
      setPrograms((prev) =>
        prev.map((p) => {
          if (p.id !== programId) return p;
          const kept: ProgramSlot[] = [];
          let used = 0;
          for (const s of p.slots) {
            if (used + slotCost(s) > minutes) continue;
            kept.push(s);
            used += slotCost(s);
          }
          return { ...p, targetMin: minutes, slots: kept };
        })
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
