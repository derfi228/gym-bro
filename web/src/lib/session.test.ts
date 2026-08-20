import { test } from "node:test";
import assert from "node:assert/strict";
import {
  adjustKg,
  clock,
  COUNTDOWN,
  countdownLeft,
  completeSet,
  isDone,
  lowReps,
  mmss,
  pause,
  resume,
  startSession,
  suggestKg,
} from "./session.ts";

const slots = [
  { exerciseId: "a", sets: 2, rest: 60 },
  { exerciseId: "b", sets: 1, rest: 90 },
];

test("подход копится, упражнение сменяется по исчерпании подходов", () => {
  let s = startSession("Тест", slots, 0);

  s = completeSet(s, 0);
  assert.equal(s.index, 0, "первый подход не должен переключать упражнение");
  assert.equal(s.doneSets, 1);
  assert.equal(s.restEnds, 60_000, "отдых берётся из текущего упражнения");

  s = completeSet(s, 60_000);
  assert.equal(s.index, 1, "второй подход закрывает упражнение");
  assert.equal(s.doneSets, 0);

  s = completeSet(s, 120_000);
  assert.ok(isDone(s), "после последнего упражнения тренировка закончена");

  assert.deepEqual(completeSet(s, 0), s, "лишний подход после конца ничего не ломает");
});

test("пауза не съедает время тренировки и отдыха", () => {
  let s = completeSet(startSession("Тест", slots, 0), 0);
  assert.equal(s.restEnds, 60_000);

  s = pause(s, 10_000);
  assert.equal(clock(s, 999_999), 10_000, "на паузе часы стоят");

  s = resume(s, 40_000); // простояли 30 секунд
  assert.equal(
    clock(s, 40_000) - s.startedAt,
    10_000 - COUNTDOWN,
    "простой не засчитался в тренировку"
  );
  assert.equal(s.restEnds, 90_000, "остаток отдыха сохранился");

  assert.deepEqual(resume(s, 50_000), s, "снятие с паузы без паузы ничего не меняет");
});

test("рекомендуемый вес и его правка по ответу", () => {
  assert.equal(suggestKg({ workingKg: 80 }, 8), 80, "рабочий вес важнее пересчёта");
  assert.equal(suggestKg({ peakKg: 100 }, 8), 80, "Эпли: 78.9 → до блина 80");
  assert.equal(suggestKg(undefined, 8), null, "без данных рекомендации нет");

  assert.equal(adjustKg(80, "easy"), 82.5);
  assert.equal(adjustKg(80, "ok"), 80);
  assert.equal(adjustKg(80, "hard"), 77.5);
  assert.equal(adjustKg(80, "failed"), 75);
  assert.equal(adjustKg(2.5, "failed"), 2.5, "ниже блина не опускаемся");
  assert.equal(adjustKg(null, "easy"), null);
});

test("разбор повторов и формат времени", () => {
  assert.equal(lowReps("8–10"), 8);
  assert.equal(lowReps("12"), 12);
  assert.equal(lowReps(undefined), 10);

  assert.equal(mmss(0), "0:00");
  assert.equal(mmss(65), "1:05");
  assert.equal(mmss(-5), "0:00");
});

test("отсчёт перед стартом", () => {
  const s = startSession("Тест", slots, 0);
  assert.equal(countdownLeft(s, 0), 3, "перед стартом три секунды");
  assert.equal(countdownLeft(s, 2_500), 1);
  assert.equal(countdownLeft(s, COUNTDOWN), 0, "после отсчёта ноль");
  assert.equal(countdownLeft(s, 99_999), 0, "и дальше остаётся нулём");
  assert.equal(mmss((0 - s.startedAt) / 1000), "0:00", "часы не уходят в минус");
});
