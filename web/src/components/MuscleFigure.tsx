"use client";

import type { BodyView, MuscleId } from "@shared/types";

/**
 * Схема мышечных групп: вид спереди и сзади.
 * Каждая мышца нарисована для левой половины, правая — зеркало.
 */

const SILHOUETTE =
  "M170,20 C155,20 147,32 147,49 C147,66 153,80 157,88 L156,99 C142,104 130,108 121,112 C102,120 85,138 81,163 C79,182 80,205 83,228 C85,248 87,268 90,288 C92,306 94,320 96,332 C90,340 86,352 86,363 C86,374 93,380 102,379 C109,378 112,370 111,360 C110,348 109,340 110,332 C112,314 113,300 114,286 C116,268 117,258 117,250 C113,228 110,200 108,172 C107,160 106,152 106,146 C111,170 116,192 121,212 C125,228 127,238 127,247 C127,262 124,274 120,286 C112,298 108,318 107,344 C101,372 107,398 118,422 C122,434 124,444 124,454 C124,470 118,488 121,504 C124,524 131,538 137,552 C134,570 131,584 130,594 L132,601 L165,601 L167,588 C164,574 161,564 159,552 C156,528 153,502 153,478 C153,454 156,440 158,426 C158,398 160,376 162,352 C164,326 167,312 167,300 L170,303 Z";

const FRONT: Partial<Record<MuscleId, string>> = {
  traps: "M155,95 L168,101 L168,122 L126,119 L119,111 Z",
  delts: "M122,112 C104,118 88,134 84,158 L90,180 L112,170 L120,142 Z",
  chest: "M128,124 L166,120 L167,168 L156,180 L130,174 L119,150 Z",
  abs: "M145,183 L167,182 L167,206 L144,207 Z M144,210 L167,209 L167,233 L145,234 Z M145,237 L167,236 L167,260 L147,261 Z M147,264 L167,263 L167,296 L158,308 L151,288 Z",
  obliques: "M120,158 L142,180 L142,240 L137,268 L127,248 L121,208 Z",
  biceps:
    "M99,152 C88,164 84,186 87,208 C90,226 104,230 108,214 C112,192 110,166 99,152 Z",
  forearms: "M93,258 L114,256 L112,290 L106,322 L98,322 L91,290 Z",
  quads: "M112,312 L140,320 L163,326 L159,378 L152,402 L128,414 L116,410 L109,356 Z",
  calves: "M124,444 L152,442 L157,452 L153,488 L146,512 L136,528 L128,506 L121,472 Z",
};

const BACK: Partial<Record<MuscleId, string>> = {
  traps: "M155,94 L168,100 L168,192 L156,174 L130,126 L120,112 Z",
  delts: "M122,112 C104,118 88,134 84,158 L90,180 L112,170 L120,142 Z",
  back: "M124,148 L152,146 L167,196 L167,300 L152,294 L151,268 L134,246 L121,196 Z",
  triceps: "M92,150 L110,158 L109,190 L104,222 L100,246 L94,246 L88,216 L86,178 Z",
  forearms: "M93,258 L114,256 L112,290 L106,322 L98,322 L91,290 Z",
  glutes: "M122,280 L167,272 L167,306 L150,322 L131,316 L118,298 Z",
  hamstrings:
    "M113,330 L140,326 L162,330 L158,382 L150,406 L128,412 L118,408 L111,364 Z",
  calves: "M124,442 L152,440 L157,450 L153,488 L146,512 L136,528 L128,506 L121,470 Z",
};

export const shapesFor = (view: BodyView) => (view === "front" ? FRONT : BACK);

/** На какой проекции искать мышцу */
export function viewOf(id: MuscleId): BodyView {
  return id in FRONT ? "front" : "back";
}

const MIRROR = "translate(340,0) scale(-1,1)";

type Props = {
  /** Значение 0..1 по группам */
  values: Partial<Record<MuscleId, number>>;
  /**
   * fill — заливка снизу вверх (набранный объём за неделю)
   * intensity — равномерная яркость (вовлечённость в упражнение)
   */
  mode?: "fill" | "intensity";
  view: BodyView;
  selected?: MuscleId | null;
  onSelect?: (id: MuscleId) => void;
  labelOf?: (id: MuscleId) => string;
  className?: string;
  /** Префикс для id градиентов — чтобы две схемы на странице не конфликтовали */
  uid?: string;
};

