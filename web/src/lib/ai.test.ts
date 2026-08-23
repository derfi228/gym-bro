import { strict as assert } from "node:assert";
import { test } from "node:test";
import { exerciseByName, muscleByName, musclesFrom, runTool } from "./ai.ts";
import type { MuscleId } from "@shared/types";

test("группа находится по названию, в том числе неточному", () => {
  assert.equal(muscleByName("Грудь"), "chest");
  assert.equal(muscleByName("грудь"), "chest");
  assert.equal(muscleByName("Бицепс бедра"), "hamstrings");
  // Модель часто пишет с ё или без
  assert.equal(muscleByName("Икры"), "calves");
  assert.equal(muscleByName("выдуманная мышца"), null);
});

test("упражнение находится по названию", () => {
  assert.equal(exerciseByName("Жим штанги лёжа")?.id, "bb-bench");
  assert.equal(exerciseByName("жим штанги лежа")?.id, "bb-bench", "ё и регистр");
  assert.equal(exerciseByName("такого нет"), null);
});

test("неизвестные группы отбрасываются, а не превращаются в чужие", () => {
  assert.deepEqual(musclesFrom(["Грудь", "чепуха", "Спина"]), [
    "chest",
    "back",
  ]);
  assert.deepEqual(musclesFrom("не массив"), []);
  assert.deepEqual(musclesFrom([1, null]), []);
});

const call = (name: string, args: unknown) => ({
  id: "c1",
  type: "function" as const,
  function: { name, arguments: JSON.stringify(args) },
});

test("время тренировки загоняется в те же рамки, что и в интерфейсе", async () => {
  const seen: number[] = [];
  const deps = {
    buildProgram: (m: number) => {
      seen.push(m);
      return "ок";
    },
    showOnBody: () => "ок",
  };
  await runTool(call("build_program", { minutes: 5 }), deps);
  await runTool(call("build_program", { minutes: 500 }), deps);
  await runTool(call("build_program", { minutes: 45 }), deps);
  assert.deepEqual(seen, [30, 120, 45]);
});

test("испорченные аргументы не роняют выполнение", async () => {
  const deps = { buildProgram: () => "ок", showOnBody: () => "ок" };
  const broken = {
    id: "c1",
    type: "function" as const,
    function: { name: "build_program", arguments: "{не json" },
  };
  assert.match(await runTool(broken, deps), /аргумент/i);
  assert.match(
    await runTool(call("build_program", {}), deps),
    /время/i,
    "без минут действие выполнять нельзя",
  );
});

test("неизвестное действие сообщается модели, а не игнорируется", async () => {
  const deps = { buildProgram: () => "ок", showOnBody: () => "ок" };
  assert.match(
    await runTool(call("udali_vsyo", {}), deps),
    /Неизвестное действие/,
  );
});

test("подсветка без узнанных групп не зовёт приложение", async () => {
  let called = false;
  const deps = {
    buildProgram: () => "ок",
    showOnBody: (m: MuscleId[]) => {
      called = true;
      return String(m);
    },
  };
  const out = await runTool(call("show_on_body", { muscles: ["чепуха"] }), deps);
  assert.equal(called, false);
  assert.match(out, /нет/i);
});
