"use client";

import { useMemo, useState } from "react";
import type { MuscleId } from "@shared/types";
import {
  difficultyLabels,
  equipmentLabels,
  evidenceLabels,
  exercisesFor,
  muscleNames,
  scoreLabel,
  sources,
} from "@/lib/demo";
import { useStore } from "@/lib/store";

/**
 * Фигура нарисована половиной (x < 160) и зеркалится по центру.
 * viewBox 0 0 320 720, центральная линия x = 160.
 */
const silhouette = [
  // торс
  "M160,100 C151,101 146,105 143,112 C133,121 118,128 103,137 " +
    "C110,152 116,178 119,204 C122,230 124,258 122,288 " +
    "C120,312 118,330 121,352 C124,376 127,400 127,426 " +
    "C136,432 150,434 160,434 Z",
  // рука
  "M104,136 C88,144 74,160 67,182 C61,203 60,232 61,262 " +
    "C62,288 64,310 66,326 C61,344 56,368 54,392 C52,414 53,432 56,442 " +
    "C51,458 49,478 53,492 C56,502 64,506 71,501 C78,496 80,480 78,462 " +
    "C77,448 77,440 77,434 C81,412 85,386 89,360 C91,344 93,332 94,322 " +
    "C97,298 99,270 100,242 C101,224 105,206 110,196 " +
    "C111,176 110,153 104,136 Z",
  // нога
  "M128,430 C118,446 112,474 111,506 C110,540 113,570 117,592 " +
    "C120,614 122,640 124,662 C126,680 128,694 130,704 " +
    "C122,708 116,712 119,716 L157,716 C156,700 153,682 151,662 " +
    "C148,638 146,614 145,592 C144,566 146,538 148,510 " +
    "C150,480 152,452 153,434 Z",
];

const anatomy: Record<MuscleId, string> = {
  traps:
    "M153,106 C145,113 131,121 111,131 C123,139 141,142 156,143 C156,131 155,117 153,106 Z",
  delts:
    "M103,140 C90,148 79,163 75,181 C72,195 75,207 83,210 C93,213 102,204 107,190 C112,173 111,151 103,140 Z",
  chest:
    "M158,148 C137,146 120,151 112,162 C106,171 108,187 116,197 C127,208 143,213 155,213 C157,213 158,210 158,203 Z",
  abs: "M156,226 C148,227 142,232 139,241 C136,253 136,280 138,306 C140,330 145,348 151,358 C154,362 156,360 156,353 Z",
  obliques:
    "M138,244 C131,250 127,264 125,282 C124,298 126,316 130,330 C134,340 138,345 142,347 C138,328 136,304 136,280 C136,262 137,250 138,244 Z",
  biceps:
    "M96,234 C89,238 84,251 82,268 C80,286 83,303 90,311 C96,317 102,312 103,300 C105,282 103,251 99,239 Z",
  triceps:
    "M81,230 C73,237 68,251 66,270 C64,288 67,305 73,312 C78,318 83,313 83,300 C83,282 82,251 84,237 Z",
  forearms:
    "M70,334 C63,347 58,368 56,392 C54,412 57,430 63,437 C69,443 75,437 76,424 C78,400 78,364 75,345 Z",
  quads:
    "M151,442 C138,446 128,460 122,480 C117,502 115,530 118,554 C121,572 128,581 137,580 C146,579 151,568 152,550 C154,518 154,476 151,442 Z",
  calves:
    "M147,604 C137,608 130,621 127,640 C124,657 125,673 129,682 C134,690 140,687 143,676 C146,657 149,626 147,604 Z",
};

/** Штриховка как на анатомическом атласе */
const detailLines = [
  "M140,252 L156,252",
  "M139,278 L156,278",
  "M139,304 L156,304",
  "M143,330 L156,330",
  "M117,159 C131,153 146,151 158,151",
  "M94,146 C91,164 91,184 95,204",
  "M136,452 C131,484 130,522 134,558",
  "M137,612 C133,632 133,654 136,672",
  "M83,238 C81,264 81,290 84,309",
  "M56,444 C63,447 70,446 76,442",
];

const muscleOrder = Object.keys(anatomy) as MuscleId[];

function verdictFor(ratio: number) {
  if (ratio > 1) return "Перебор";
  if (ratio >= 0.8) return "Объём набран";
  if (ratio >= 0.5) return "В норме";
  return "Отстаёт";
}

const MIRROR = "translate(320,0) scale(-1,1)";

