"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type { ExerciseWeights, MuscleId, MuscleLoad } from "@shared/types";
import {
  demoExercises,
  exerciseById,
  initialLoads,
} from "./demo";
import { contribution } from "./volume";
import * as sess from "./session";
export type { Session } from "./session";
export {
  clock,
  countdownLeft,
  feedbackLabels,
  isDone,
  lowReps,
  mmss,
  suggestKg,
  type Feedback,
} from "./session";
import { slotCost, slotOf } from "./build";
export {
  buildProgram,
  programMinutes,
  slotCost,
  slotOf,
} from "./build";

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
  /**
   * Заготовка от GymBro. Её можно менять частично: упражнение заменяется на
   * другое для той же группы, остальное — только через копию.
   * У пользовательских программ поля нет.
   */
  builtIn?: boolean;
  /**
   * Оценка программы моделью. Модели пока нет, поле не заполняется —
   * интерфейс показывает прочерк, а не выдуманное число.
   */
  aiScore?: number;
};

/** Ключ замены упражнения внутри дня методики */
export const splitSlotKey = (
  splitId: string,
  dayName: string,
  exerciseId: string,
) => `${splitId}|${dayName}|${exerciseId}`;

/** Набор упражнений, из которого пользователь собирает свою тренировку */
export type PickerState = {
  active: boolean;
  name: string;
  picked: string[];
};

const emptyPicker: PickerState = { active: false, name: "", picked: [] };

/* ── Готовые программы ────────────────────────────────────────────────────── */

const slot = (
  exerciseId: string,
  sets: number,
  reps: string,
  rest: number,
  i: number,
): ProgramSlot => ({ key: `s${i}`, exerciseId, sets, reps, rest });