export default function MuscleFigure({
  values,
  mode = "fill",
  view,
  selected = null,
  onSelect,
  labelOf,
  className,
  uid = "mf",
}: Props) {
  const shapes = shapesFor(view);
  const ids = Object.keys(shapes) as MuscleId[];
  const interactive = typeof onSelect === "function";

  return (
    <svg
      viewBox="0 0 340 620"
      className={className}
      // Зазоры между мышцами — цветом фона карточки
      stroke="var(--color-card)"
      strokeWidth={2}
      strokeLinejoin="round"
      aria-label={
        mode === "fill"
          ? "Схема тела: заполненность мышечных групп по недельному объёму"
          : "Схема тела: какие мышцы работают в упражнении"
      }
    >
      <defs>
        {ids.map((id) => {
          const v = Math.min(Math.max(values[id] ?? 0, 0), 1);
          if (mode === "intensity") return null;
          const stop = `${v * 100}%`;
          return (
            <linearGradient
              key={id}
              id={`${uid}-${view}-${id}`}
              x1="0"
              y1="1"
              x2="0"
              y2="0"
            >
              <stop offset="0" stopColor="var(--color-accent)" stopOpacity="0.92" />
              <stop offset={stop} stopColor="var(--color-accent)" stopOpacity="0.92" />
              <stop offset={stop} stopColor="var(--color-accent)" stopOpacity="0.07" />
              <stop offset="1" stopColor="var(--color-accent)" stopOpacity="0.07" />
            </linearGradient>
          );
        })}
      </defs>

      {/* Силуэт */}
      <g fill="var(--color-line)" stroke="none">
        <path d={SILHOUETTE} />
        <path d={SILHOUETTE} transform={MIRROR} />
      </g>

      {ids.map((id) => {
        const d = shapes[id]!;
        const v = Math.min(Math.max(values[id] ?? 0, 0), 1);
        const isActive = id === selected;
        const isOver = (values[id] ?? 0) > 1;

        const fill =
          mode === "fill"
            ? `url(#${uid}-${view}-${id})`
            : "var(--color-accent)";
        // В режиме вовлечённости яркость показывает вклад мышцы
        const opacity = mode === "intensity" ? 0.1 + v * 0.9 : 1;

        const paint = {
          d,
          fill,
          fillOpacity: opacity,
          style: isActive
            ? { filter: "drop-shadow(0 0 6px rgb(111 159 216 / 0.65))" }
            : undefined,
          className: "transition-all duration-200",
        };

        const body = (
          <>
            {/* Заливка. Обводка цветом фона разводит соседние мышцы */}
            <path {...paint} />
            <path {...paint} transform={MIRROR} />

            {/* Контур поверх заливки — чтобы группы читались по отдельности */}
            <g
              fill="none"
              stroke={
                isActive ? "var(--color-accent-hi)" : "var(--color-accent)"
              }
              strokeWidth={isActive ? 2.6 : 1.4}
              strokeOpacity={isActive ? 1 : 0.75}
              className="pointer-events-none transition-all duration-200"
            >
              <path d={d} />
              <path d={d} transform={MIRROR} />
            </g>
            {isOver && mode === "fill" && (
              <g
                className="aura pointer-events-none"
                fill="none"
                stroke="var(--color-accent-hi)"
                strokeWidth="2"
                strokeDasharray="5 4"
              >
                <path d={d} />
                <path d={d} transform={MIRROR} />
              </g>
            )}
          </>
        );

        if (!interactive) return <g key={id}>{body}</g>;

        return (
          <g
            key={id}
            role="button"
            tabIndex={0}
            aria-label={labelOf ? labelOf(id) : id}
            aria-pressed={isActive}
            onClick={() => onSelect!(id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect!(id);
              }
            }}
            className="cursor-pointer outline-none"
          >
            {body}
          </g>
        );
      })}
    </svg>
  );
}
