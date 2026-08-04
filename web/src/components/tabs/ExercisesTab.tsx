"use client";

import { useMemo, useState } from "react";
import type { Difficulty, MuscleId } from "@shared/types";
import {
  demoExercises,
  difficultyLabels,
  equipmentLabels,
  muscleNames,
} from "@/lib/demo";

type Filter = MuscleId | "all";
type Sort = "effectiveness" | "difficulty";

const difficultyRank: Record<Difficulty, number> = {
  low: 0,
  medium: 1,
  high: 2,
};

const muscleFilters = Object.keys(muscleNames) as MuscleId[];

export default function ExercisesTab() {
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("effectiveness");

  const list = useMemo(() => {
    const filtered =
      filter === "all"
        ? demoExercises
        : demoExercises.filter(
            (e) => e.primary === filter || e.secondary.includes(filter)
          );
    return [...filtered].sort((a, b) =>
      sort === "effectiveness"
        ? b.effectiveness - a.effectiveness
        : difficultyRank[a.difficulty] - difficultyRank[b.difficulty] ||
          b.effectiveness - a.effectiveness
    );
  }, [filter, sort]);

  return (
    <div className="flex flex-col gap-4">
      {/* Фильтр по группе */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setFilter("all")}
            aria-pressed={filter === "all"}
            className={`rounded-pill border px-3 py-1 text-[11px] transition-colors ${
              filter === "all"
                ? "border-accent bg-accent/12 text-accent-hi"
                : "border-line text-dim hover:border-accent-dim hover:text-accent"
            }`}
          >
            Все
          </button>
          {muscleFilters.map((m) => (
            <button
              key={m}
              onClick={() => setFilter(m)}
              aria-pressed={filter === m}
              className={`rounded-pill border px-3 py-1 text-[11px] transition-colors ${
                filter === m
                  ? "border-accent bg-accent/12 text-accent-hi"
                  : "border-line text-dim hover:border-accent-dim hover:text-accent"
              }`}
            >
              {muscleNames[m]}
            </button>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-3">
          <p className="text-xs text-dim">{list.length} упражнений</p>
          <div className="flex gap-1.5">
            {(
              [
                ["effectiveness", "По эффективности"],
                ["difficulty", "По сложности"],
              ] as [Sort, string][]
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setSort(key)}
                aria-pressed={sort === key}
                className={`rounded-pill border px-3 py-1 text-[11px] transition-colors ${
                  sort === key
                    ? "border-accent bg-accent/12 text-accent-hi"
                    : "border-line text-dim hover:border-accent-dim hover:text-accent"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Список */}
      <ul className="grid gap-2 sm:grid-cols-2">
        {list.map((ex, i) => (
          <li
            key={ex.id}
            className="card reveal p-4"
            style={{ "--i": Math.min(i, 12) } as React.CSSProperties}
          >
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm text-bright">{ex.name}</span>
              <span className="font-serif text-2xl font-light text-accent">
                {ex.effectiveness}
              </span>
            </div>

            <div className="meter mt-3">
              <span style={{ width: `${ex.effectiveness}%` }} />
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="chip">{muscleNames[ex.primary]}</span>
              <span className="chip">{difficultyLabels[ex.difficulty]}</span>
              <span className="chip">{equipmentLabels[ex.equipment]}</span>
            </div>

            {ex.secondary.length > 0 && (
              <p className="mt-2.5 text-[11px] text-dim">
                Также: {ex.secondary.map((s) => muscleNames[s]).join(", ")}
              </p>
            )}
            {ex.note && <p className="mt-2 text-xs text-dim">{ex.note}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}
