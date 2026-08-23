"use client";

import { useEffect, useRef, useState } from "react";
import {
  difficultyLabels,
  equipmentLabels,
  exerciseById,
  exercisesFor,
  muscleNames,
  scoreLabel,
} from "@/lib/demo";
import {
  adjustKg,
  clock,
  countdownLeft,
  feedbackLabels,
  isDone,
  lowReps,
  mmss,
  suggestKg,
  useStore,
  type Feedback,
} from "@/lib/store";

/** Тикает раз в секунду, пока идёт тренировка */
function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

const answers = Object.keys(feedbackLabels) as Feedback[];

/** Полоски конфетти. Значения фиксированные — без случайности на рендере */
const CONFETTI = Array.from({ length: 28 }, (_, i) => ({
  left: `${(i * 37) % 100}%`,
  "--d": `${((i * 7) % 12) * 0.12}s`,
  background: [
    "var(--color-accent)",
    "var(--color-accent-hi)",
    "var(--color-accent-dim)",
    "var(--color-warm)",
    "var(--color-over)",
  ][i % 5],
})) as React.CSSProperties[];

/** Короткий сигнал через Web Audio — файла и библиотеки не нужно */
function beep(freq: number) {
  const Ctx = window.AudioContext;
  if (!Ctx) return;
  const ctx = new Ctx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.value = freq;
  gain.gain.value = 0.12;
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.14);
  osc.onended = () => void ctx.close();
}

