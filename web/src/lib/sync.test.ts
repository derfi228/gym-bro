import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  isUuid,
  loadsFrom,
  newId,
  programFrom,
  weekStart,
  weightsFrom,
  weightToRow,
  type ProgramRow,
} from "./sync.ts";

test("неделя начинается с понедельника", () => {
  // среда
  assert.equal(weekStart(new Date(2026, 7, 26, 15, 30)).getDate(), 24);
  // сам понедельник остаётся собой
  assert.equal(weekStart(new Date(2026, 7, 24, 0, 1)).getDate(), 24);
  // воскресенье относится к уже идущей неделе, а не к следующей
  const sun = weekStart(new Date(2026, 7, 30, 23, 59));
  assert.equal(sun.getDate(), 24);
  assert.equal(sun.getHours(), 0, "время обнуляется");
});

test("объём считает целевую мышцу целиком, вспомогательную наполовину", () => {
  // Жим лёжа: грудь целевая, трицепс и плечи вовлечены
  const loads = loadsFrom([{ exercise_id: "bb-bench" }]);
  const get = (m: string) => loads.find((l) => l.muscleId === m)!.setsDone;
  assert.equal(get("chest"), 1);
  assert.equal(get("triceps"), 0.5);
  assert.equal(get("back"), 0, "спина в жиме не участвует");
});

test("подходы складываются по всем строкам", () => {
  const rows = [{ exercise_id: "bb-bench" }, { exercise_id: "bb-bench" }];
  const chest = loadsFrom(rows).find((l) => l.muscleId === "chest")!;
  assert.equal(chest.setsDone, 2);
  assert.ok(chest.setsTarget > 0 && chest.ratio === 2 / chest.setsTarget);
});

test("упражнение, которого нет в каталоге, не роняет расчёт", () => {
  const loads = loadsFrom([
    { exercise_id: "bb-bench" },
    { exercise_id: "udalyonnoe-uprazhnenie" },
  ]);
  assert.equal(loads.find((l) => l.muscleId === "chest")!.setsDone, 1);
});

test("пустая неделя даёт нули по всем группам", () => {
  const loads = loadsFrom([]);
  assert.ok(loads.length > 0);
  assert.ok(loads.every((l) => l.setsDone === 0 && l.ratio === 0));
});

test("пустой вес в базе — это null, а не пропущенное поле", () => {
  const w = weightsFrom([
    { exercise_id: "bb-bench", peak_kg: 100, working_kg: null },
  ]);
  assert.equal(w["bb-bench"].peakKg, 100);
  assert.equal(w["bb-bench"].workingKg, undefined);

  const row = weightToRow("u1", w["bb-bench"]);
  assert.equal(row.working_kg, null, "иначе очистка поля не доедет до базы");
  assert.equal(row.user_id, "u1");
});

test("программа без слотов не ломает разбор", () => {
  const row = {
    id: "e0b1",
    name: "Своя",
    target_min: 45,
    slots: null,
    ai_generated: false,
    note: null,
  } as unknown as ProgramRow;
  const p = programFrom(row);
  assert.deepEqual(p.slots, []);
  assert.equal(p.note, undefined);
  assert.equal(p.builtIn, undefined, "из базы приходят только свои");
});

test("идентификаторы программ — uuid, старые не проходят", () => {
  assert.ok(isUuid(newId()));
  assert.equal(isUuid("prog-1787472904-27"), false);
});
