"use client";

import { useEffect, useMemo, useState } from "react";
import {
  buildProgram,
  programMinutes,
  slotCost,
  useStore,
  type Program,
} from "@/lib/store";
import {
  difficultyLabels,
  equipmentLabels,
  evidenceLabels,
  exerciseById,
  exercisesFor,
  muscleNames,
  scoreLabel,
  sources,
} from "@/lib/demo";

const RING = 2 * Math.PI * 86;

const mmss = (t: number) =>
  `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;

export default function ProgramTab() {
  const store = useStore();
  const { programs, activeProgramId, openProgram } = store;
  const [openSlot, setOpenSlot] = useState<string | null>(null);

  const program = programs.find((p) => p.id === activeProgramId) ?? null;

  // Сброс выбранного упражнения при смене программы
  useEffect(() => setOpenSlot(null), [activeProgramId]);

  if (!program) return <ProgramList />;
  if (openSlot)
    return (
      <ExerciseDetail
        program={program}
        slotKey={openSlot}
        onBack={() => setOpenSlot(null)}
      />
    );
  return (
    <ProgramDetail
      program={program}
      onBack={() => openProgram(null)}
      onOpenSlot={setOpenSlot}
    />
  );
}

/* ── Уровень 1: список программ ───────────────────────────────────────────── */

function ProgramList() {
  const { programs, openProgram, addProgram, loads, restrictions } = useStore();
  const [minutes, setMinutes] = useState(40);

  return (
    <div className="flex flex-col gap-4">
      {/* Своё время — произвольное значение, а не набор кнопок */}
      <div className="card card-lit p-5 sm:p-6">
        <p className="kicker">Собрать под своё время</p>

        <div className="mt-5 flex items-end justify-between gap-4">
          <p className="font-serif text-5xl font-light leading-none text-accent-hi">
            {minutes}
            <span className="ml-2 text-base text-dim">мин</span>
          </p>
          <input
            type="number"
            min={10}
            max={120}
            value={minutes}
            onChange={(e) =>
              setMinutes(
                Math.min(120, Math.max(10, Number(e.target.value) || 10))
              )
            }
            aria-label="Длительность тренировки в минутах"
            className="w-20 rounded-pill border border-line bg-accent/[0.04] px-3 py-1.5 text-center text-sm text-bright outline-none focus:border-accent"
          />
        </div>

        <input
          type="range"
          min={10}
          max={120}
          step={1}
          value={minutes}
          onChange={(e) => setMinutes(Number(e.target.value))}
          aria-label="Длительность тренировки"
          className="mt-5 w-full accent-[var(--color-accent)]"
        />
        <div className="mt-1 flex justify-between text-[10px] text-dim">
          <span>10 мин</span>
          <span>120 мин</span>
        </div>

        <button
          onClick={() => {
            const p = buildProgram(minutes, loads, {
              avoid: restrictions,
              name: `Своя на ${minutes} мин`,
            });
            addProgram(p);
            openProgram(p.id);
          }}
          className="btn mt-6 w-full"
        >
          Собрать программу
        </button>
        <p className="mt-3 text-[11px] leading-relaxed text-dim">
          Отстающие группы идут первыми, перебранные пропускаются
        </p>
      </div>

      <p className="kicker px-1">Программы</p>

      <ul className="flex flex-col gap-2.5">
        {programs.map((p, i) => {
          const muscles = [
            ...new Set(p.slots.map((s) => exerciseById(s.exerciseId).primary)),
          ];
          return (
            <li key={p.id}>
              <button
                onClick={() => openProgram(p.id)}
                className="card card-lit reveal w-full p-5 text-left transition-colors hover:border-accent-dim"
                style={{ "--i": i } as React.CSSProperties}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[15px] text-bright">{p.name}</p>
                    <p className="mt-1.5 text-xs text-dim">
                      {p.slots.length} упражнений
                    </p>
                  </div>
                  <p className="shrink-0 font-serif text-3xl font-light text-accent">
                    {programMinutes(p)}
                    <span className="ml-1 text-sm text-dim">мин</span>
                  </p>
                </div>

                <div className="mt-4 flex flex-wrap gap-1.5">
                  {p.aiGenerated && <span className="chip">GymBro</span>}
                  {muscles.map((m) => (
                    <span key={m} className="chip">
                      {muscleNames[m]}
                    </span>
                  ))}
                </div>

                {p.note && (
                  <p className="mt-3 text-xs leading-relaxed text-dim">
                    {p.note}
                  </p>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ── Уровень 2: программа ─────────────────────────────────────────────────── */

function ProgramDetail({
  program,
  onBack,
  onOpenSlot,
}: {
  program: Program;
  onBack: () => void;
  onOpenSlot: (key: string) => void;
}) {
  const { setProgramDuration } = useStore();
  const [restTotal, setRestTotal] = useState(0);
  const [restLeft, setRestLeft] = useState(0);

  useEffect(() => {
    if (restLeft <= 0) return;
    const t = setInterval(() => setRestLeft((v) => Math.max(0, v - 1)), 1000);
    return () => clearInterval(t);
  }, [restLeft]);

  const used = programMinutes(program);
  const progress = restTotal > 0 ? restLeft / restTotal : 0;

  return (
    <div className="flex flex-col gap-4">
      <button onClick={onBack} className="btn-ghost self-start px-4 py-1.5 text-[12px]">
        ← Все программы
      </button>

      <div className="card card-lit p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <h2 className="font-serif text-3xl font-light text-bright">
            {program.name}
          </h2>
          <p className="font-serif text-3xl font-light text-accent">
            {used}
            <span className="ml-1 text-sm text-dim">/ {program.targetMin} мин</span>
          </p>
        </div>

        <input
          type="range"
          min={10}
          max={120}
          step={1}
          value={program.targetMin}
          onChange={(e) =>
            setProgramDuration(program.id, Number(e.target.value))
          }
          aria-label="Изменить длительность программы"
          className="mt-5 w-full accent-[var(--color-accent)]"
        />
        <p className="mt-2 text-[11px] text-dim">
          Двигайте — программа подрежется под новое время
        </p>

        {program.note && (
          <div className="callout mt-5">
            <p className="text-sm leading-relaxed text-bright">{program.note}</p>
          </div>
        )}
      </div>

      <ul className="flex flex-col gap-2.5">
        {program.slots.map((s, i) => {
          const ex = exerciseById(s.exerciseId);
          return (
            <li key={s.key}>
              <button
                onClick={() => onOpenSlot(s.key)}
                className="card reveal w-full p-4 text-left transition-colors hover:border-accent-dim"
                style={{ "--i": i } as React.CSSProperties}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm text-bright">{ex.name}</p>
                    <p className="mt-1 text-xs text-dim">
                      {s.sets} × {s.reps} · отдых {s.rest} с ·{" "}
                      {muscleNames[ex.primary]}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-serif text-lg font-light text-accent">
                      {scoreLabel(ex)}
                    </p>
                    <p className="text-[10px] text-dim">
                      ≈{Math.round(slotCost(s))} мин
                    </p>
                  </div>
                </div>
              </button>
            </li>
          );
        })}
        {program.slots.length === 0 && (
          <li className="card p-6 text-center text-sm text-dim">
            На такое время ничего не помещается — добавьте минут
          </li>
        )}
      </ul>

      {/* Таймер отдыха */}
      <div className="card card-lit flex flex-col items-center p-6">
        <p className="kicker">Отдых</p>
        <div className="relative mt-5 grid place-items-center">
          <svg viewBox="0 0 200 200" className="w-40">
            <circle cx="100" cy="100" r="86" fill="none" stroke="var(--color-line)" strokeWidth="6" />
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
            <p className="font-serif text-4xl font-light text-accent-hi">
              {mmss(restLeft)}
            </p>
            <p className="kicker mt-1.5">
              {restTotal ? `из ${mmss(restTotal)}` : "не запущен"}
            </p>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {program.slots.slice(0, 3).map((s) => (
            <button
              key={s.key}
              onClick={() => {
                setRestTotal(s.rest);
                setRestLeft(s.rest);
              }}
              className="btn-ghost px-3 py-1.5 text-[11px]"
            >
              {s.rest} с
            </button>
          ))}
          <button
            onClick={() => setRestLeft(0)}
            className="btn-ghost px-3 py-1.5 text-[11px]"
          >
            Сброс
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Уровень 3: упражнение ────────────────────────────────────────────────── */

function ExerciseDetail({
  program,
  slotKey,
  onBack,
}: {
  program: Program;
  slotKey: string;
  onBack: () => void;
}) {
  const { swapExercise, logSet } = useStore();
  const [logged, setLogged] = useState(0);

  const slot = program.slots.find((s) => s.key === slotKey)!;
  const ex = exerciseById(slot.exerciseId);
  const alternatives = useMemo(
    () => exercisesFor(ex.primary).filter((a) => a.id !== ex.id),
    [ex]
  );

  return (
    <div className="flex flex-col gap-4">
      <button onClick={onBack} className="btn-ghost self-start px-4 py-1.5 text-[12px]">
        ← {program.name}
      </button>

      <div className="card card-lit p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="font-serif text-3xl font-light leading-tight text-bright">
              {ex.name}
            </h2>
            <p className="mt-2 text-sm text-dim">
              {slot.sets} подхода × {slot.reps} · отдых {slot.rest} с
            </p>
          </div>
          <p className="shrink-0 font-serif text-4xl font-light text-accent">
            {scoreLabel(ex)}
          </p>
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5">
          <span className="chip">{muscleNames[ex.primary]}</span>
          <span className="chip">{evidenceLabels[ex.evidence]}</span>
          <span className="chip">{difficultyLabels[ex.difficulty]}</span>
          <span className="chip">{equipmentLabels[ex.equipment]}</span>
        </div>

        {ex.secondary.length > 0 && (
          <p className="mt-3 text-xs text-dim">
            Также работают: {ex.secondary.map((s) => muscleNames[s]).join(", ")}
          </p>
        )}
        {ex.note && (
          <div className="callout mt-4">
            <p className="text-sm leading-relaxed text-bright">{ex.note}</p>
          </div>
        )}
        <p className="mt-4 text-[11px] leading-relaxed text-dim">
          {sources[ex.sourceId]?.note}
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            onClick={() => {
              logSet(ex.id);
              setLogged((n) => n + 1);
            }}
            className="btn"
          >
            Отметить подход
          </button>
          <p className="text-xs text-dim">
            {logged > 0
              ? `Записано ${logged} — схема тела обновилась`
              : `Запись подхода заполняет ${muscleNames[ex.primary].toLowerCase()} на схеме`}
          </p>
        </div>
      </div>

      <div className="card p-5">
        <p className="kicker">Заменить на ту же группу</p>
        <ul className="mt-4 flex flex-col gap-1.5">
          {alternatives.map((alt) => (
            <li key={alt.id}>
              <button
                onClick={() => {
                  swapExercise(program.id, slot.key, alt.id);
                  onBack();
                }}
                className="flex w-full items-center justify-between gap-3 rounded-[12px] border border-line px-3.5 py-2.5 text-left transition-colors hover:border-accent-dim hover:bg-accent/6"
              >
                <span className="min-w-0">
                  <span className="block truncate text-[13px] text-bright">
                    {alt.name}
                  </span>
                  <span className="text-[10px] text-dim">
                    {evidenceLabels[alt.evidence]} ·{" "}
                    {difficultyLabels[alt.difficulty]} ·{" "}
                    {equipmentLabels[alt.equipment]}
                  </span>
                </span>
                <span className="font-serif text-base font-light text-accent">
                  {scoreLabel(alt)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
