import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  ageLabel,
  clamp,
  fromRow,
  isComplete,
  limits,
  toRow,
  type ProfileRow,
} from "./profile.ts";

const row: ProfileRow = {
  id: "u1",
  name: "Тест",
  sex: null,
  height_cm: null,
  weight_kg: 78,
  birth_year: 2002,
  level: "novice",
  created_at: "2026-08-23T00:00:00Z",
};

test("пустые поля базы становятся undefined, а не null", () => {
  const p = fromRow(row);
  assert.equal(p.sex, undefined);
  assert.equal(p.heightCm, undefined);
  assert.equal(p.weightKg, 78);
  assert.equal(p.birthYear, 2002);
});

test("частичная правка не затирает остальные поля", () => {
  const patch = toRow({ weightKg: 80 });
  assert.deepEqual(patch, { weight_kg: 80 });
  assert.ok(!("height_cm" in patch), "рост не должен попасть в запрос");
  assert.ok(!("name" in patch), "имя не должно попасть в запрос");
});

test("правка пустым значением доходит до базы", () => {
  // undefined означает «не трогать», поэтому очистка идёт через null
  assert.deepEqual(toRow({ heightCm: undefined }), {});
});

test("значения загоняются в те же рамки, что стоят в базе", () => {
  assert.equal(clamp("300", "heightCm"), limits.heightCm.max);
  assert.equal(clamp("10", "heightCm"), limits.heightCm.min);
  assert.equal(clamp("182", "heightCm"), 182);
  assert.equal(clamp("78.4", "weightKg"), 78);
  assert.equal(clamp("", "weightKg"), undefined);
  assert.equal(clamp("абв", "weightKg"), undefined);
});

test("профиль считается заполненным только целиком", () => {
  assert.equal(isComplete(null), false);
  assert.equal(isComplete(fromRow(row)), false, "нет пола и роста");
  assert.equal(
    isComplete(fromRow({ ...row, sex: "male", height_cm: 182 })),
    true,
  );
});

test("возраст склоняется по-русски", () => {
  const years = (n: number) => ageLabel(n);
  assert.equal(years(1), "1 год");
  assert.equal(years(21), "21 год");
  assert.equal(years(22), "22 года");
  assert.equal(years(24), "24 года");
  assert.equal(years(25), "25 лет");
  assert.equal(years(11), "11 лет", "одиннадцать — исключение");
  assert.equal(years(12), "12 лет");
  assert.equal(years(111), "111 лет");
  assert.equal(years(101), "101 год");
});
