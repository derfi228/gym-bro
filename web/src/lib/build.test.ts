import { strict as assert } from "node:assert";
import { test } from "node:test";
import { buildProgram, orderRank, programMinutes } from "./build.ts";
import { exerciseById, initialLoads } from "./demo.ts";

const sizes = [30, 45, 60, 90, 120];

test("тренировка помещается в отведённое время", () => {
  for (const m of sizes)
    assert.ok(
      programMinutes(buildProgram(m, initialLoads)) <= m,
      `${m} мин: программа длиннее ориентира`,
    );
});

test("получасовая тренировка не пустая", () => {
  const p = buildProgram(30, initialLoads);
  assert.ok(p.slots.length >= 2, `упражнений: ${p.slots.length}`);
});

test("упражнения не повторяются", () => {
  for (const m of sizes) {
    const ids = buildProgram(m, initialLoads).slots.map((s) => s.exerciseId);
    assert.equal(new Set(ids).size, ids.length, `${m} мин: есть дубли`);
  }
});

test("на группу не больше двух упражнений", () => {
  for (const m of sizes) {
    const count = new Map<string, number>();
    for (const s of buildProgram(m, initialLoads).slots) {
      const g = exerciseById(s.exerciseId).primary;
      count.set(g, (count.get(g) ?? 0) + 1);
    }
    for (const [g, n] of count)
      assert.ok(n <= 2, `${m} мин: ${g} — ${n} упражнений`);
  }
});

test("порядок: базовые вперёд, мелкие группы в конец", () => {
  for (const m of sizes) {
    const ranks = buildProgram(m, initialLoads).slots.map((s) =>
      orderRank(exerciseById(s.exerciseId)),
    );
    for (let i = 1; i < ranks.length; i++)
      assert.ok(ranks[i] >= ranks[i - 1], `${m} мин: порядок сбит на ${i}`);
  }
});

test("исключённые группы не попадают в программу", () => {
  const p = buildProgram(60, initialLoads, { avoid: ["chest", "quads"] });
  for (const s of p.slots)
    assert.ok(
      !["chest", "quads"].includes(exerciseById(s.exerciseId).primary),
      `попало ${s.exerciseId}`,
    );
});