const presetPrograms: Program[] = [
  {
    id: "full-body",
    name: "Всё тело",
    targetMin: 55,
    aiGenerated: false,
    builtIn: true,
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
    builtIn: true,
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
    builtIn: true,
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
    value: number | undefined,
  ) => void;
  /** Отметить выполненный подход: заполняет схему тела */
  logSet: (exerciseId: string) => void;
  swapExercise: (
    programId: string,
    slotKey: string,
    exerciseId: string,
  ) => void;
  /** Изменить число подходов в слоте */
  setSlotSets: (programId: string, slotKey: string, sets: number) => void;
  setSlotRest: (programId: string, slotKey: string, rest: number) => void;
  addSlot: (programId: string, exerciseId: string, sets?: number) => void;
  removeSlot: (programId: string, slotKey: string) => void;
  /** Сдвинуть упражнение в порядке выполнения */
  moveSlot: (programId: string, slotKey: string, dir: -1 | 1) => void;
  setProgramDuration: (programId: string, minutes: number) => void;
  addProgram: (p: Program) => void;
  removeProgram: (id: string) => void;
  /** Замены упражнений внутри методик, по ключу splitSlotKey */
  splitSwaps: Record<string, string>;
  swapSplitExercise: (key: string, exerciseId: string) => void;
  /** Идущая тренировка. null — режим выключен */
  session: sess.Session | null;
  startSession: (name: string, slots: ProgramSlot[]) => void;
  /** Подход с оценкой: правит рабочий вес и двигает тренировку */
  completeSet: (f: sess.Feedback) => void;
  skipRest: () => void;
  /** Заменить текущее упражнение на другое для той же группы */
  swapSessionExercise: (exerciseId: string) => void;
  pauseSession: () => void;
  resumeSession: () => void;
  endSession: () => void;
  /** Сбор своей тренировки во вкладке «Упражнения» */
  picker: PickerState;
  startPicker: () => void;
  cancelPicker: () => void;
  setPickerName: (name: string) => void;
  togglePick: (exerciseId: string) => void;
  clearPicks: () => void;
  /** Создаёт тренировку из отмеченных упражнений, возвращает её id */
  commitPicker: () => string | null;
  /** Возвращает id копии, чтобы её можно было сразу открыть */
  duplicateProgram: (id: string) => string | null;
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
  const [splitSwaps, setSplitSwaps] = useState<Record<string, string>>({});
  const [picker, setPicker] = useState<PickerState>(emptyPicker);
  const [session, setSession] = useState<sess.Session | null>(null);

  const setWeight = useCallback(
    (
      exerciseId: string,
      field: "peakKg" | "workingKg",
      value: number | undefined,
    ) => {
      setWeights((prev) => ({
        ...prev,
        [exerciseId]: { ...prev[exerciseId], exerciseId, [field]: value },
      }));
    },
    [],
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
      }),
    );
  }, []);

  /** Общая правка слотов программы */
  const editSlots = useCallback(
    (programId: string, fn: (slots: ProgramSlot[]) => ProgramSlot[]) => {
      setPrograms((prev) =>
        prev.map((p) =>
          p.id !== programId || p.builtIn ? p : { ...p, slots: fn(p.slots) },
        ),
      );
    },
    [],
  );

  const setSlotSets = useCallback(
    (programId: string, slotKey: string, sets: number) => {
      const v = Math.min(10, Math.max(1, Math.round(sets)));
      editSlots(programId, (slots) =>
        slots.map((s) => (s.key === slotKey ? { ...s, sets: v } : s)),
      );
    },
    [editSlots],
  );

  const setSlotRest = useCallback(
    (programId: string, slotKey: string, rest: number) => {
      const v = Math.min(300, Math.max(30, Math.round(rest / 15) * 15));
      editSlots(programId, (slots) =>
        slots.map((s) => (s.key === slotKey ? { ...s, rest: v } : s)),
      );
    },
    [editSlots],
  );

  const addSlot = useCallback(
    (programId: string, exerciseId: string, sets = 3) => {
      editSlots(programId, (slots) => [
        ...slots,
        slotOf(exerciseId, sets, `s-${Date.now()}-${slots.length}`),
      ]);
    },
    [editSlots],
  );

  const removeSlot = useCallback(
    (programId: string, slotKey: string) => {
      editSlots(programId, (slots) => slots.filter((s) => s.key !== slotKey));
    },
    [editSlots],
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
    [editSlots],
  );

  /**
   * Замена упражнения. Во встроенной тренировке допустима только на упражнение
   * той же целевой группы — иначе от заготовки ничего не остаётся.
   */
  const swapExercise = useCallback(
    (programId: string, slotKey: string, exerciseId: string) => {
      setPrograms((prev) =>
        prev.map((p) => {
          if (p.id !== programId) return p;
          return {
            ...p,
            slots: p.slots.map((s) => {
              if (s.key !== slotKey) return s;
              const sameGroup =
                exerciseById(exerciseId).primary ===
                exerciseById(s.exerciseId).primary;
              if (p.builtIn && !sameGroup) return s;
              return { ...s, exerciseId };
            }),
          };
        }),
      );
    },
    [],
  );

  /** Меняет ориентир по времени. Упражнения не режутся — это делает пользователь */
  const setProgramDuration = useCallback(
    (programId: string, minutes: number) => {
      setPrograms((prev) =>
        prev.map((p) =>
          p.id !== programId || p.builtIn ? p : { ...p, targetMin: minutes },
        ),
      );
    },
    [],
  );

  const addProgram = useCallback((p: Program) => {
    setPrograms((prev) => [p, ...prev]);
  }, []);

  /** Удаление целиком. Стартовые пресеты не трогаем */
  const removeProgram = useCallback(
    (id: string) => {
      const target = programs.find((p) => p.id === id);
      if (!target || target.builtIn) return;
      setPrograms((prev) => prev.filter((p) => p.id !== id));
      setActiveProgramId((cur) => (cur === id ? null : cur));
    },
    [programs],
  );

  /**
   * Копия программы. Единственный способ получить редактируемую версию
   * встроенной тренировки: у копии builtIn снят всегда.
   */
  const duplicateProgram = useCallback(
    (id: string) => {
      const src = programs.find((p) => p.id === id);
      if (!src) return null;
      const stamp = Date.now();
      const copy: Program = {
        ...src,
        id: `prog-${stamp}-${src.slots.length}`,
        name: `${src.name} (копия)`,
        builtIn: false,
        slots: src.slots.map((s, i) => ({ ...s, key: `s-${stamp}-${i}` })),
      };
      setPrograms((prev) => [copy, ...prev]);
      return copy.id;
    },
    [programs],
  );

  /** Замена упражнения в дне методики: только на ту же целевую группу */
  const swapSplitExercise = useCallback((key: string, exerciseId: string) => {
    const original = key.split("|")[2];
    if (exerciseById(exerciseId).primary !== exerciseById(original).primary)
      return;
    setSplitSwaps((prev) => ({ ...prev, [key]: exerciseId }));
  }, []);

  const startSession = useCallback((name: string, slots: ProgramSlot[]) => {
    setSession(sess.startSession(name, slots));
  }, []);

  /**
   * Подход засчитывается в недельный объём, оценка двигает рабочий вес,
   * тренировка переходит к отдыху.
   */
  const completeSet = useCallback(
    (f: sess.Feedback) => {
      setSession((s) => {
        if (!s) return s;
        const slot = s.slots[s.index];
        if (!slot) return s;

        logSet(slot.exerciseId);

        const base = sess.suggestKg(
          weights[slot.exerciseId],
          sess.lowReps(slot.reps)
        );
        const next = sess.adjustKg(base, f);
        if (next !== null && next !== weights[slot.exerciseId]?.workingKg)
          setWeight(slot.exerciseId, "workingKg", next);

        return sess.completeSet(s);
      });
    },
    [logSet, setWeight, weights]
  );

  /**
   * Замена на ходу: тренажёр занят, больно, нет снаряда. Группа обязана
   * совпадать — иначе тренировка перестаёт быть той, которую начали.
   * Подходы, повторы и отдых остаются от слота, сделанные подходы не сгорают.
   */
  const swapSessionExercise = useCallback((exerciseId: string) => {
    setSession((s) => {
      if (!s) return s;
      const cur = s.slots[s.index];
      if (!cur || cur.exerciseId === exerciseId) return s;
      if (exerciseById(exerciseId).primary !== exerciseById(cur.exerciseId).primary)
        return s;
      return {
        ...s,
        slots: s.slots.map((sl, i) =>
          i === s.index ? { ...sl, exerciseId } : sl
        ),
      };
    });
  }, []);

  const pauseSession = useCallback(
    () => setSession((s) => (s ? sess.pause(s) : s)),
    []
  );
  const resumeSession = useCallback(
    () => setSession((s) => (s ? sess.resume(s) : s)),
    []
  );

  const skipRest = useCallback(
    () => setSession((s) => (s ? { ...s, restEnds: null } : s)),
    []
  );
  const endSession = useCallback(() => setSession(null), []);

  const startPicker = useCallback(
    () => setPicker({ active: true, name: "", picked: [] }),
    [],
  );
  const cancelPicker = useCallback(() => setPicker(emptyPicker), []);
  const setPickerName = useCallback(
    (name: string) => setPicker((p) => ({ ...p, name })),
    [],
  );
  const togglePick = useCallback((exerciseId: string) => {
    setPicker((p) => ({
      ...p,
      picked: p.picked.includes(exerciseId)
        ? p.picked.filter((id) => id !== exerciseId)
        : [...p.picked, exerciseId],
    }));
  }, []);
  const clearPicks = useCallback(
    () => setPicker((p) => ({ ...p, picked: [] })),
    [],
  );

  const commitPicker = useCallback(() => {
    if (picker.picked.length === 0) return null;
    const stamp = Date.now();
    const slots = picker.picked.map((id, i) =>
      slotOf(id, 3, `s-${stamp}-${i}`),
    );
    const program: Program = {
      id: `prog-${stamp}-${slots.length}`,
      name: picker.name.trim() || "Своя тренировка",
      targetMin: Math.max(
        10,
        Math.round(slots.reduce((sum, s) => sum + slotCost(s), 0)),
      ),
      slots,
      aiGenerated: false,
    };
    setPrograms((prev) => [program, ...prev]);
    setPicker(emptyPicker);
    return program.id;
  }, [picker]);

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
      removeProgram,
      duplicateProgram,
      splitSwaps,
      swapSplitExercise,
      session,
      startSession,
      completeSet,
      skipRest,
      swapSessionExercise,
      pauseSession,
      resumeSession,
      endSession,
      picker,
      startPicker,
      cancelPicker,
      setPickerName,
      togglePick,
      clearPicks,
      commitPicker,
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
      removeProgram,
      duplicateProgram,
      splitSwaps,
      swapSplitExercise,
      session,
      startSession,
      completeSet,
      skipRest,
      swapSessionExercise,
      pauseSession,
      resumeSession,
      endSession,
      picker,
      startPicker,
      cancelPicker,
      setPickerName,
      togglePick,
      clearPicks,
      commitPicker,
      addRestriction,
      resetWeek,
    ],
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
