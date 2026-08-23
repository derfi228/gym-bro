"use client";

import { useMemo, useState } from "react";
import type { BodyView, Exercise, MuscleId } from "@shared/types";
import MuscleFigure, { shapesFor, viewOf } from "@/components/MuscleFigure";
import { RotateIcon } from "@/components/icons";
import {
  difficultyLabels,
  difficultyPercent,
  equipmentLabels,
  evidenceLabels,
  muscleNames,
  scoreLabel,
  sources,
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
          step={1}
          inputMode="numeric"
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
  const { weights, setWeight, programs, addSlot } = useStore();
  const [view, setView] = useState<BodyView>(() => viewOf(exercise.primary));
  const [target, setTarget] = useState<string | null>(null);
  const [added, setAdded] = useState<string | null>(null);

  const w = weights[exercise.id] ?? {};

  // Какие группы задействованы, от сильной к слабой
  const involved = useMemo(
    () =>
      (Object.entries(exercise.involvement) as [MuscleId, number][]).sort(
        (a, b) => b[1] - a[1],
      ),
    [exercise],
  );

  // В каких программах упражнение уже стоит
  const usedIn = useMemo(
    () =>
      programs.filter((p) => p.slots.some((s) => s.exerciseId === exercise.id)),
    [programs, exercise.id],
  );

  // Добавлять можно только в редактируемые программы
  const editable = useMemo(
    () => programs.filter((p) => !p.builtIn),
    [programs],
  );

  // Есть ли задействованные мышцы на обратной стороне
  const otherView: BodyView = view === "front" ? "back" : "front";
  const hiddenCount = involved.filter(
    ([id]) => id in shapesFor(otherView) && !(id in shapesFor(view)),
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
              <span className="chip" title={sources[exercise.sourceId]?.note}>
                {evidenceLabels[exercise.evidence]}
              </span>
              <span className="chip">
                {difficultyLabels[exercise.difficulty]}
              </span>
              <span className="chip">
                {equipmentLabels[exercise.equipment]}
              </span>
            </div>
          </div>
          {exercise.emgPercent !== null && (
            <p className="shrink-0 font-serif text-4xl font-light text-accent">
              {scoreLabel(exercise)}
            </p>
          )}
        </div>

        <div className="mt-5 flex flex-col gap-2.5">
          <div className="flex items-center gap-3">
            <span className="w-32 shrink-0 text-[11px] text-dim">
              Активация · {muscleNames[exercise.primary].toLowerCase()}
            </span>
            <span className="meter flex-1">
              {exercise.emgPercent !== null && (
                <span style={{ width: `${exercise.emgPercent}%` }} />
              )}
            </span>
            <span className="w-20 shrink-0 text-right text-[11px] text-dim">
              {exercise.emgPercent !== null
                ? `${exercise.emgPercent} %`
                : "нет данных"}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-32 shrink-0 text-[11px] text-dim">Сложность</span>
            <span className="meter meter-warm flex-1">
              <span style={{ width: `${difficultyPercent(exercise)}%` }} />
            </span>
            <span className="w-20 shrink-0 text-right text-[11px] text-warm">
              {difficultyLabels[exercise.difficulty]}
            </span>
          </div>
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

      {/* Где уже используется */}
      <div className="card p-5 sm:p-6">
        <p className="kicker">В программах</p>
        {usedIn.length === 0 ? (
          <p className="mt-3 text-sm text-dim">
            Пока не добавлено ни в одну программу
          </p>
        ) : (
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {usedIn.map((p) => (
              <li key={p.id} className="chip">
                {p.name}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Добавление в программу */}
      <div className="card p-5 sm:p-6">
        <p className="kicker">Добавить в программу</p>

        {editable.length === 0 ? (
          <p className="mt-3 text-sm leading-relaxed text-dim">
            Своих тренировок пока нет. Заготовки GymBro нельзя дополнять —
            сделайте копию или соберите тренировку во вкладке «Программа».
          </p>
        ) : (
          <>
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {editable.map((p) => (
                <li key={p.id}>
                  <button
                    onClick={() => {
                      setTarget(target === p.id ? null : p.id);
                      setAdded(null);
                    }}
                    aria-pressed={target === p.id}
                    className={`rounded-pill border px-3 py-1 text-[11px] transition-colors ${
                      target === p.id
                        ? "border-accent bg-accent/12 text-accent-hi"
                        : "border-line text-dim hover:border-accent-dim hover:text-accent"
                    }`}
                  >
                    {p.name}
                  </button>
                </li>
              ))}
            </ul>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                onClick={() => {
                  if (!target) return;
                  addSlot(target, exercise.id, 3);
                  setAdded(target);
                  setTarget(null);
                }}
                disabled={!target}
                className="btn disabled:cursor-default disabled:opacity-40"
              >
                Добавить в программу
              </button>
              <p className="text-xs text-dim">
                {added
                  ? `Добавлено в «${programs.find((p) => p.id === added)?.name ?? ""}», 3 подхода`
                  : target
                    ? "3 подхода, отдых по сложности упражнения"
                    : "Выберите программу"}
              </p>
            </div>
          </>
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
