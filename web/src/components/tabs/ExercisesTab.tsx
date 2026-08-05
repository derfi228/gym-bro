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
  orderKey,
  scoreLabel,
} from "@/lib/demo";

type Filter = MuscleId | "all";
type Sort = "effect" | "difficulty";

const difficultyRank: Record<Difficulty, number> = { low: 0, medium: 1, high: 2 };
const muscleFilters = Object.keys(muscleNames) as MuscleId[];

const pill = (active: boolean) =>
  `rounded-pill border px-3 py-1 text-[11px] transition-colors ${
    active
      ? "border-accent bg-accent/12 text-accent-hi"
      : "border-line text-dim hover:border-accent-dim hover:text-accent"
  }`;

export default function ExercisesTab() {
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("effect");
  const [open, setOpen] = useState<string | null>(null);

  const list = useMemo(() => {
    const filtered =
      filter === "all"
        ? demoExercises
        : demoExercises.filter(
            (e) => e.primary === filter || e.secondary.includes(filter)
          );
    return [...filtered].sort((a, b) =>
      sort === "effect"
        ? orderKey(a) - orderKey(b)
        : difficultyRank[a.difficulty] - difficultyRank[b.difficulty] ||
          orderKey(a) - orderKey(b)
    );
  }, [filter, sort]);

  if (open) {
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
    <div className="flex flex-col gap-4">
      <div className="card p-4">
        <div className="flex flex-wrap gap-1.5">
          <button onClick={() => setFilter("all")} className={pill(filter === "all")}>
            Все
          </button>
          {muscleFilters.map((m) => (
            <button key={m} onClick={() => setFilter(m)} className={pill(filter === m)}>
              {muscleNames[m]}
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
          <p className="text-xs text-dim">{list.length} упражнений</p>
          <div className="flex gap-1.5">
            <button onClick={() => setSort("effect")} className={pill(sort === "effect")}>
              По активации
            </button>
            <button
              onClick={() => setSort("difficulty")}
              className={pill(sort === "difficulty")}
            >
              По сложности
            </button>
          </div>
        </div>
      </div>

      <ul className="grid gap-2 sm:grid-cols-2">
        {list.map((ex, i) => (
          <li key={ex.id}>
            <button
              onClick={() => setOpen(ex.id)}
              className="card reveal w-full p-4 text-left transition-colors hover:border-accent-dim"
              style={{ "--i": Math.min(i, 12) } as React.CSSProperties}
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm text-bright">{ex.name}</span>
                <span className="shrink-0 font-serif text-2xl font-light text-accent">
                  {scoreLabel(ex)}
                </span>
              </div>

              {ex.emgPercent !== null && (
                <div className="meter mt-3">
                  <span style={{ width: `${ex.emgPercent}%` }} />
                </div>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <span className="chip">{muscleNames[ex.primary]}</span>
                <span className="chip">{evidenceLabels[ex.evidence]}</span>
                <span className="chip">{difficultyLabels[ex.difficulty]}</span>
                <span className="chip">{equipmentLabels[ex.equipment]}</span>
              </div>

              {ex.secondary.length > 0 && (
                <p className="mt-2.5 text-[11px] text-dim">
                  Также: {ex.secondary.map((s) => muscleNames[s]).join(", ")}
                </p>
              )}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
