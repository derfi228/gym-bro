"use client";

import { useMemo, useState } from "react";
import type { BodyView, MuscleId } from "@shared/types";
import MuscleFigure, { shapesFor, viewOf } from "@/components/MuscleFigure";
import { RotateIcon } from "@/components/icons";
import {
  difficultyLabels,
  equipmentLabels,
  evidenceLabels,
  exercisesFor,
  muscleNames,
  scoreLabel,
} from "@/lib/demo";
import { useStore } from "@/lib/store";

function verdictFor(ratio: number) {
  if (ratio > 1) return "Перебор";
  if (ratio >= 0.8) return "Объём набран";
  if (ratio >= 0.5) return "В норме";
  return "Отстаёт";
}

export default function BodyTab() {
  const { loads } = useStore();
  const [selected, setSelected] = useState<MuscleId>("chest");
  const [view, setView] = useState<BodyView>("front");

  const byMuscle = useMemo(
    () => new Map(loads.map((l) => [l.muscleId, l])),
    [loads]
  );
  const values = useMemo(
    () => Object.fromEntries(loads.map((l) => [l.muscleId, l.ratio])),
    [loads]
  );

  const load = byMuscle.get(selected)!;
  const exercises = useMemo(() => exercisesFor(selected), [selected]);
  const visible = Object.keys(shapesFor(view)) as MuscleId[];

  // Выбор группы уводит на ту проекцию, где она видна
  function pick(id: MuscleId) {
    setSelected(id);
    const v = viewOf(id);
    if (!(id in shapesFor(view))) setView(v);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="card flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="chip">182 см</span>
          <span className="chip">78 кг</span>
          <span className="chip">24 года</span>
        </div>
        <p className="text-xs text-dim">Неделя 4–10 августа</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        {/* ── Схема ──────────────────────────────────────────────────── */}
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
            <p className="kicker">{view === "front" ? "Спереди" : "Сзади"}</p>
            <button
              onClick={() => setView(view === "front" ? "back" : "front")}
              aria-label={
                view === "front" ? "Показать вид сзади" : "Показать вид спереди"
              }
              className="btn-ghost gap-2 px-4 py-1.5 text-[11px]"
            >
              <RotateIcon className="h-4 w-4" />
              Развернуть
            </button>
          </div>

          <MuscleFigure
            values={values}
            mode="fill"
            view={view}
            selected={selected}
            onSelect={pick}
            labelOf={(id) => {
              const l = byMuscle.get(id);
              return l
                ? `${muscleNames[id]}: ${Math.round(l.setsDone * 10) / 10} из ${l.setsTarget} подходов`
                : muscleNames[id];
            }}
            uid="body"
            className="relative mx-auto mt-3 w-full max-w-[260px]"
          />

          <div className="relative mt-5 flex flex-wrap justify-center gap-1.5">
            {loads.map((l) => {
              const onThisView = visible.includes(l.muscleId);
              return (
                <button
                  key={l.muscleId}
                  onClick={() => pick(l.muscleId)}
                  aria-pressed={l.muscleId === selected}
                  className={`rounded-pill border px-3 py-1 text-[11px] transition-colors ${
                    l.muscleId === selected
                      ? "border-accent bg-accent/12 text-accent-hi"
                      : onThisView
                        ? "border-line text-dim hover:border-accent-dim hover:text-accent"
                        : "border-line/50 text-dim/60 hover:border-accent-dim hover:text-accent"
                  }`}
                >
                  {muscleNames[l.muscleId]}
                </button>
              );
            })}
          </div>
          <p className="relative mt-3 text-center text-[11px] text-dim">
            Приглушённые группы видны на другой стороне
          </p>
        </div>

        {/* ── Разбор группы ──────────────────────────────────────────── */}
        <div className="card card-lit flex flex-col p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <h2 className="font-serif text-4xl font-light tracking-wide text-accent-hi">
              {muscleNames[selected]}
            </h2>
            <div className="text-right">
              <p className="font-serif text-3xl font-light text-bright">
                {Math.round(load.setsDone * 10) / 10}
                <span className="text-dim">/{load.setsTarget}</span>
              </p>
              <p className="kicker mt-1">подходов</p>
            </div>
          </div>

          <div className="meter mt-4">
            <span style={{ width: `${Math.min(load.ratio, 1) * 100}%` }} />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="chip">{verdictFor(load.ratio)}</span>
            {load.ratio > 1 && (
              <span className="text-xs text-dim">снизьте объём на неделе</span>
            )}
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
          </ul>
        </div>
      </div>
    </div>
  );
}
