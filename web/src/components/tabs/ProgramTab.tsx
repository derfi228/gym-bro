"use client";

import { useEffect, useMemo, useState } from "react";
import type { MuscleId, TrainingSplit } from "@shared/types";
import BodyPanel from "@/components/BodyPanel";
import ExerciseDetail from "@/components/ExerciseDetail";
import {
  buildProgram,
  programMinutes,
  slotCost,
  slotOf,
  splitSlotKey,
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
  splits,
} from "@/lib/demo";
import {
  candidatesFor,
  fixesFor,
  landmarks,
  programSets,
  report,
  SESSION_SHARE,
  statusLabels,
  withWeek,
  type Fix,
} from "@/lib/volume";

const RING = 2 * Math.PI * 86;
const mmss = (t: number) =>
  `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;

export type TabTarget = "body" | "exercises" | "program";

export default function ProgramTab({
  onNavigate,
}: {
  onNavigate: (tab: TabTarget) => void;
}) {
  const { programs, activeProgramId, openProgram } = useStore();
  // Слот помнится вместе с программой: при переходе к другой он сам перестаёт
  // считаться открытым, и сбрасывать его отдельно не нужно
  const [opened, setOpened] = useState<{
    program: string;
    slot: string;
  } | null>(null);

  const program = programs.find((p) => p.id === activeProgramId) ?? null;
  const openSlot = opened?.program === activeProgramId ? opened.slot : null;
  const setOpenSlot = (slot: string | null) =>
    setOpened(
      slot && activeProgramId ? { program: activeProgramId, slot } : null,
    );

  if (!program) return <ProgramList onNavigate={onNavigate} />;
  if (openSlot)
    return (
      <SlotDetail
        program={program}
        slotKey={openSlot}
        onBack={() => setOpenSlot(null)}
      />
    );
  return (
    <ProgramBuilder
      program={program}
      onBack={() => openProgram(null)}
      onOpenSlot={setOpenSlot}
      onNavigate={onNavigate}
    />
  );
}

/* ── Уровень 1: список ────────────────────────────────────────────────────── */

function ProgramList({ onNavigate }: { onNavigate: (tab: TabTarget) => void }) {
  const {
    programs,
    openProgram,
    addProgram,
    removeProgram,
    duplicateProgram,
    startPicker,
    loads,
    restrictions,
  } = useStore();
  const [minutes, setMinutes] = useState(40);
  const [openSplit, setOpenSplit] = useState<string | null>(null);
  const [splitExercise, setSplitExercise] = useState<string | null>(null);

  const split = splits.find((s) => s.id === openSplit) ?? null;

  if (split && splitExercise) {
    return (
      <div className="flex flex-col gap-4">
        <button
          onClick={() => setSplitExercise(null)}
          className="btn-ghost self-start px-4 py-1.5 text-[12px]"
        >
          ← {split.name}
        </button>
        <ExerciseDetail exercise={exerciseById(splitExercise)} />
      </div>
    );
  }

  if (split) {
    return (
      <SplitDetail
        split={split}
        onBack={() => setOpenSplit(null)}
        onOpenExercise={setSplitExercise}
        onNavigate={onNavigate}
      />
    );
  }

  return (
    <div className="stagger flex flex-col gap-4">
      {/* Своё время */}
      <div className="card card-lit p-5 sm:p-6">
        <p className="kicker">Собрать под своё время</p>

        <div className="mt-5 flex items-end justify-between gap-4">
          <p className="font-serif text-5xl font-light leading-none text-accent-hi">
            {minutes}
            <span className="ml-2 text-base text-dim">мин</span>
          </p>
          <input
            type="number"
            min={30}
            max={120}
            value={minutes}
            onChange={(e) =>
              setMinutes(
                Math.min(120, Math.max(30, Number(e.target.value) || 30)),
              )
            }
            aria-label="Длительность тренировки в минутах"
            className="w-20 rounded-pill border border-line bg-accent/[0.04] px-3 py-1.5 text-center text-sm text-bright outline-none focus:border-accent"
          />
        </div>

        <input
          type="range"
          min={30}
          max={120}
          step={1}
          value={minutes}
          onChange={(e) => setMinutes(Number(e.target.value))}
          aria-label="Длительность тренировки"
          className="mt-5 w-full accent-[var(--color-accent)]"
        />
        <div className="mt-1 flex justify-between text-[10px] text-dim">
          <span>30 мин</span>
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

      {/* Своя тренировка из каталога */}
      <div className="card p-5 sm:p-6">
        <p className="kicker">Создать свою программу</p>
        <p className="mt-3 text-[13px] leading-relaxed text-dim">
          Откроется каталог в режиме выбора: отмечаете упражнения, задаёте
          название и подтверждаете галочкой.
        </p>
        <button
          onClick={() => {
            startPicker();
            onNavigate("exercises");
          }}
          className="btn mt-5 w-full"
        >
          Выбрать упражнения
        </button>
      </div>

      {/* Собранные пользователем */}
      <p className="section-label mt-3 px-1">Пользовательские тренировки</p>
      {programs.some((p) => !p.builtIn) ? (
        <ProgramCards
          list={programs.filter((p) => !p.builtIn)}
          openProgram={openProgram}
          duplicateProgram={duplicateProgram}
          removeProgram={removeProgram}
        />
      ) : (
        <p className="card p-6 text-center text-sm text-dim">
          Пока пусто — соберите тренировку под своё время или выберите
          упражнения вручную
        </p>
      )}

      {/* Известные методики */}
      <p className="section-label px-1">Известные методики</p>
      <ul className="flex flex-col gap-2.5">
        {splits.map((s, i) => (
          <li key={s.id}>
            <button
              onClick={() => setOpenSplit(s.id)}
              className="card reveal w-full p-5 text-left transition-colors hover:border-accent-dim"
              style={{ "--i": i } as React.CSSProperties}
            >
              <p className="author">GymBro</p>
              <div className="mt-2 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[15px] text-bright">{s.name}</p>
                  <p className="mt-1.5 text-xs text-dim">
                    {s.daysPerWeek} дн/нед · каждая группа {s.frequencyPerWeek}{" "}
                    {s.frequencyPerWeek === 1 ? "раз" : "раза"} · {s.repRange}{" "}
                    повторов
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-serif text-3xl font-light text-accent">
                    {s.evidenceScore}
                  </p>
                  <p className="kicker mt-0.5">по данным</p>
                </div>
              </div>

              <div className="meter mt-3.5">
                <span style={{ width: `${s.evidenceScore}%` }} />
              </div>

              <p className="mt-3 text-[11px] text-dim">
                {s.days.length}{" "}
                {s.days.length === 1 ? "тренировка" : "тренировки"} в цикле —
                открыть список упражнений
              </p>
            </button>
          </li>
        ))}
      </ul>
      <p className="px-1 text-[11px] leading-relaxed text-dim">
        Оценка отражает, насколько методика ложится на данные о недельном объёме
        и частоте — не на популярность.
      </p>

      {/* Заготовки GymBro */}
      <p className="section-label mt-3 px-1">Разовые тренировки</p>
      <ProgramCards
        list={programs.filter((p) => p.builtIn)}
        openProgram={openProgram}
        duplicateProgram={duplicateProgram}
        removeProgram={removeProgram}
      />
    </div>
  );
}

/* ── Карточки программ ────────────────────────────────────────────────────── */

function ProgramCards({
  list,
  openProgram,
  duplicateProgram,
  removeProgram,
}: {
  list: Program[];
  openProgram: (id: string | null) => void;
  duplicateProgram: (id: string) => string | null;
  removeProgram: (id: string) => void;
}) {
  return (
    <ul className="flex flex-col gap-2.5">
      {list.map((p, i) => {
        const muscles = [
          ...new Set(p.slots.map((s) => exerciseById(s.exerciseId).primary)),
        ];
        return (
          <li key={p.id}>
            <div
              className="card card-lit reveal p-5"
              style={{ "--i": i } as React.CSSProperties}
            >
              <div className="flex items-start justify-between gap-3">
                {p.builtIn ? (
                  <p className="author">GymBro</p>
                ) : (
                  <p className="text-[11px] text-dim">Ваша тренировка</p>
                )}
                {!p.builtIn && (
                  <button
                    onClick={() => removeProgram(p.id)}
                    className="flex shrink-0 items-center gap-1.5 text-[11px] text-dim transition-colors hover:text-over"
                  >
                    <span aria-hidden className="text-base leading-none">
                      ×
                    </span>
                    Удалить
                  </button>
                )}
              </div>

              <button
                onClick={() => openProgram(p.id)}
                className="mt-3 w-full text-left"
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
                <div className="mt-4 flex flex-wrap items-center gap-1.5">
                  {p.builtIn && (
                    <span className="chip">Частично изменяемая</span>
                  )}
                  <span className="chip">Оценка ИИ: {p.aiScore ?? "—"}</span>
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

              <div className="mt-4 flex flex-wrap gap-1.5 border-t border-line pt-3">
                <button
                  onClick={() => {
                    const copy = duplicateProgram(p.id);
                    if (copy) openProgram(copy);
                  }}
                  className="chip-btn"
                >
                  Дублировать
                </button>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/* ── Методика: дни и упражнения ───────────────────────────────────────────── */

function SplitDetail({
  split,
  onBack,
  onOpenExercise,
  onNavigate,
}: {
  split: TrainingSplit;
  onBack: () => void;
  onOpenExercise: (id: string) => void;
  onNavigate: (tab: TabTarget) => void;
}) {
  const { splitSwaps, swapSplitExercise, startSession } = useStore();
  const [editing, setEditing] = useState<string | null>(null);

  const levelLabel =
    split.level === "novice"
      ? "Новичок"
      : split.level === "intermediate"
        ? "Средний"
        : "Продвинутый";

  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={onBack}
        className="btn-ghost self-start px-4 py-1.5 text-[12px]"
      >
        ← Все методики
      </button>

      <div className="card card-lit p-5 sm:p-6">
        <p className="author">GymBro</p>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <h2 className="font-serif text-3xl font-light leading-tight text-bright">
            {split.name}
          </h2>
          <div className="shrink-0 text-right">
            <p className="font-serif text-4xl font-light text-accent">
              {split.evidenceScore}
            </p>
            <p className="kicker mt-0.5">по данным</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5">
          <span className="chip">{split.daysPerWeek} дней в неделю</span>
          <span className="chip">
            группа {split.frequencyPerWeek}{" "}
            {split.frequencyPerWeek === 1 ? "раз" : "раза"} в неделю
          </span>
          <span className="chip">{split.weeklySetsPerMuscle} подходов</span>
          <span className="chip">{split.repRange} повторов</span>
          <span className="chip">{levelLabel}</span>
        </div>

        <div className="callout mt-5">
          <p className="text-sm leading-relaxed text-bright">
            {split.evidenceNote}
          </p>
        </div>
      </div>

      {split.days.map((day, di) => (
        <div key={day.name} className="card p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <p className="kicker">{day.name}</p>
            <div className="flex items-baseline gap-3">
              <p className="text-[11px] text-dim">
                {day.exerciseIds.length} упражнений
              </p>
              <button
                onClick={() => {
                  startSession(
                    `${split.name} · ${day.name}`,
                    day.exerciseIds.map((id, i) =>
                      slotOf(
                        splitSwaps[splitSlotKey(split.id, day.name, id)] ?? id,
                        3,
                        `d${i}`,
                      ),
                    ),
                  );
                  onNavigate("body");
                }}
                className="btn btn-warm px-6 py-2 text-[13px]"
              >
                Начать
              </button>
            </div>
          </div>

          <ul className="mt-4 flex flex-col gap-1.5">
            {day.exerciseIds.map((id, i) => {
              const key = splitSlotKey(split.id, day.name, id);
              const ex = exerciseById(splitSwaps[key] ?? id);
              const swapped = Boolean(splitSwaps[key]);
              const isEditing = editing === key;
              const alternatives = exercisesFor(ex.primary).filter(
                (a) => a.id !== ex.id,
              );

              return (
                <li
                  key={id}
                  className="reveal rounded-[12px] border border-line px-3.5 py-2.5"
                  style={{ "--i": di * 2 + i } as React.CSSProperties}
                >
                  <div className="flex items-center justify-between gap-3">
                    <button
                      onClick={() => onOpenExercise(ex.id)}
                      className="min-w-0 text-left"
                    >
                      <span className="block truncate text-[13px] text-bright">
                        {ex.name}
                      </span>
                      <span className="text-[10px] text-dim">
                        {muscleNames[ex.primary]} ·{" "}
                        {difficultyLabels[ex.difficulty]} ·{" "}
                        {equipmentLabels[ex.equipment]}
                        {swapped && " · заменено"}
                      </span>
                    </button>
                    <span className="shrink-0 font-serif text-base font-light text-accent">
                      {scoreLabel(ex)}
                    </span>
                  </div>

                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    <button
                      onClick={() => setEditing(isEditing ? null : key)}
                      aria-expanded={isEditing}
                      className="chip-btn"
                    >
                      {isEditing ? "Отмена" : "Заменить"}
                    </button>
                    {swapped && (
                      <button
                        onClick={() => swapSplitExercise(key, id)}
                        className="chip-btn"
                      >
                        Вернуть исходное
                      </button>
                    )}
                  </div>

                  {isEditing && (
                    <ul className="mt-2.5 flex flex-col gap-1.5 border-t border-line pt-2.5">
                      {alternatives.map((alt) => (
                        <li key={alt.id}>
                          <button
                            onClick={() => {
                              swapSplitExercise(key, alt.id);
                              setEditing(null);
                            }}
                            className="flex w-full items-center justify-between gap-3 rounded-[10px] px-2.5 py-2 text-left transition-colors hover:bg-accent/6"
                          >
                            <span className="min-w-0">
                              <span className="block truncate text-[12px] text-bright">
                                {alt.name}
                              </span>
                              <span className="text-[10px] text-dim">
                                {difficultyLabels[alt.difficulty]} ·{" "}
                                {equipmentLabels[alt.equipment]}
                              </span>
                            </span>
                            <span className="shrink-0 font-serif text-sm font-light text-accent">
                              {scoreLabel(alt)}
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
      ))}

      <p className="px-1 text-[11px] leading-relaxed text-dim">
        Подходы и повторы задаёт методика; конкретные упражнения можно менять на
        любые для той же группы.
      </p>
    </div>
  );
}

/* ── Уровень 2: конструктор ───────────────────────────────────────────────── */

/** Шаг подходов: минус/плюс вокруг числа */
function SetStepper({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  label: string;
}) {
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => onChange(value - 1)}
        aria-label={`${label}: убрать`}
        className="stepper"
      >
        −
      </button>
      <span className="w-6 text-center font-serif text-lg font-light text-bright">
        {value}
      </span>
      <button
        onClick={() => onChange(value + 1)}
        aria-label={`${label}: добавить`}
        className="stepper"
      >
        +
      </button>
    </div>
  );
}

function ProgramBuilder({
  program,
  onBack,
  onOpenSlot,
  onNavigate,
}: {
  program: Program;
  onBack: () => void;
  onOpenSlot: (key: string) => void;
  onNavigate: (tab: TabTarget) => void;
}) {
  const {
    loads,
    restrictions,
    setProgramDuration,
    setSlotSets,
    addSlot,
    removeSlot,
    moveSlot,
    duplicateProgram,
    removeProgram,
    openProgram,
    startSession,
  } = useStore();

  // Стартовый пресет: показываем как есть, править нечего
  const builtIn = program.builtIn === true;

  // По умолчанию показываем саму тренировку, а не неделю вместе с ней
  const [showWeek, setShowWeek] = useState(false);
  const [picker, setPicker] = useState<MuscleId | null>(null);
  const [restTotal, setRestTotal] = useState(0);
  const [restLeft, setRestLeft] = useState(0);

  useEffect(() => {
    if (restLeft <= 0) return;
    const t = setInterval(() => setRestLeft((v) => Math.max(0, v - 1)), 1000);
    return () => clearInterval(t);
  }, [restLeft]);

  const sets = useMemo(() => programSets(program), [program]);
  const shown = useMemo(
    () => (showWeek ? withWeek(sets, loads) : sets),
    [sets, loads, showWeek],
  );
  // Одну тренировку сравниваем с долей недельного диапазона, неделю — целиком
  const scale = showWeek ? 1 : SESSION_SHARE;
  const fixes = useMemo(
    () => fixesFor(program, { avoid: restrictions, week: loads }),
    [program, restrictions, loads],
  );
  const worked = useMemo(
    () => report(sets, SESSION_SHARE).filter((r) => r.sets > 0),
    [sets],
  );

  const used = programMinutes(program);
  const totalSets = program.slots.reduce((n, s) => n + s.sets, 0);
  const overTime = used > program.targetMin;
  const progress = restTotal > 0 ? restLeft / restTotal : 0;

  function applyFix(f: Fix) {
    if (f.kind === "add" && f.exerciseId) {
      addSlot(program.id, f.exerciseId, f.sets);
      return;
    }
    if (f.kind === "reduce" && f.slotKey) {
      const s = program.slots.find((x) => x.key === f.slotKey);
      if (s) setSlotSets(program.id, f.slotKey, s.sets - f.sets);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={onBack}
        className="btn-ghost self-start px-4 py-1.5 text-[12px]"
      >
        ← Все программы
      </button>

      {/* Шапка: время и объём */}
      <div className="card card-lit p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          {builtIn ? (
            <p className="author">GymBro</p>
          ) : (
            <p className="text-[11px] text-dim">Ваша тренировка</p>
          )}
          {!builtIn && (
            <button
              onClick={() => {
                removeProgram(program.id);
                onBack();
              }}
              className="flex shrink-0 items-center gap-1.5 text-[11px] text-dim transition-colors hover:text-over"
            >
              <span aria-hidden className="text-base leading-none">
                ×
              </span>
              Удалить
            </button>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="font-serif text-3xl font-light text-bright">
              {program.name}
            </h2>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {builtIn && <span className="chip">Частично изменяемая</span>}
              <span className="chip">Оценка ИИ: {program.aiScore ?? "—"}</span>
            </div>
          </div>
          <div className="flex shrink-0 items-baseline gap-5">
            <p className="text-right">
              <span
                className={`font-serif text-3xl font-light ${
                  overTime ? "text-over" : "text-accent"
                }`}
              >
                {used}
              </span>
              <span className="ml-1 text-sm text-dim">
                / {program.targetMin} мин
              </span>
            </p>
            <p className="text-right">
              <span className="font-serif text-3xl font-light text-accent">
                {totalSets}
              </span>
              <span className="ml-1 text-sm text-dim">подходов</span>
            </p>
          </div>
        </div>

        {!builtIn && (
          <input
            type="range"
            min={30}
            max={120}
            step={5}
            value={program.targetMin}
            onChange={(e) =>
              setProgramDuration(program.id, Number(e.target.value))
            }
            aria-label="Ориентир по времени"
            className="mt-5 w-full accent-[var(--color-accent)]"
          />
        )}
        <p className="mt-2 text-[11px] leading-relaxed text-dim">
          {builtIn
            ? "Заготовка GymBro: упражнение можно заменить на другое для той же группы. Остальное — в копии."
            : overTime
              ? `Программа длиннее ориентира на ${used - program.targetMin} мин — снимите подходы или упражнение`
              : `Свободно ещё ${program.targetMin - used} мин`}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              startSession(program.name, program.slots);
              onNavigate("body");
            }}
            disabled={program.slots.length === 0}
            className="btn btn-warm px-6 py-2 text-[13px] disabled:cursor-default disabled:opacity-40"
          >
            Начать тренировку
          </button>
          <button
            onClick={() => {
              const copy = duplicateProgram(program.id);
              if (copy) openProgram(copy);
            }}
            className="chip-btn"
          >
            Дублировать
          </button>
        </div>

        {program.note && (
          <div className="callout mt-5">
            <p className="text-sm leading-relaxed text-bright">
              {program.note}
            </p>
          </div>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
        {/* ── Тело: обновляется на каждое изменение ──────────────────── */}
        <div className="flex flex-col gap-4 lg:sticky lg:top-4">
          <BodyPanel
            sets={shown}
            scale={scale}
            kicker={showWeek ? "Неделя с программой" : "Эта тренировка"}
          >
            <div className="relative mt-4 flex justify-center gap-2">
              <button
                onClick={() => setShowWeek(false)}
                aria-pressed={!showWeek}
                className={`rounded-pill border px-4 py-1.5 text-[11px] transition-colors ${
                  showWeek
                    ? "border-line text-dim hover:border-accent-dim"
                    : "border-accent bg-accent/12 text-accent-hi"
                }`}
              >
                Только тренировка
              </button>
              <button
                onClick={() => setShowWeek(true)}
                aria-pressed={showWeek}
                className={`rounded-pill border px-4 py-1.5 text-[11px] transition-colors ${
                  showWeek
                    ? "border-accent bg-accent/12 text-accent-hi"
                    : "border-line text-dim hover:border-accent-dim"
                }`}
              >
                Неделя целиком
              </button>
            </div>
          </BodyPanel>

          {/* Что нагружает программа */}
          <div className="card p-5">
            <p className="kicker">Объём по группам</p>
            {worked.length === 0 ? (
              <p className="mt-4 text-sm text-dim">
                В программе нет упражнений — ни одна группа не нагружена
              </p>
            ) : (
              <ul className="mt-4 flex flex-col gap-2.5">
                {worked.map((r) => (
                  <li key={r.muscleId} className="flex items-center gap-3">
                    <span className="w-28 shrink-0 text-[13px] text-bright">
                      {muscleNames[r.muscleId]}
                    </span>
                    <span className="meter flex-1">
                      <span
                        style={{
                          width: `${Math.min(r.fill, 1) * 100}%`,
                          background:
                            r.status === "over"
                              ? "var(--color-over)"
                              : r.status === "high"
                                ? "var(--color-warm)"
                                : undefined,
                        }}
                      />
                    </span>
                    <span className="w-24 shrink-0 text-right text-[11px] text-dim">
                      {r.sets} · {statusLabels[r.status].toLowerCase()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-4 text-[11px] leading-relaxed text-dim">
              Подход целевой мышце засчитывается полностью, вспомогательной —
              наполовину. Шкала — от объёма, который разумно взять за одну
              тренировку: половина недельного диапазона.
            </p>
          </div>
        </div>

        {/* ── Правая колонка: правки и упражнения ────────────────────── */}
        <div className="flex flex-col gap-4">
          {/* Дисбалансы. У собранных помощником не показываем: он только что
              составил тренировку, и разбор читался бы как «исправь то, что я
              тебе дал». Разбор считает неделю целиком, а одна тренировка её
              закрыть не может — совет «добавьте ещё» вылезал бы всегда */}
          {!program.aiGenerated && (
            <div className="card card-lit p-5">
              <div className="flex items-baseline justify-between gap-3">
                <p className="kicker">Что поправить</p>
                {!builtIn && fixes.length > 1 && (
                  <button
                    onClick={() => fixes.forEach(applyFix)}
                    className="btn-ghost px-3.5 py-1 text-[11px]"
                  >
                    Применить всё
                  </button>
                )}
              </div>

              {fixes.length === 0 ? (
                <p className="mt-4 text-sm text-bright">
                  Дисбалансов нет: каждая группа либо в рабочем диапазоне, либо
                  исключена.
                </p>
              ) : (
                <ul className="mt-4 flex flex-col gap-2">
                  {fixes.map((f, i) => (
                    <li
                      key={f.id}
                      className="reveal flex items-start justify-between gap-3 rounded-[14px] border border-line bg-accent/[0.03] p-3.5"
                      style={{ "--i": i } as React.CSSProperties}
                    >
                      <div className="min-w-0">
                        <p className="text-[13px] text-bright">
                          {muscleNames[f.muscleId]}
                        </p>
                        <p className="mt-1 text-[11px] leading-relaxed text-dim">
                          {f.text}
                        </p>
                      </div>
                      {builtIn ? (
                        <span className="shrink-0 text-[11px] text-dim">
                          {f.kind === "add" ? `+${f.sets}` : `−${f.sets}`}
                        </span>
                      ) : (
                        <button
                          onClick={() => applyFix(f)}
                          className="btn-ghost shrink-0 px-3.5 py-1 text-[11px]"
                        >
                          {f.kind === "add" ? `+${f.sets}` : `−${f.sets}`}
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-4 text-[11px] leading-relaxed text-dim">
                Границы объёма — ориентиры для среднего человека, переносимость
                различается. Источники в README.
              </p>
            </div>
          )}

          {/* Упражнения */}
          <div className="card p-5">
            <div className="flex items-baseline justify-between gap-3">
              <p className="kicker">Упражнения</p>
              <p className="text-[11px] text-dim">
                {program.slots.length} в списке
              </p>
            </div>

            <ul className="mt-4 flex flex-col gap-2">
              {program.slots.map((s, i) => {
                const ex = exerciseById(s.exerciseId);
                return (
                  <li
                    key={s.key}
                    className="reveal rounded-[14px] border border-line bg-accent/[0.03] p-3.5"
                    style={{ "--i": i } as React.CSSProperties}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <button
                        onClick={() => onOpenSlot(s.key)}
                        className="min-w-0 text-left"
                      >
                        <span className="block truncate text-[14px] text-bright">
                          {ex.name}
                        </span>
                        <span className="mt-1 block text-[11px] text-dim">
                          {muscleNames[ex.primary]} · {s.reps} повторов · отдых{" "}
                          {s.rest} с · ≈{Math.round(slotCost(s))} мин
                        </span>
                      </button>
                      {builtIn ? (
                        <span className="shrink-0 font-serif text-lg font-light text-bright">
                          {s.sets}
                          <span className="ml-1 text-[11px] text-dim">
                            подхода
                          </span>
                        </span>
                      ) : (
                        <SetStepper
                          value={s.sets}
                          label={`Подходы, ${ex.name}`}
                          onChange={(v) => setSlotSets(program.id, s.key, v)}
                        />
                      )}
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      {builtIn ? (
                        <button
                          onClick={() => onOpenSlot(s.key)}
                          className="chip-btn"
                        >
                          Заменить
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => moveSlot(program.id, s.key, -1)}
                            disabled={i === 0}
                            aria-label="Выше"
                            className="chip-btn"
                          >
                            ↑
                          </button>
                          <button
                            onClick={() => moveSlot(program.id, s.key, 1)}
                            disabled={i === program.slots.length - 1}
                            aria-label="Ниже"
                            className="chip-btn"
                          >
                            ↓
                          </button>
                          <button
                            onClick={() => onOpenSlot(s.key)}
                            className="chip-btn"
                          >
                            Заменить
                          </button>
                          <button
                            onClick={() => removeSlot(program.id, s.key)}
                            className="chip-btn"
                          >
                            Убрать
                          </button>
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
              {program.slots.length === 0 && (
                <li className="rounded-[14px] border border-line p-6 text-center text-sm text-dim">
                  {builtIn
                    ? "В программе нет упражнений"
                    : "Пусто — добавьте упражнение ниже"}
                </li>
              )}
            </ul>
          </div>

          {/* Добавление */}
          {!builtIn && (
            <div className="card p-5">
              <p className="kicker">Добавить на группу</p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {report(withWeek(sets, loads)).map((r) => (
                  <button
                    key={r.muscleId}
                    onClick={() =>
                      setPicker(picker === r.muscleId ? null : r.muscleId)
                    }
                    aria-pressed={picker === r.muscleId}
                    className={`rounded-pill border px-3 py-1 text-[11px] transition-colors ${
                      picker === r.muscleId
                        ? "border-accent bg-accent/12 text-accent-hi"
                        : "border-line text-dim hover:border-accent-dim hover:text-accent"
                    }`}
                  >
                    {muscleNames[r.muscleId]}
                    <span className="ml-1.5 text-dim/70">{r.sets}</span>
                  </button>
                ))}
              </div>

              {picker && (
                <>
                  <p className="mt-4 text-[11px] text-dim">
                    Рабочий диапазон за неделю: {landmarks[picker].mavLow}–
                    {landmarks[picker].mavHigh} подходов, потолок{" "}
                    {landmarks[picker].mrv}
                  </p>
                  <ul className="mt-3 flex flex-col gap-1.5">
                    {candidatesFor(program, picker).map((e) => (
                      <li key={e.id}>
                        <button
                          onClick={() => {
                            addSlot(program.id, e.id, 3);
                            setPicker(null);
                          }}
                          className="flex w-full items-center justify-between gap-3 rounded-[12px] border border-line px-3.5 py-2.5 text-left transition-colors hover:border-accent-dim hover:bg-accent/6"
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-[13px] text-bright">
                              {e.name}
                            </span>
                            <span className="text-[10px] text-dim">
                              {evidenceLabels[e.evidence]} ·{" "}
                              {difficultyLabels[e.difficulty]} ·{" "}
                              {equipmentLabels[e.equipment]}
                            </span>
                          </span>
                          <span className="font-serif text-base font-light text-accent">
                            {scoreLabel(e)}
                          </span>
                        </button>
                      </li>
                    ))}
                    {candidatesFor(program, picker).length === 0 && (
                      <li className="text-sm text-dim">
                        Все упражнения этой группы уже в программе
                      </li>
                    )}
                  </ul>
                </>
              )}
            </div>
          )}

          {/* Таймер отдыха */}
          <div className="card card-lit flex flex-col items-center p-6">
            <p className="kicker">Отдых</p>
            <div className="relative mt-5 grid place-items-center">
              <svg viewBox="0 0 200 200" className="w-36">
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
                <p className="font-serif text-4xl font-light text-accent-hi">
                  {mmss(restLeft)}
                </p>
                <p className="kicker mt-1.5">
                  {restTotal ? `из ${mmss(restTotal)}` : "не запущен"}
                </p>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {[...new Set(program.slots.map((s) => s.rest))]
                .sort((a, b) => a - b)
                .slice(0, 3)
                .map((r) => (
                  <button
                    key={r}
                    onClick={() => {
                      setRestTotal(r);
                      setRestLeft(r);
                    }}
                    className="btn-ghost px-3 py-1.5 text-[11px]"
                  >
                    {r} с
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
      </div>
    </div>
  );
}

/* ── Уровень 3: упражнение в программе ────────────────────────────────────── */

function SlotDetail({
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
  const alternatives = exercisesFor(ex.primary).filter((a) => a.id !== ex.id);

  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={onBack}
        className="btn-ghost self-start px-4 py-1.5 text-[12px]"
      >
        ← {program.name}
      </button>

      <ExerciseDetail exercise={ex}>
        <div className="card card-lit p-5 sm:p-6">
          <p className="kicker">В этой программе</p>
          <p className="mt-3 text-sm text-bright">
            {slot.sets} подхода × {slot.reps} · отдых {slot.rest} с
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
                : "Запись подхода заполняет мышцы на схеме"}
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
      </ExerciseDetail>
    </div>
  );
}
