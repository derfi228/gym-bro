import { strict as assert } from "node:assert";
import { test } from "node:test";
import { demoExercises, muscleMatch, searchText } from "./demo.ts";

const byId = (id: string) => demoExercises.find((e) => e.id === id)!;

test("поиск видит названия групп, а не только названия упражнений", () => {
  assert.ok(searchText(byId("pull-up")).includes("спина"));
  assert.ok(searchText(byId("bb-bench")).includes("трицепс"), "вспомогательные тоже");
});

test("по запросу группы вперёд идут упражнения, где она целевая", () => {
  const pull = muscleMatch(byId("pull-up"), "спина");
  const squat = muscleMatch(byId("back-squat"), "спина");
  assert.ok(pull > squat, `подтягивания ${pull} должны быть выше приседа ${squat}`);
});

test("запрос не про мышцы порядок не трогает", () => {
  assert.equal(muscleMatch(byId("bb-bench"), "жим"), 0);
  assert.equal(muscleMatch(byId("bb-bench"), ""), 0);
});
