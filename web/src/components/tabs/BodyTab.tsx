"use client";

import { useMemo, useState } from "react";
import type { MuscleId } from "@shared/types";
import BodyPanel from "@/components/BodyPanel";
import ProfileBar from "@/components/ProfileBar";
import SessionMode from "@/components/SessionMode";
import {
  difficultyLabels,
  equipmentLabels,
  evidenceLabels,
  exercisesFor,
  muscleNames,
  scoreLabel,
} from "@/lib/demo";
import { landmarks, statusLabels, statusOf } from "@/lib/landmarks";
import { useStore } from "@/lib/store";

export default function BodyTab() {
  const { loads, session } = useStore();
  const [selected, setSelected] = useState<MuscleId>("chest");

  const sets = useMemo(
    () => Object.fromEntries(loads.map((l) => [l.muscleId, l.setsDone])),
    [loads]
  );

  const done = sets[selected] ?? 0;
  const l = landmarks[selected];
  const status = statusOf(selected, done);
  const exercises = useMemo(() => exercisesFor(selected), [selected]);

  if (session) return <SessionMode />;

  return (
    <div className="stagger flex flex-col gap-4">
      <ProfileBar week="Неделя 4–10 августа" />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-start">
        <BodyPanel
          sets={sets}
          kicker="Неделя"
          selected={selected}
          onSelect={setSelected}
        />

        {/* ── Разбор группы ──────────────────────────────────────────── */}
        <div className="card card-lit flex flex-col p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <h2 className="font-serif text-4xl font-light tracking-wide text-accent-hi">
              {muscleNames[selected]}
            </h2>
            <div className="text-right">
              <p className="font-serif text-3xl font-light text-bright">
                {Math.round(done * 10) / 10}
                <span className="text-dim">
                  /{l.mavLow}–{l.mavHigh}
                </span>
              </p>
              <p className="kicker mt-1">подходов за неделю</p>
            </div>
          </div>

          <div className="meter mt-4">
            <span
              style={{
                width: `${Math.min(done / l.mavHigh, 1) * 100}%`,
                background:
                  status === "over"
                    ? "var(--color-over)"
                    : status === "high"
                      ? "var(--color-warm)"
                      : undefined,
              }}
            />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="chip">{statusLabels[status]}</span>
            <span className="text-xs text-dim">
              минимум {l.mev} · рабочий {l.mavLow}–{l.mavHigh} · потолок {l.mrv}
            </span>
          </div>

          <ul className="mt-5 flex flex-col gap-2">
            {exercises.map((ex, i) => (
              <li
                key={ex.id}
                className="reveal rounded-[14px] border border-line bg-accent/[0.03] p-3.5"
                style={{ "--i": i } as React.CSSProperties}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm text-bright">{ex.name}</span>
                  <span className="font-serif text-xl font-light text-accent">
                    {scoreLabel(ex)}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="chip">{evidenceLabels[ex.evidence]}</span>
                  <span className="chip">{difficultyLabels[ex.difficulty]}</span>
                  <span className="chip">{equipmentLabels[ex.equipment]}</span>
                </div>
              </li>
            ))}
            {exercises.length === 0 && (
              <li className="text-sm text-dim">
                В каталоге пока нет упражнений с этой целевой группой
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
