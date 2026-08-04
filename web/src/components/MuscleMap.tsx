"use client";

import { useMemo, useState } from "react";
import type { MuscleId } from "@shared/types";
import {
  demoLoads,
  difficultyLabels,
  equipmentLabels,
  exercisesFor,
  muscleNames,
} from "@/lib/demo";

/**
 * Контуры мышц во фронтальной проекции.
 * Несколько путей на группу — для парных мышц (лево/право).
 */
const anatomy: Record<MuscleId, string[]> = {
  traps: [
    "M117,56 C108,60 96,68 87,82 C96,80 104,78 112,74 C115,68 116,62 117,56 Z",
    "M143,56 C152,60 164,68 173,82 C164,80 156,78 148,74 C145,68 144,62 143,56 Z",
  ],
  delts: [
    "M86,82 C74,88 66,100 65,114 C64,122 68,127 75,126 C82,125 88,118 92,108 C95,98 93,88 86,82 Z",
    "M174,82 C186,88 194,100 195,114 C196,122 192,127 185,126 C178,125 172,118 168,108 C165,98 167,88 174,82 Z",
  ],
  chest: [
    "M128,80 C116,78 104,80 96,88 C90,94 89,104 92,112 C96,120 106,124 116,122 C124,120 128,114 128,106 Z",
    "M132,80 C144,78 156,80 164,88 C170,94 171,104 168,112 C164,120 154,124 144,122 C136,120 132,114 132,106 Z",
  ],
  biceps: [
    "M75,128 C68,134 64,144 63,156 C62,166 66,172 72,171 C78,170 83,162 85,150 C87,138 82,130 75,128 Z",
    "M185,128 C192,134 196,144 197,156 C198,166 194,172 188,171 C182,170 177,162 175,150 C173,138 178,130 185,128 Z",
  ],
  forearms: [
    "M71,174 C65,180 60,194 58,208 C56,220 59,226 64,225 C69,224 73,216 76,202 C79,188 77,177 71,174 Z",
    "M189,174 C195,180 200,194 202,208 C204,220 201,226 196,225 C191,224 187,216 184,202 C181,188 183,177 189,174 Z",
  ],
  abs: [
    "M114,124 C110,134 109,148 110,162 C111,176 114,188 118,196 C124,200 136,200 142,196 C146,188 149,176 150,162 C151,148 150,134 146,124 C136,128 124,128 114,124 Z",
  ],
  obliques: [
    "M108,128 C102,138 100,152 101,166 C102,176 105,184 109,190 C110,178 109,164 110,150 C110,140 110,133 111,127 Z",
    "M152,128 C158,138 160,152 159,166 C158,176 155,184 151,190 C150,178 151,164 150,150 C150,140 150,133 149,127 Z",
  ],
  quads: [
    "M112,212 C104,220 99,238 98,258 C97,278 100,296 105,308 C112,312 120,310 124,304 C126,288 126,266 124,246 C122,230 118,218 112,212 Z",
    "M148,212 C156,220 161,238 162,258 C163,278 160,296 155,308 C148,312 140,310 136,304 C134,288 134,266 136,246 C138,230 142,218 148,212 Z",
  ],
  calves: [
    "M107,326 C101,334 98,350 98,366 C98,380 101,390 106,392 C112,393 117,386 118,372 C119,356 115,336 107,326 Z",
    "M153,326 C159,334 162,350 162,366 C162,380 159,390 154,392 C148,393 143,386 142,372 C141,356 145,336 153,326 Z",
  ],
};

const muscleOrder = Object.keys(anatomy) as MuscleId[];

function verdictFor(ratio: number) {
  if (ratio > 1) return "Перебор — снизьте объём на следующей неделе";
  if (ratio >= 0.8) return "Объём набран, можно добавлять вес";
  if (ratio >= 0.5) return "В норме, но есть куда расти";
  return "Отстаёт — добавьте подходы";
}