export default function SessionMode() {
  const {
    session,
    weights,
    completeSet,
    skipRest,
    endSession,
    pauseSession,
    resumeSession,
    swapSessionExercise,
  } = useStore();
  const [confirming, setConfirming] = useState(false);
  // Насколько ответ подвинул рабочий вес — иначе он меняется молча
  const [shift, setShift] = useState<{ from: number; to: number } | null>(null);
  // Не флаг, а номер упражнения: на следующем список замен закрыт сам собой
  const [swapAt, setSwapAt] = useState<number | null>(null);
  const now = useNow();

  const left = session ? countdownLeft(session, now) : 0;
  const prev = useRef<number | null>(null);

  // Сигнал на каждую секунду отсчёта, на старте — тон повыше
  useEffect(() => {
    if (!session) return;
    if (prev.current !== null && prev.current !== left && left <= 3)
      beep(left === 0 ? 1320 : 660);
    prev.current = left;
  }, [left, session]);

  if (!session) return null;

  const t = clock(session, now);
  const paused = session.pausedAt !== null;
  const elapsed = (t - session.startedAt) / 1000;
  const restLeft = session.restEnds ? (session.restEnds - t) / 1000 : 0;
  const resting = restLeft > 0;
  const finished = isDone(session);
  const slot = session.slots[session.index];
  const swapping = swapAt === session.index;
  const ex = slot ? exerciseById(slot.exerciseId) : null;
  const kg = slot
    ? suggestKg(weights[slot.exerciseId], lowReps(slot.reps))
    : null;
  // Список короткий, мемоизация тут дороже самого фильтра
  const alternatives = ex
    ? exercisesFor(ex.primary).filter((a) => a.id !== ex.id)
    : [];

  function answer(f: Feedback) {
    const to = adjustKg(kg, f);
    setShift(kg !== null && to !== null && to !== kg ? { from: kg, to } : null);
    completeSet(f);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Шапка: выход, пауза, время тренировки */}
      <div className="card card-lit flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        {confirming ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-bright">
              Вы точно хотите закончить тренировку?
            </span>
            <button onClick={endSession} className="chip-btn">
              Да
            </button>
            <button onClick={() => setConfirming(false)} className="chip-btn">
              Нет
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setConfirming(true)}
              aria-label="Закончить тренировку"
              className="btn-ghost px-4 py-1.5 text-[12px]"
            >
              ← Закончить
            </button>
            {!finished && (
              <button
                onClick={paused ? resumeSession : pauseSession}
                className="chip-btn"
              >
                {paused ? "Продолжить" : "Пауза"}
              </button>
            )}
          </div>
        )}

        <p className="shrink-0 text-right">
          <span
            className={`font-serif text-2xl font-light ${
              paused ? "text-dim" : "text-accent"
            }`}
          >
            {mmss(elapsed)}
          </span>
          <span className="kicker ml-2">{paused ? "пауза" : "идёт"}</span>
        </p>
      </div>

      <p className="kicker px-1">{session.name}</p>

      {left > 0 ? (
        <div className="card card-lit p-10 text-center">
          <p className="kicker">Начинаем</p>
          <p className="mt-4 font-serif text-8xl font-light text-accent-hi">
            {left}
          </p>
        </div>
      ) : finished ? (
        <div className="card card-lit p-8 text-center">
          {CONFETTI.map((style, i) => (
            <span key={i} className="confetti" style={style} />
          ))}

          <p className="relative font-serif text-4xl font-light text-accent-hi">
            Отличная работа
          </p>
          <p className="relative mt-3 text-sm text-bright">
            Тренировка закончена
          </p>
          <p className="relative mt-1 text-sm text-dim">
            {mmss(elapsed)} · {session.slots.length} упражнений ·{" "}
            {session.slots.reduce((n, sl) => n + sl.sets, 0)} подходов
          </p>
          <button onClick={endSession} className="btn relative mt-7">
            Готово
          </button>
        </div>
      ) : resting ? (
        <div className="card card-lit p-6 text-center">
          <p className="kicker">Отдых</p>
          <p className="mt-3 font-serif text-6xl font-light text-accent-hi">
            {mmss(restLeft)}
          </p>
          {shift && (
            <p className="mt-4 text-sm text-warm">
              Рабочий вес: {shift.from} → {shift.to} кг
            </p>
          )}
          <p className="mt-4 text-sm text-dim">
            Дальше: {exerciseById(session.slots[session.index].exerciseId).name}
          </p>
          <button onClick={skipRest} className="btn-ghost mt-6">
            Пропустить отдых
          </button>
        </div>
      ) : (
        <div className="card card-lit p-6">
          <p className="text-xs text-dim">
            Упражнение {session.index + 1} из {session.slots.length}
          </p>
          <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
            <h2 className="font-serif text-4xl font-light text-bright">
              {exerciseById(slot.exerciseId).name}
            </h2>
            {alternatives.length > 0 && (
              <button
                onClick={() => setSwapAt(swapping ? null : session.index)}
                aria-expanded={swapping}
                className="chip-btn shrink-0"
              >
                {swapping ? "Отмена" : "Заменить"}
              </button>
            )}
          </div>
          <p className="mt-3 text-sm text-dim">
            {muscleNames[exerciseById(slot.exerciseId).primary]} · подход{" "}
            {session.doneSets + 1} из {slot.sets}
          </p>

          {swapping ? (
            <div className="mt-5">
              <p className="kicker">
                Другое упражнение на{" "}
                {muscleNames[
                  exerciseById(slot.exerciseId).primary
                ].toLowerCase()}
              </p>
              <ul className="mt-3 flex flex-col gap-1.5">
                {alternatives.map((alt) => (
                  <li key={alt.id}>
                    <button
                      onClick={() => {
                        swapSessionExercise(alt.id);
                        setSwapAt(null);
                      }}
                      className="flex w-full items-center justify-between gap-3 rounded-[12px] border border-line px-3.5 py-2.5 text-left transition-colors hover:border-accent-dim hover:bg-accent/6"
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
                      <span className="shrink-0 font-serif text-base font-light text-accent">
                        {scoreLabel(alt)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[11px] leading-relaxed text-dim">
                Подходы, повторы и отдых останутся прежними, сделанное не
                сгорит. Вес подставится из карточки нового упражнения
              </p>
            </div>
          ) : (
            <>
              <p className="mt-5 font-serif text-3xl font-light text-accent-hi">
                {slot.reps} раз
                {kg !== null ? (
                  <>
                    {" "}
                    <span className="text-dim">с весом</span> {kg} кг
                  </>
                ) : null}
              </p>
              {kg === null && (
                <p className="mt-2 text-[11px] text-dim">
                  Вес не задан — впишите рабочий или пиковый в карточке
                  упражнения, и он начнёт подстраиваться по вашим ответам
                </p>
              )}

              <div className="meter mt-5">
                <span
                  style={{ width: `${(session.doneSets / slot.sets) * 100}%` }}
                />
              </div>

              <p className="kicker mt-6">Как прошёл подход</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {answers.map((f) => (
                  <button
                    key={f}
                    onClick={() => answer(f)}
                    disabled={paused}
                    className="btn-ghost py-2.5 text-[12px] disabled:cursor-default disabled:opacity-35"
                  >
                    {feedbackLabels[f]}
                  </button>
                ))}
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-dim">
                Ответ двигает рабочий вес: легко +2.5 кг, тяжело −2.5, не
                доделал −5
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
