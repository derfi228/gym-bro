"use client";

import { useMemo, useState } from "react";
import type { BodyView, Exercise, MuscleId } from "@shared/types";
import MuscleFigure, { shapesFor, viewOf } from "@/components/MuscleFigure";
import { RotateIcon } from "@/components/icons";
import {
  difficultyLabels,
  equipmentLabels,
  evidenceLabels,
  muscleNames,
  scoreLabel,
} from "@/lib/demo";
import { useStore } from "@/lib/store";

/** Поле веса: пустое значение допустимо */
function WeightInput({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
}) {
  return (
    <label className="flex-1 min-w-[140px]">
      <span className="kicker block">{label}</span>
      <span className="mt-2 flex items-baseline gap-2">
        <input
          type="number"
          min={0}
          max={500}
          step={2.5}
          inputMode="decimal"
          value={value ?? ""}
          placeholder="—"
          onChange={(e) => {
            const raw = e.target.value;
            onChange(raw === "" ? undefined : Math.max(0, Number(raw)));
          }}
          className="w-24 rounded-pill border border-line bg-accent/[0.04] px-3 py-1.5 text-center font-serif text-xl text-bright outline-none transition-colors focus:border-accent"
        />
        <span className="text-sm text-dim">кг</span>
      </span>
      <span className="mt-1.5 block text-[11px] leading-snug text-dim">
        {hint}
      </span>
    </label>
  );
}

export default function ExerciseDetail({
  exercise,
  children,
}: {
  exercise: Exercise;
  /** Дополнительный блок: подходы, замена, отметка — зависит от вкладки */
  children?: React.ReactNode;
}) {
  const { weights, setWeight } = useStore();
  const [view, setView] = useState<BodyView>(() => viewOf(exercise.primary));

  const w = weights[exercise.id] ?? {};

  // Какие группы задействованы, от сильной к слабой
  const involved = useMemo(
    () =>
      (Object.entries(exercise.involvement) as [MuscleId, number][]).sort(
        (a, b) => b[1] - a[1]
      ),
    [exercise]
  );

  // Есть ли задействованные мышцы на обратной стороне
  const otherView: BodyView = view === "front" ? "back" : "front";
  const hiddenCount = involved.filter(
    ([id]) => id in shapesFor(otherView) && !(id in shapesFor(view))
  ).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="card card-lit p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="font-serif text-3xl font-light leading-tight text-bright">
              {exercise.name}
            </h2>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <span className="chip">{muscleNames[exercise.primary]}</span>
              <span className="chip">{evidenceLabels[exercise.evidence]}</span>
              <span className="chip">
                {difficultyLabels[exercise.difficulty]}
              </span>
              <span className="chip">{equipmentLabels[exercise.equipment]}</span>
            </div>
          </div>
          <p className="shrink-0 font-serif text-4xl font-light text-accent">
            {scoreLabel(exercise)}
          </p>
        </div>

        <p className="mt-5 text-sm leading-relaxed text-bright">
          {exercise.description}
        </p>

        {exercise.note && (
          <div className="callout mt-4">
            <p className="text-sm leading-relaxed text-bright">
              {exercise.note}
            </p>
          </div>
        )}
      </div>

      {/* Какие мышцы работают */}
      <div className="card card-lit p-5 sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <p className="kicker">Что работает</p>
          <button
            onClick={() => setView(otherView)}
            aria-label={
              view === "front" ? "Показать вид сзади" : "Показать вид спереди"
            }
            className="btn-ghost gap-2 px-4 py-1.5 text-[11px]"
          >
            <RotateIcon className="h-4 w-4" />
            {view === "front" ? "Сзади" : "Спереди"}
          </button>
        </div>

        <div className="mt-4 grid gap-5 sm:grid-cols-[minmax(0,180px)_1fr] sm:items-center">
          <MuscleFigure
            values={exercise.involvement}
            mode="intensity"
            view={view}
            uid={`ex-${exercise.id}`}
            className="mx-auto w-full max-w-[170px]"
          />

          <ul className="flex flex-col gap-2">
            {involved.map(([id, v]) => (
              <li key={id} className="flex items-center gap-3">
                <span className="w-28 shrink-0 text-[13px] text-bright">
                  {muscleNames[id]}
                </span>
                <span className="meter flex-1">
                  <span style={{ width: `${Math.round(v * 100)}%` }} />
                </span>
                <span className="w-9 shrink-0 text-right text-[11px] text-dim">
                  {Math.round(v * 100)}%
                </span>
              </li>
            ))}
          </ul>
        </div>

        {hiddenCount > 0 && (
          <p className="mt-4 text-[11px] text-dim">
            Ещё {hiddenCount} группы на другой стороне — разверните фигуру
          </p>
        )}
      </div>

      {/* Личные веса */}
      <div className="card p-5 sm:p-6">
        <p className="kicker">Мои веса</p>
        <div className="mt-4 flex flex-wrap gap-6">
          <WeightInput
            label="Пиковый"
            hint="Разовый максимум, от него считаются проценты"
            value={w.peakKg}
            onChange={(v) => setWeight(exercise.id, "peakKg", v)}
          />
          <WeightInput
            label="Рабочий"
            hint="С каким весом обычно делаете подходы"
            value={w.workingKg}
            onChange={(v) => setWeight(exercise.id, "workingKg", v)}
          />
        </div>

        {w.peakKg && w.workingKg ? (
          <p className="mt-4 text-xs text-dim">
            Рабочий — {Math.round((w.workingKg / w.peakKg) * 100)}% от пикового
          </p>
        ) : null}
      </div>

      {children}
    </div>
  );
}
