"use client";

/**
 * Полоска с данными человека над схемой тела: рост, вес, возраст, уровень.
 * По нажатию раскрывается в форму. Отдельного экрана профиля нет намеренно —
 * эти цифры нужны ровно здесь, рядом со схемой, которая по ним считается.
 */

import { useState } from "react";
import type { Sex, TrainingLevel } from "@shared/types";
import { useAuth } from "@/lib/auth";
import {
  ageFrom,
  ageLabel,
  clamp,
  levelLabels,
  limits,
  sexLabels,
} from "@/lib/profile";

const pill = (active: boolean) =>
  `rounded-pill border px-3 py-1 text-[11px] transition-colors ${
    active
      ? "border-accent bg-accent/12 text-accent-hi"
      : "border-line text-dim hover:border-accent-dim hover:text-accent"
  }`;

const numberField =
  "mt-2 w-full rounded-pill border border-line bg-accent/[0.04] px-3 py-2 text-center text-sm text-bright outline-none transition-colors placeholder:text-dim focus:border-accent";

function NumberField({
  label,
  unit,
  field,
  value,
  onChange,
}: {
  label: string;
  unit: string;
  field: keyof typeof limits;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
}) {
  // Своя строка, чтобы не мешать набирать: рамки применяются при уходе с поля
  const [raw, setRaw] = useState(value === undefined ? "" : String(value));

  return (
    <label className="min-w-[92px] flex-1">
      <span className="kicker block">{label}</span>
      <input
        type="number"
        inputMode="numeric"
        min={limits[field].min}
        max={limits[field].max}
        value={raw}
        placeholder="—"
        onChange={(e) => setRaw(e.target.value)}
        onBlur={() => {
          const v = clamp(raw, field);
          setRaw(v === undefined ? "" : String(v));
          onChange(v);
        }}
        className={numberField}
      />
      <span className="mt-1 block text-center text-[10px] text-dim">{unit}</span>
    </label>
  );
}

export default function ProfileBar({ week }: { week: string }) {
  const { status, profile, saveProfile } = useAuth();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Правки копятся здесь и уходят одним запросом по кнопке
  const [patch, setPatch] = useState<{
    sex?: Sex;
    heightCm?: number;
    weightKg?: number;
    birthYear?: number;
    level?: TrainingLevel;
  }>({});

  // Вход не настроен в сборке — показываем только неделю, профиля нет
  if (status !== "in") {
    return (
      <div className="card flex flex-wrap items-center justify-end gap-3 px-5 py-4">
        <p className="text-xs text-dim">{week}</p>
      </div>
    );
  }

  const cur = {
    sex: patch.sex ?? profile?.sex,
    heightCm: patch.heightCm ?? profile?.heightCm,
    weightKg: patch.weightKg ?? profile?.weightKg,
    birthYear: patch.birthYear ?? profile?.birthYear,
    level: patch.level ?? profile?.level ?? "novice",
  };
  const age = ageFrom(cur.birthYear);
  const filled = [
    cur.heightCm && `${cur.heightCm} см`,
    cur.weightKg && `${cur.weightKg} кг`,
    age && ageLabel(age),
  ].filter(Boolean) as string[];

  async function save() {
    setBusy(true);
    setError(null);
    const res = await saveProfile(patch);
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setPatch({});
    setSaved(true);
    setOpen(false);
  }

  return (
    <div className="card px-5 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          className="flex flex-wrap items-center gap-1.5 text-left"
        >
          {filled.length > 0 ? (
            <>
              {filled.map((t) => (
                <span key={t} className="chip">
                  {t}
                </span>
              ))}
              <span className="chip">{levelLabels[cur.level]}</span>
            </>
          ) : (
            <span className="chip border-accent text-accent-hi">
              Заполнить профиль
            </span>
          )}
          <span className="ml-1 text-[11px] text-dim">
            {open ? "свернуть" : "изменить"}
          </span>
        </button>
        <p className="text-xs text-dim">{week}</p>
      </div>

      {!open && filled.length === 0 && (
        <p className="mt-2.5 text-[11px] leading-relaxed text-dim">
          Рост, вес и возраст нужны, чтобы считать объём под вас, а не по
          среднему человеку
        </p>
      )}

      {open && (
        <div className="mt-5 border-t border-line pt-5">
          <div className="flex flex-wrap gap-4">
            <NumberField
              label="Рост"
              unit="см"
              field="heightCm"
              value={cur.heightCm}
              onChange={(v) => setPatch((p) => ({ ...p, heightCm: v }))}
            />
            <NumberField
              label="Вес"
              unit="кг"
              field="weightKg"
              value={cur.weightKg}
              onChange={(v) => setPatch((p) => ({ ...p, weightKg: v }))}
            />
            <NumberField
              label="Год рождения"
              unit={age ? ageLabel(age) : "год"}
              field="birthYear"
              value={cur.birthYear}
              onChange={(v) => setPatch((p) => ({ ...p, birthYear: v }))}
            />
          </div>

          <p className="kicker mt-5">Пол</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {(Object.keys(sexLabels) as Sex[]).map((s) => (
              <button
                key={s}
                onClick={() => setPatch((p) => ({ ...p, sex: s }))}
                className={pill(cur.sex === s)}
              >
                {sexLabels[s]}
              </button>
            ))}
          </div>

          <p className="kicker mt-5">Опыт</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {(Object.keys(levelLabels) as TrainingLevel[]).map((v) => (
              <button
                key={v}
                onClick={() => setPatch((p) => ({ ...p, level: v }))}
                className={pill(cur.level === v)}
              >
                {levelLabels[v]}
              </button>
            ))}
          </div>

          {error && (
            <p role="alert" className="callout mt-5 text-sm text-bright">
              {error}
            </p>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              onClick={save}
              disabled={busy || Object.keys(patch).length === 0}
              className="btn disabled:cursor-default disabled:opacity-40"
            >
              {busy ? "Сохраняю…" : "Сохранить"}
            </button>
            <p className="text-[11px] text-dim">
              {Object.keys(patch).length === 0
                ? saved
                  ? "Сохранено"
                  : "Измените что-нибудь, чтобы сохранить"
                : "Данные хранятся в вашем аккаунте"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
