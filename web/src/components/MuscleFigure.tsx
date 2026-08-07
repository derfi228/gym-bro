"use client";

import type { BodyView, MuscleId } from "@shared/types";
import type { MuscleStatus } from "@/lib/landmarks";
import {
  BACK,
  BODY_OUTLINE,
  CANVAS,
  FRONT,
  SILHOUETTE_BACK,
  SILHOUETTE_FRONT,
  VIEW_BOX,
} from "@/lib/bodyPaths";

/**
 * Схема мышечных групп: вид спереди и сзади.
 * Контуры лежат в bodyPaths.ts, стороны заданы отдельно — фигура не зеркалится.
 */

export const shapesFor = (view: BodyView) => (view === "front" ? FRONT : BACK);

const silhouetteFor = (view: BodyView) =>
  view === "front" ? SILHOUETTE_FRONT : SILHOUETTE_BACK;

/** На какой проекции искать мышцу */
export function viewOf(id: MuscleId): BodyView {
  return id in FRONT ? "front" : "back";
}

/** Цвет группы по статусу недельного объёма */
const STATUS_COLOR: Record<MuscleStatus, string> = {
  none: "var(--color-idle)",
  low: "var(--color-accent-dim)",
  optimal: "var(--color-accent)",
  high: "var(--color-warm)",
  over: "var(--color-over)",
};

type Props = {
  /** Значение 0..1 по группам */
  values: Partial<Record<MuscleId, number>>;
  /**
   * fill — заливка снизу вверх (набранный объём)
   * intensity — равномерная яркость (вовлечённость в упражнение)
   */
  mode?: "fill" | "intensity";
  /**
   * Статус группы. Задаёт цвет заливки: не затронута, мало, в диапазоне,
   * много, перебор. Без него всё рисуется акцентом.
   */
  statuses?: Partial<Record<MuscleId, MuscleStatus>>;
  view: BodyView;
  selected?: MuscleId | null;
  onSelect?: (id: MuscleId) => void;
  labelOf?: (id: MuscleId) => string;
  className?: string;
  /** Префикс для id масок — чтобы две схемы на странице не конфликтовали */
  uid?: string;
};

export default function MuscleFigure({
  values,
  mode = "fill",
  statuses,
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
  const box = VIEW_BOX[view];

  return (
    <svg
      viewBox={box}
      className={className}
      // Разделителя между путями нет: он резал мышцу на плитки вместо волокон
      stroke="none"
      strokeLinejoin="round"
      aria-label={
        mode === "fill"
          ? "Схема тела: заполненность мышечных групп по недельному объёму"
          : "Схема тела: какие мышцы работают в упражнении"
      }
    >
      <defs>
        {ids.map((id) => (
          // Обрезка по контуру группы: заливка — прямоугольник, который
          // выезжает снизу вверх, поэтому её высоту можно анимировать
          <clipPath key={id} id={`${uid}-${view}-${id}`}>
            {shapes[id]!.map((d, i) => (
              <path key={i} d={d} />
            ))}
          </clipPath>
        ))}
      </defs>

      {/* Тело целиком: промежутки между группами читаются как тело, а не дыры */}
      <g fill="var(--color-line)" stroke="none">
        <path d={BODY_OUTLINE[view]} fillRule="evenodd" />
        {silhouetteFor(view).map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>

      {ids.map((id) => {
        const ds = shapes[id]!;
        const raw = values[id] ?? 0;
        const v = Math.min(Math.max(raw, 0), 1);
        const status = statuses?.[id];
        const isActive = id === selected;
        const isOver = status ? status === "over" : raw > 1;
        const color = status ? STATUS_COLOR[status] : "var(--color-accent)";

        const outlines = ds.map((d, i) => <path key={i} d={d} />);

        const body = (
          <>
            {/* Подложка: группа читается как часть тела, даже когда объёма нет */}
            <g fill={color} fillOpacity={mode === "intensity" ? 0.08 : 0.16}>
              {outlines}
            </g>

            {mode === "intensity" ? (
              <g fill={color} fillOpacity={0.1 + v * 0.9}>
                {outlines}
              </g>
            ) : (
              <g clipPath={`url(#${uid}-${view}-${id})`} stroke="none">
                <rect
                  x={view === "front" ? 0 : CANVAS.width}
                  y="0"
                  width={CANVAS.width}
                  height={CANVAS.height}
                  fill={color}
                  fillOpacity={0.92}
                  className="muscle-fill"
                  style={{ "--v": v } as React.CSSProperties}
                />
              </g>
            )}

            {/*
              Контур поверх заливки. У невыбранной группы он тонкий и
              приглушённый — так внутренние пути читаются как волокна, а не как
              нарезка. Границу показывает выбранная группа.
            */}
            <g
              fill="none"
              stroke={isActive ? "var(--color-accent-hi)" : color}
              // non-scaling-stroke: толщина в пикселях экрана, а не в единицах
              // viewBox. Фигура уменьшается втрое, и без этого обводка
              // становится тоньше пикселя — прорисовка пропадает
              vectorEffect="non-scaling-stroke"
              strokeWidth={isActive ? 2.5 : 1.1}
              strokeOpacity={isActive ? 1 : status === "none" ? 0.45 : 0.7}
              className="pointer-events-none transition-all duration-300"
              style={
                isActive
                  ? { filter: "drop-shadow(0 0 8px rgb(168 200 238 / 0.5))" }
                  : undefined
              }
            >
              {outlines}
            </g>

            {/* Перебор объёма — пунктир поверх */}
            {isOver && mode === "fill" && (
              <g
                className="aura pointer-events-none"
                fill="none"
                stroke="var(--color-over)"
                vectorEffect="non-scaling-stroke"
                strokeWidth="2"
                strokeDasharray="4 3"
              >
                {outlines}
              </g>
            )}
          </>
        );

        const title = labelOf ? <title>{labelOf(id)}</title> : null;

        if (!interactive)
          return (
            <g key={id}>
              {title}
              {body}
            </g>
          );

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
            className="muscle-hit cursor-pointer outline-none"
          >
            {title}
            {body}
          </g>
        );
      })}
    </svg>
  );
}
