/**
 * Перевод профиля между базой и приложением. Без React — чтобы проверялось
 * отдельно: тут легко потерять поле или обнулить чужое при частичной правке.
 *
 * В базе поля в змеином регистре, в коде — в верблюжьем. Это единственное
 * место, где два написания встречаются.
 */

import type { Sex, TrainingLevel, UserProfile } from "@shared/types";

/** Строка таблицы profiles */
export type ProfileRow = {
  id: string;
  name: string;
  sex: Sex | null;
  height_cm: number | null;
  weight_kg: number | null;
  birth_year: number | null;
  level: TrainingLevel;
  created_at: string;
};

export const fromRow = (r: ProfileRow): UserProfile => ({
  id: r.id,
  name: r.name,
  // В базе пусто — это null, в приложении — undefined
  sex: r.sex ?? undefined,
  heightCm: r.height_cm ?? undefined,
  weightKg: r.weight_kg ?? undefined,
  birthYear: r.birth_year ?? undefined,
  level: r.level,
  createdAt: r.created_at,
});

/**
 * Только те поля, которые правят. Ключ, которого нет в правке, в запрос не
 * попадает: иначе частичное сохранение затрёт остальные поля пустотой.
 */
export function toRow(p: Partial<UserProfile>): Partial<ProfileRow> {
  const row: Partial<ProfileRow> = {};
  if (p.name !== undefined) row.name = p.name;
  if (p.sex !== undefined) row.sex = p.sex;
  if (p.heightCm !== undefined) row.height_cm = p.heightCm;
  if (p.weightKg !== undefined) row.weight_kg = p.weightKg;
  if (p.birthYear !== undefined) row.birth_year = p.birthYear;
  if (p.level !== undefined) row.level = p.level;
  return row;
}

/* ── Границы значений ─────────────────────────────────────────────────────── */

/**
 * Те же рамки стоят проверками в самой базе. Здесь они нужны, чтобы человек
 * увидел поправку сразу, а не получил отказ сервера.
 */
export const limits = {
  heightCm: { min: 100, max: 250 },
  weightKg: { min: 30, max: 300 },
  birthYear: { min: 1900, max: new Date().getFullYear() },
} as const;

/** Число из поля ввода в допустимых границах. Пусто или мусор — undefined */
export function clamp(
  raw: string,
  field: keyof typeof limits,
): number | undefined {
  const n = Number(raw);
  if (raw.trim() === "" || !Number.isFinite(n)) return undefined;
  const { min, max } = limits[field];
  return Math.min(max, Math.max(min, Math.round(n)));
}

/** Заполнено ли столько, чтобы считать по профилю */
export const isComplete = (p: UserProfile | null): boolean =>
  Boolean(p?.heightCm && p?.weightKg && p?.birthYear && p?.sex);

/**
 * «21 год», «24 года», «25 лет». Правило общее для русских счётных форм,
 * поэтому берёт три варианта, а не только годы.
 */
export function plural(n: number, one: string, few: string, many: string) {
  const mod10 = Math.abs(n) % 10;
  const mod100 = Math.abs(n) % 100;
  if (mod100 >= 11 && mod100 <= 14) return many;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
}

/** Полных лет на сегодня. Приблизительно: дня рождения мы не спрашиваем. */
export const ageFrom = (birthYear: number | undefined): number | undefined =>
  birthYear === undefined ? undefined : new Date().getFullYear() - birthYear;

/** Возраст с правильным словом: «24 года» */
export const ageLabel = (age: number) =>
  `${age} ${plural(age, "год", "года", "лет")}`;

export const levelLabels: Record<TrainingLevel, string> = {
  novice: "Новичок",
  intermediate: "Средний",
  advanced: "Опытный",
};

export const sexLabels: Record<Sex, string> = {
  male: "Мужской",
  female: "Женский",
};
