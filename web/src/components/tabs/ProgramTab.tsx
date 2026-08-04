"use client";

import { useEffect, useMemo, useState } from "react";
import {
  difficultyLabels,
  equipmentLabels,
  exerciseById,
  exercisesFor,
  muscleNames,
} from "@/lib/demo";

type Slot = { id: string; sets: number; reps: string; rest: number };

/** Пул упражнений по приоритету: база идёт первой */
const pool: Slot[] = [
  { id: "back-squat", sets: 4, reps: "8", rest: 150 },
  { id: "db-incline-press", sets: 4, reps: "8–10", rest: 120 },
  { id: "chin-up", sets: 3, reps: "8", rest: 90 },
  { id: "db-shoulder-press", sets: 3, reps: "10", rest: 90 },
  { id: "lateral-raise", sets: 3, reps: "15", rest: 60 },
  { id: "cable-crunch", sets: 3, reps: "12", rest: 45 },
  { id: "standing-calf-raise", sets: 3, reps: "15", rest: 45 },
  { id: "db-shrug", sets: 3, reps: "12", rest: 60 },
  { id: "leg-press", sets: 3, reps: "12", rest: 120 },
  { id: "preacher-curl", sets: 3, reps: "10", rest: 60 },
  { id: "cable-woodchop", sets: 3, reps: "12", rest: 45 },
];

const durations = [25, 35, 50, 70];

/** Минуты на упражнение: подходы × (работа + отдых) */
const slotCost = (s: Slot) => (s.sets * (40 + s.rest)) / 60;

function buildProgram(budget: number) {
  const picked: Slot[] = [];
  let used = 0;
  for (const slot of pool) {
    const cost = slotCost(slot);
    if (used + cost > budget) continue;
    picked.push(slot);
    used += cost;
  }
  return { picked, used: Math.round(used) };
}

const RING = 2 * Math.PI * 86;

function mmss(total: number) {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function ProgramTab() {
  const [budget, setBudget] = useState(35);
  const [swaps, setSwaps] = useState<Record<string, string>>({});
  const [openSwap, setOpenSwap] = useState<string | null>(null);

  // Таймер отдыха
  const [restTotal, setRestTotal] = useState(0);
  const [restLeft, setRestLeft] = useState(0);

  const { picked, used } = useMemo(() => buildProgram(budget), [budget]);

  useEffect(() => {
    if (restLeft <= 0) return;
    const t = setInterval(() => setRestLeft((v) => Math.max(0, v - 1)), 1000);
    return () => clearInterval(t);
  }, [restLeft]);

  function startRest(sec: number) {
    setRestTotal(sec);
    setRestLeft(sec);
  }

  const progress = restTotal > 0 ? restLeft / restTotal : 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Длительность */}
      <div className="card flex flex-wrap items-center justify-between gap-4 p-4">
        <div className="flex flex-wrap gap-1.5">
          {durations.map((d) => (
            <button
              key={d}
              onClick={() => {
                setBudget(d);
                setOpenSwap(null);
              }}
              aria-pressed={budget === d}
              className={`rounded-pill border px-4 py-1.5 text-[12px] transition-colors ${
                budget === d
                  ? "border-accent bg-accent/12 text-accent-hi"
                  : "border-line text-dim hover:border-accent-dim hover:text-accent"
              }`}
            >
              {d} мин
            </button>
          ))}
        </div>
        <p className="font-serif text-2xl font-light text-bright">
          {used} <span className="text-dim text-base">из {budget} мин</span>
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.15fr_1fr]">
        {/* Программа */}
        <div className="card card-lit p-5 sm:p-6">
          <ul className="flex flex-col gap-2">
            {picked.map((slot, i) => {
              const ex = exerciseById(swaps[slot.id] ?? slot.id);
              const isOpen = openSwap === slot.id;
              const alternatives = exercisesFor(ex.primary).filter(
                (a) => a.id !== ex.id
              );

              return (
                <li
                  key={slot.id}
                  className="reveal rounded-[14px] border border-line bg-accent/[0.03] p-3.5"
                  style={{ "--i": i } as React.CSSProperties}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm text-bright">{ex.name}</p>
                      <p className="mt-1 text-xs text-dim">
                        {slot.sets} × {slot.reps} · отдых {slot.rest} с ·{" "}
                        {muscleNames[ex.primary]}
                      </p>
                    </div>
                    <span className="font-serif text-lg font-light text-accent">
                      {ex.effectiveness}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      onClick={() => startRest(slot.rest)}
                      className="btn-ghost px-4 py-1.5 text-[11px]"
                    >
                      Отметить подход
                    </button>
                    <button
                      onClick={() => setOpenSwap(isOpen ? null : slot.id)}
                      aria-expanded={isOpen}
                      className="btn-ghost px-4 py-1.5 text-[11px]"
                    >
                      {isOpen ? "Отмена" : "Заменить"}
                    </button>
                  </div>

                  {/* Альтернативы на ту же группу, от лучшей к худшей */}
                  {isOpen && (
                    <ul className="mt-3 flex flex-col gap-1.5 border-t border-line pt-3">
                      {alternatives.map((alt) => (
                        <li key={alt.id}>
                          <button
                            onClick={() => {
                              setSwaps((s) => ({ ...s, [slot.id]: alt.id }));
                              setOpenSwap(null);
                            }}
                            className="flex w-full items-center justify-between gap-3 rounded-[10px] px-2.5 py-2 text-left transition-colors hover:bg-accent/6"
                          >
                            <span className="min-w-0">
                              <span className="block truncate text-[13px] text-bright">
                                {alt.name}
                              </span>
                              <span className="text-[10px] text-dim">
                                {difficultyLabels[alt.difficulty]} ·{" "}
                                {equipmentLabels[alt.equipment]}
                              </span>
                            </span>
                            <span className="font-serif text-base font-light text-accent">
                              {alt.effectiveness}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        {/* Таймер отдыха */}
        <div className="card card-lit flex flex-col items-center justify-center p-6">
          <p className="kicker">Отдых</p>

          <div className="relative mt-6 grid place-items-center">
            <svg viewBox="0 0 200 200" className="w-48">
              <circle
                cx="100"
                cy="100"
                r="86"
                fill="none"
                stroke="var(--color-line)"
                strokeWidth="6"
              />
              <circle
                cx="100"
                cy="100"
                r="86"
                fill="none"
                stroke="var(--color-accent)"
                strokeWidth="6"
                strokeLinecap="round"
                transform="rotate(-90 100 100)"
                strokeDasharray={RING}
                strokeDashoffset={RING * (1 - progress)}
                style={{ transition: "stroke-dashoffset 1s linear" }}
              />
            </svg>
            <div className="absolute text-center">
              <p className="font-serif text-5xl font-light text-accent-hi">
                {mmss(restLeft)}
              </p>
              <p className="kicker mt-2">
                {restTotal > 0 ? `из ${mmss(restTotal)}` : "не запущен"}
              </p>
            </div>
          </div>

          <div className="mt-6 flex gap-2">
            <button
              onClick={() => setRestLeft(0)}
              className="btn-ghost px-4 py-1.5 text-[11px]"
            >
              Сбросить
            </button>
            <button
              onClick={() => startRest(restTotal || 90)}
              className="btn-ghost px-4 py-1.5 text-[11px]"
            >
              Заново
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