export default function BodyTab() {
  const { loads } = useStore();
  const [selected, setSelected] = useState<MuscleId>("chest");

  const byMuscle = useMemo(
    () => new Map(loads.map((l) => [l.muscleId, l])),
    [loads]
  );
  const load = byMuscle.get(selected)!;
  const exercises = useMemo(() => exercisesFor(selected), [selected]);

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
        {/* ── Фигура ─────────────────────────────────────────────────── */}
        <div className="card card-lit relative overflow-hidden p-5 sm:p-6">
          <div
            aria-hidden
            className="aura pointer-events-none absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 rounded-full"
            style={{
              background:
                "radial-gradient(closest-side, rgb(111 159 216 / 0.16), transparent)",
            }}
          />

          <svg
            viewBox="0 0 320 720"
            className="relative mx-auto w-full max-w-[250px]"
            aria-label="Схема тела: заполненность мышечных групп по недельному объёму"
          >
            <defs>
              {muscleOrder.map((id) => {
                const ratio = byMuscle.get(id)!.ratio;
                const stop = `${Math.min(Math.max(ratio, 0), 1) * 100}%`;
                return (
                  // Заливка снизу вверх: сколько объёма набрано
                  <linearGradient
                    key={id}
                    id={`fill-${id}`}
                    x1="0"
                    y1="1"
                    x2="0"
                    y2="0"
                  >
                    <stop offset="0" stopColor="var(--color-accent)" stopOpacity="0.85" />
                    <stop offset={stop} stopColor="var(--color-accent)" stopOpacity="0.85" />
                    <stop offset={stop} stopColor="var(--color-accent)" stopOpacity="0.06" />
                    <stop offset="1" stopColor="var(--color-accent)" stopOpacity="0.06" />
                  </linearGradient>
                );
              })}
            </defs>

            {/* Силуэт и нейтральные части */}
            <g fill="#141b26" stroke="#233047" strokeWidth="1.2">
              <ellipse cx="160" cy="48" rx="29" ry="39" />
              <path d="M149,80 L171,80 L173,106 L147,106 Z" />
              {silhouette.map((d, i) => (
                <g key={i}>
                  <path d={d} />
                  <path d={d} transform={MIRROR} />
                </g>
              ))}
            </g>

            {/* Мышцы */}
            {muscleOrder.map((id) => {
              const isActive = id === selected;
              const isOver = byMuscle.get(id)!.ratio > 1;
              const d = anatomy[id];
              const stroke = isActive
                ? "var(--color-accent-hi)"
                : "var(--color-accent-dim)";
              const paint = {
                fill: `url(#fill-${id})`,
                stroke,
                strokeWidth: isActive ? 1.8 : 1,
                style: isActive
                  ? { filter: "drop-shadow(0 0 7px rgb(111 159 216 / 0.6))" }
                  : undefined,
                className: "transition-all duration-200",
              };
              return (
                <g
                  key={id}
                  role="button"
                  tabIndex={0}
                  aria-label={`${muscleNames[id]}: ${byMuscle.get(id)!.setsDone} из ${
                    byMuscle.get(id)!.setsTarget
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
                  <path d={d} {...paint} />
                  <g transform={MIRROR}>
                    <path d={d} {...paint} />
                  </g>
                  {isOver && (
                    <g
                      className="aura pointer-events-none"
                      fill="none"
                      stroke="var(--color-accent-hi)"
                      strokeWidth="1.4"
                      strokeDasharray="4 3"
                    >
                      <path d={d} />
                      <path d={d} transform={MIRROR} />
                    </g>
                  )}
                </g>
              );
            })}

            {/* Анатомическая штриховка */}
            <g
              fill="none"
              stroke="var(--color-accent-hi)"
              strokeWidth="0.7"
              opacity="0.4"
              className="pointer-events-none"
            >
              {detailLines.map((d, i) => (
                <g key={i}>
                  <path d={d} />
                  <path d={d} transform={MIRROR} />
                </g>
              ))}
            </g>
          </svg>

          <div className="relative mt-5 flex flex-wrap justify-center gap-1.5">
            {muscleOrder.map((id) => {
              const l = byMuscle.get(id)!;
              return (
                <button
                  key={id}
                  onClick={() => setSelected(id)}
                  aria-pressed={id === selected}
                  className={`rounded-pill border px-3 py-1 text-[11px] transition-colors ${
                    id === selected
                      ? "border-accent bg-accent/12 text-accent-hi"
                      : l.ratio > 1
                        ? "border-accent-dim text-accent"
                        : "border-line text-dim hover:border-accent-dim hover:text-accent"
                  }`}
                >
                  {muscleNames[id]}
                </button>
              );
            })}
          </div>
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
                {ex.note && <p className="mt-2 text-xs text-dim">{ex.note}</p>}
              </li>
            ))}
          </ul>

          <p className="mt-5 text-[11px] leading-relaxed text-dim">
            {sources[exercises[0]?.sourceId ?? "estimate"]?.note}. ЭМГ измеряет
            активацию в моменте, а не прирост мышцы.
          </p>
        </div>
      </div>
    </div>
  );
}
