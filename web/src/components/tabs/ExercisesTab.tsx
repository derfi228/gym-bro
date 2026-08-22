"use client";

import { useMemo, useState } from "react";
import type { Difficulty, MuscleId } from "@shared/types";
import ExerciseDetail from "@/components/ExerciseDetail";
import {
  demoExercises,
  difficultyLabels,
  equipmentLabels,
  evidenceLabels,
  exerciseById,
  muscleNames,
  difficultyPercent,
  orderKey,
  scoreLabel,
} from "@/lib/demo";
import { useStore } from "@/lib/store";

type Filter = MuscleId | "all";
type Sort = "effect" | "difficulty" | "alpha";

const difficultyRank: Record<Difficulty, number> = {
  low: 0,
  medium: 1,
  high: 2,
};
const muscleFilters = Object.keys(muscleNames) as MuscleId[];

const pill = (active: boolean) =>
  `rounded-pill border px-3 py-1 text-[11px] transition-colors ${
    active
      ? "border-accent bg-accent/12 text-accent-hi"
      : "border-line text-dim hover:border-accent-dim hover:text-accent"
  }`;

/** Одна шкала: подпись, полоса, значение справа */
function Scale({
  label,
  percent,
  value,
  warm = false,
}: {
  label: string;
  percent: number | null;
  value: string;
  warm?: boolean;
}) {
  return (
    <span className="flex items-center gap-2.5">
      <span className="w-32 shrink-0 truncate text-[10px] tracking-wide text-dim">
        {label}
      </span>
      <span className={`meter flex-1 ${warm ? "meter-warm" : ""}`}>
        {percent !== null && <span style={{ width: `${percent}%` }} />}
      </span>
      <span
        className={`w-16 shrink-0 text-right text-[10px] ${
          warm ? "text-warm" : "text-dim"
        }`}
      >
        {value}
      </span>
    </span>
  );
}