export default function MuscleMap() {
  const [selected, setSelected] = useState<MuscleId>("delts");

  const loads = useMemo(
    () => new Map(demoLoads.map((l) => [l.muscleId, l])),
    []
  );
  const load = loads.get(selected)!;
  const exercises = useMemo(() => exercisesFor(selected), [selected]);
  const over = load.ratio > 1;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      {/* ── Схема человека ─────────────────────────────────────────────── */}
      <div className="card card-lit p-6 sm:p-8">
        <p className="kicker">Схема тела</p>
        <p className="mt-3 text-sm text-dim">
          Недельный объём по группам. Построено из профиля{" "}
          <span className="text-bright">182 см · 78 кг · 24 года</span> и
          записанных тренировок.
        </p>

        <svg
          viewBox="0 0 260 420"
          className="mx-auto mt-6 w-full max-w-[300px]"
          aria-label="Схема тела: заполненность мышечных групп по недельному объёму"
        >
          <defs>
            {muscleOrder.map((id) => {
              const ratio = loads.get(id)!.ratio;
              const stop = `${Math.min(Math.max(ratio, 0), 1) * 100}%`;
              return (
                // Заливка «снизу вверх»: сколько объёма набрано
                <linearGradient key={id} id={`fill-${id}`} x1="0" y1="1" x2="0" y2="0">
                  <stop offset="0" stopColor="var(--color-accent)" stopOpacity="0.9" />
                  <stop offset={stop} stopColor="var(--color-accent)" stopOpacity="0.9" />
                  <stop offset={stop} stopColor="var(--color-accent)" stopOpacity="0.07" />
                  <stop offset="1" stopColor="var(--color-accent)" stopOpacity="0.07" />
                </linearGradient>
              );
            })}
          </defs>

          {/* Нейтральные части фигуры — не кликаются */}
          <g fill="var(--color-line)" opacity="0.9">
            <ellipse cx="130" cy="32" rx="19" ry="23" />
            <path d="M119,52 L141,52 L143,70 L117,70 Z" />
            <path d="M108,194 C110,206 116,214 130,214 C144,214 150,206 152,194 Z" />
            <ellipse cx="111" cy="316" rx="11" ry="9" />
            <ellipse cx="149" cy="316" rx="11" ry="9" />
            <ellipse cx="61" cy="233" rx="8" ry="10" />
            <ellipse cx="199" cy="233" rx="8" ry="10" />
            <ellipse cx="106" cy="400" rx="10" ry="7" />
            <ellipse cx="154" cy="400" rx="10" ry="7" />
          </g>

          {/* Мышечные группы */}
          {muscleOrder.map((id) => {
            const isActive = id === selected;
            const isOver = loads.get(id)!.ratio > 1;
            return (
              <g
                key={id}
                role="button"
                tabIndex={0}
                aria-label={`${muscleNames[id]}: ${loads.get(id)!.setsDone} из ${
                  loads.get(id)!.setsTarget
                } подходов`}
                aria-pressed={isActive}
                onClick={() => setSelected(id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelected(id);
                  }
                }}
                className="cursor-pointer outline-none"
              >
                {anatomy[id].map((d, i) => (
                  <path
                    key={i}
                    d={d}
                    fill={`url(#fill-${id})`}
                    stroke={
                      isActive ? "var(--color-accent-hi)" : "var(--color-accent-dim)"
                    }
                    strokeWidth={isActive ? 1.6 : 0.8}
                    className="transition-all duration-200"
                    style={
                      isActive
                        ? { filter: "drop-shadow(0 0 8px rgb(111 159 216 / 0.55))" }
                        : undefined
                    }
                  />
                ))}
                {/* Перебор объёма — пульсирующий контур */}
                {isOver &&
                  anatomy[id].map((d, i) => (
                    <path
                      key={`over-${i}`}
                      d={d}
                      fill="none"
                      stroke="var(--color-accent-hi)"
                      strokeWidth="1.4"
                      strokeDasharray="3 3"
                      className="aura pointer-events-none"
                    />
                  ))}
              </g>
            );
          })}
        </svg>

        <p className="mt-4 text-center text-xs text-dim">
          Нажмите на мышцу — покажем упражнения именно под неё
        </p>
      </div>

      {/* ── Разбор выбранной группы ────────────────────────────────────── */}
      <div className="card card-lit flex flex-col p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="kicker">Выбрана группа</p>
            <h3 className="mt-2 font-serif text-4xl font-light tracking-wide text-accent-hi">
              {muscleNames[selected]}
            </h3>
          </div>
          <div className="text-right">
            <p className="font-serif text-3xl font-light text-bright">
              {load.setsDone}
              <span className="text-dim">/{load.setsTarget}</span>
            </p>
            <p className="kicker mt-1">подходов за неделю</p>
          </div>
        </div>

        <div className="meter mt-5">
          <span style={{ width: `${Math.min(load.ratio, 1) * 100}%` }} />
        </div>

        <div className="callout mt-5">
          <p className="text-sm text-bright">{verdictFor(load.ratio)}</p>
          {over && (
            <p className="mt-1 text-xs text-dim">
              Сделано {load.setsDone} подходов при целевых {load.setsTarget} —
              это уже работа в минус восстановлению.
            </p>
          )}
        </div>

        <p className="kicker mt-7">Упражнения по эффективности</p>
        <ul className="mt-4 flex flex-col gap-2.5">
          {exercises.map((ex, i) => (
            <li
              key={ex.id}
              className="reveal rounded-[14px] border border-line bg-accent/[0.03] p-3.5 transition-colors hover:border-accent-dim"
              style={{ "--i": i } as React.CSSProperties}
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm text-bright">{ex.name}</span>
                <span className="font-serif text-xl font-light text-accent">
                  {ex.effectiveness}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="chip">
                  Сложность: {difficultyLabels[ex.difficulty]}
                </span>
                <span className="chip">{equipmentLabels[ex.equipment]}</span>
                {ex.secondary.map((s) => (
                  <span key={s} className="text-[10px] text-dim">
                    + {muscleNames[s]}
                  </span>
                ))}
              </div>
              {ex.note && <p className="mt-2 text-xs text-dim">{ex.note}</p>}
            </li>
          ))}
        </ul>

        <p className="mt-5 text-xs text-dim">
          Цифра справа — эффективность упражнения для этой мышцы, 0–100.
        </p>
      </div>
    </div>
  );
}
