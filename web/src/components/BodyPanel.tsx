"use client";

import { useMemo, useState } from "react";
import type { BodyView, MuscleId } from "@shared/types";
import MuscleFigure, { shapesFor, viewOf } from "@/components/MuscleFigure";
import { RotateIcon } from "@/components/icons";
import { muscleNames } from "@/lib/demo";
import {
  fillValues,
  report,
  statusLabels,
  statusValues,
  type MuscleStatus,
  type SetsByMuscle,
} from "@/lib/landmarks";

const LEGEND: { status: MuscleStatus; color: string }[] = [
  { status: "none", color: "var(--color-idle)" },
  { status: "low", color: "var(--color-accent-dim)" },
  { status: "optimal", color: "var(--color-accent)" },
  { status: "high", color: "var(--color-warm)" },
  { status: "over", color: "var(--color-over)" },
];

/**
 * Фигура с заливкой по объёму: цвет — статус группы, высота — сколько
 * набрано от верха рабочего диапазона.
 */
export default function BodyPanel({
  sets,
  scale = 1,
  kicker,
  selected = null,
  onSelect,
  children,
}: {
  sets: SetsByMuscle;
  /** С чем сравнивать: 1 — неделя, SESSION_SHARE — одна тренировка */
  scale?: number;
  /** Надпись над фигурой */
  kicker?: string;
  selected?: MuscleId | null;
  onSelect?: (id: MuscleId) => void;
  /** Блок под легендой */
  children?: React.ReactNode;
}) {
  const [view, setView] = useState<BodyView>("front");

  const values = useMemo(() => fillValues(sets, scale), [sets, scale]);
  const statuses = useMemo(() => statusValues(sets, scale), [sets, scale]);
  const rows = useMemo(() => report(sets, scale), [sets, scale]);
  const byMuscle = useMemo(
    () => new Map(rows.map((r) => [r.muscleId, r])),
    [rows]
  );

  // Выбор группы уводит на ту проекцию, где она видна
  function pick(id: MuscleId) {
    onSelect?.(id);
    if (!(id in shapesFor(view))) setView(viewOf(id));
  }

  const labelOf = (id: MuscleId) => {
    const r = byMuscle.get(id);
    if (!r) return muscleNames[id];
    return `${muscleNames[id]}: ${r.sets} подходов — ${statusLabels[r.status].toLowerCase()}`;
  };

  const visible = Object.keys(shapesFor(view)) as MuscleId[];

  return (
    <div className="card card-lit relative overflow-hidden p-5 sm:p-6">
      <div
        aria-hidden
        className="aura pointer-events-none absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 rounded-full"
        style={{
          background:
            "radial-gradient(closest-side, rgb(111 159 216 / 0.15), transparent)",
        }}
      />

      <div className="relative flex items-center justify-between gap-4">
        <p className="kicker">{kicker ?? (view === "front" ? "Спереди" : "Сзади")}</p>
        <button
          onClick={() => setView(view === "front" ? "back" : "front")}
          aria-label={
            view === "front" ? "Показать вид сзади" : "Показать вид спереди"
          }
          className="btn-ghost gap-2 px-4 py-1.5 text-[11px]"
        >
          <RotateIcon className="h-4 w-4" />
          {view === "front" ? "Сзади" : "Спереди"}
        </button>
      </div>

      <MuscleFigure
        values={values}
        statuses={statuses}
        mode="fill"
        view={view}
        selected={selected}
        onSelect={onSelect ? pick : undefined}
        labelOf={labelOf}
        uid="panel"
        className="relative mx-auto mt-3 w-full max-w-[330px]"
      />

      {/* Легенда шкалы */}
      <ul className="relative mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1.5">
        {LEGEND.map((l) => (
          <li key={l.status} className="flex items-center gap-1.5">
            <span className="dot" style={{ background: l.color }} />
            <span className="text-[10px] text-dim">{statusLabels[l.status]}</span>
          </li>
        ))}
      </ul>

      {onSelect && (
        <div className="relative mt-4 flex flex-wrap justify-center gap-1.5">
          {rows.map((r) => (
            <button
              key={r.muscleId}
              onClick={() => pick(r.muscleId)}
              aria-pressed={r.muscleId === selected}
              className={`rounded-pill border px-3 py-1 text-[11px] transition-colors ${
                r.muscleId === selected
                  ? "border-accent bg-accent/12 text-accent-hi"
                  : visible.includes(r.muscleId)
                    ? "border-line text-dim hover:border-accent-dim hover:text-accent"
                    : "border-line/50 text-dim/60 hover:border-accent-dim hover:text-accent"
              }`}
            >
              {muscleNames[r.muscleId]}
              <span className="ml-1.5 text-dim/70">{r.sets}</span>
            </button>
          ))}
        </div>
      )}

      {children}
    </div>
  );
}