export default function ExercisesTab({
  onNavigate,
}: {
  onNavigate?: (tab: "body" | "exercises" | "program") => void;
}) {
  const {
    picker,
    togglePick,
    clearPicks,
    setPickerName,
    cancelPicker,
    commitPicker,
    openProgram,
  } = useStore();

  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("effect");
  const [query, setQuery] = useState("");
  const [bodyweight, setBodyweight] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = demoExercises.filter((e) => {
      const byMuscle =
        filter === "all" ||
        e.primary === filter ||
        e.secondary.includes(filter);
      const byName = q === "" || e.name.toLowerCase().includes(q);
      const byEquipment = !bodyweight || e.equipment === "bodyweight";
      return byMuscle && byName && byEquipment;
    });
    return [...filtered].sort((a, b) => {
      if (sort === "alpha") return a.name.localeCompare(b.name, "ru");
      if (sort === "difficulty")
        return (
          difficultyRank[a.difficulty] - difficultyRank[b.difficulty] ||
          orderKey(a) - orderKey(b)
        );
      return orderKey(a) - orderKey(b);
    });
  }, [filter, sort, query, bodyweight]);

  // В режиме сбора карточка не открывается, а отмечается
  const picking = picker.active;

  function confirm() {
    const id = commitPicker();
    if (!id) return;
    openProgram(null);
    onNavigate?.("program");
  }

  if (open && !picking) {
    return (
      <div className="flex flex-col gap-4">
        <button
          onClick={() => setOpen(null)}
          className="btn-ghost self-start px-4 py-1.5 text-[12px]"
        >
          ← Все упражнения
        </button>
        <ExerciseDetail exercise={exerciseById(open)} />
      </div>
    );
  }

  return (
    <div className="stagger flex flex-col gap-4">
      {/* Панель сбора своей тренировки */}
      {picking && (
        <div className="card card-lit sticky top-[60px] z-30 p-4">
          <div className="flex items-center gap-2.5">
            <button
              onClick={clearPicks}
              aria-label="Снять выделение со всех упражнений"
              title="Снять выделение со всех"
              className="stepper shrink-0"
            >
              ×
            </button>

            <input
              value={picker.name}
              onChange={(e) => setPickerName(e.target.value)}
              placeholder="Название программы"
              aria-label="Название программы"
              className="min-w-0 flex-1 rounded-pill border border-line bg-accent/[0.04] px-4 py-2 text-sm text-bright outline-none transition-colors placeholder:text-dim focus:border-accent"
            />

            {/* Место под оценку модели: числа не выдумываем, пока её нет */}
            <span
              className="chip hidden shrink-0 sm:inline-block"
              title="Появится, когда подключим модель"
            >
              Оценка ИИ: —
            </span>

            <button
              onClick={confirm}
              disabled={picker.picked.length === 0}
              aria-label="Создать программу из выбранных упражнений"
              title="Создать программу"
              className="stepper shrink-0 disabled:cursor-default disabled:opacity-35"
            >
              ✓
            </button>
          </div>

          <p className="mt-2.5 flex flex-wrap items-center gap-2 text-[11px] text-dim">
            <span>
              Отмечено {picker.picked.length}. Повторное нажатие снимает
              выделение.
            </span>
            <button
              onClick={() => {
                cancelPicker();
                onNavigate?.("program");
              }}
              className="underline underline-offset-2 transition-colors hover:text-accent"
            >
              Отменить сбор
            </button>
          </p>
        </div>
      )}

      <div className="card p-4">
        <div className="relative">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск по названию"
            aria-label="Поиск упражнения по названию"
            className="w-full rounded-pill border border-line bg-accent/[0.04] px-4 py-2 pr-9 text-sm text-bright outline-none transition-colors placeholder:text-dim focus:border-accent"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              aria-label="Очистить поиск"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-dim transition-colors hover:text-accent"
            >
              ×
            </button>
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <button
            onClick={() => setFilter("all")}
            className={pill(filter === "all")}
          >
            Все
          </button>
          {muscleFilters.map((m) => (
            <button
              key={m}
              onClick={() => setFilter(m)}
              className={pill(filter === m)}
            >
              {muscleNames[m]}
            </button>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5 border-t border-line pt-3">
          <button
            onClick={() => setBodyweight(!bodyweight)}
            aria-pressed={bodyweight}
            className={pill(bodyweight)}
          >
            Свой вес
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
          <p className="text-xs text-dim">{list.length} упражнений</p>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setSort("effect")}
              className={pill(sort === "effect")}
            >
              По активации
            </button>
            <button
              onClick={() => setSort("difficulty")}
              className={pill(sort === "difficulty")}
            >
              По сложности
            </button>
            <button
              onClick={() => setSort("alpha")}
              className={pill(sort === "alpha")}
            >
              А-Я
            </button>
          </div>
        </div>
      </div>

      <ul className="grid gap-2 sm:grid-cols-2">
        {list.map((ex, i) => {
          const chosen = picking && picker.picked.includes(ex.id);
          return (
            <li key={ex.id}>
              <button
                onClick={() => (picking ? togglePick(ex.id) : setOpen(ex.id))}
                aria-pressed={picking ? chosen : undefined}
                className={`card reveal w-full p-4 text-left transition-colors ${
                  chosen
                    ? "border-accent bg-accent/[0.06]"
                    : "hover:border-accent-dim"
                }`}
                style={{ "--i": Math.min(i, 12) } as React.CSSProperties}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm text-bright">
                    {picking && (
                      <span
                        aria-hidden
                        className={`mr-2 ${chosen ? "text-accent-hi" : "text-dim/50"}`}
                      >
                        {chosen ? "✓" : "○"}
                      </span>
                    )}
                    {ex.name}
                  </span>
                  {ex.emgPercent !== null && (
                    <span className="shrink-0 font-serif text-2xl font-light text-accent">
                      {scoreLabel(ex)}
                    </span>
                  )}
                </div>

                <span className="mt-3.5 flex flex-col gap-2">
                  <Scale
                    label={`Активация · ${muscleNames[ex.primary].toLowerCase()}`}
                    percent={ex.emgPercent}
                    value={
                      ex.emgPercent !== null ? `${ex.emgPercent} %` : "нет данных"
                    }
                  />
                  <Scale
                    warm
                    label="Сложность"
                    percent={difficultyPercent(ex)}
                    value={difficultyLabels[ex.difficulty]}
                  />
                </span>

                <div className="mt-3.5 flex flex-wrap items-center gap-1.5">
                  <span className="chip">{muscleNames[ex.primary]}</span>
                  <span className="chip">{evidenceLabels[ex.evidence]}</span>
                  <span className="chip">{equipmentLabels[ex.equipment]}</span>
                </div>

                {ex.secondary.length > 0 && (
                  <p className="mt-2.5 text-[11px] text-dim">
                    Также: {ex.secondary.map((s) => muscleNames[s]).join(", ")}
                  </p>
                )}
              </button>
            </li>
          );
        })}
        {list.length === 0 && (
          <li className="card p-6 text-center text-sm text-dim sm:col-span-2">
            Ничего не нашлось — смягчите условия поиска
          </li>
        )}
      </ul>
    </div>
  );
}
