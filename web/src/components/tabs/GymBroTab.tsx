"use client";

import { useEffect, useRef, useState } from "react";
import type { MuscleId, MuscleLoad } from "@shared/types";
import { buildProgram, programMinutes, useStore } from "@/lib/store";
import { exerciseById, muscleNames } from "@/lib/demo";

type Msg = {
  role: "user" | "bot";
  text: string;
  cta?: { label: string; run: () => void };
};

const list = (ls: MuscleLoad[]) =>
  ls
    .map(
      (l) =>
        `${muscleNames[l.muscleId].toLowerCase()} ${Math.round(l.setsDone * 10) / 10}/${l.setsTarget}`
    )
    .join(", ");

export default function GymBroTab({
  onNavigate,
}: {
  onNavigate: (tab: "body" | "program") => void;
}) {
  const store = useStore();
  const { loads, restrictions, addProgram, openProgram, addRestriction } = store;

  const [thread, setThread] = useState<Msg[]>([
    {
      role: "bot",
      text: "Я смотрю на ваш недельный объём и собираю программы. Спросите, что отстаёт, или попросите собрать тренировку.",
    },
  ]);
  const endRef = useRef<HTMLDivElement>(null);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [thread]);

  const say = (prompt: string, make: () => Omit<Msg, "role">) => {
    setThread((t) => [...t, { role: "user", text: prompt }]);
    setTimeout(() => {
      const answer = make();
      setThread((t) => [...t, { role: "bot", ...answer }]);
    }, 400);
  };

  /* ── Действия, которые реально меняют приложение ──────────────────────── */

  const askLagging = () =>
    say("Что у меня отстаёт?", () => {
      const lag = [...loads].filter((l) => l.ratio < 0.5).sort((a, b) => a.ratio - b.ratio);
      if (lag.length === 0)
        return { text: "Отстающих групп нет — объём разложен ровно." };
      return {
        text:
          `Сильнее всего отстают: ${list(lag.slice(0, 3))}.\n\n` +
          `Считаю от вашего профиля 182 см / 78 кг / 24 года. ` +
          `Добавлю их в ближайшую тренировку.`,
        cta: {
          label: "Показать на схеме",
          run: () => onNavigate("body"),
        },
      };
    });

  const askOvertrained = () =>
    say("Есть перебор?", () => {
      const over = loads.filter((l) => l.ratio > 1);
      if (over.length === 0)
        return { text: "Перебора нет, можно работать в обычном режиме." };
      return {
        text:
          `Перебор: ${list(over)}.\n\n` +
          `Это работа в минус восстановлению. Убираю эти группы из следующих программ, ` +
          `пока объём не откатится.`,
      };
    });

  const buildFor = (minutes: number) =>
    say(`Собери тренировку на ${minutes} минут`, () => {
      const p = buildProgram(minutes, loads, {
        avoid: restrictions,
        name: `GymBro: ${minutes} мин`,
        note:
          `Собрано под ${minutes} мин. Первыми идут отстающие группы, ` +
          `перебранные пропущены.`,
      });
      addProgram(p);
      const names = p.slots
        .map((s) => exerciseById(s.exerciseId).name.toLowerCase())
        .join(", ");
      const skipped = loads
        .filter((l) => l.ratio > 1)
        .map((l) => muscleNames[l.muscleId].toLowerCase());
      return {
        text:
          `Готово: ${p.slots.length} упражнений, ${programMinutes(p)} мин.\n\n` +
          `${names}.` +
          (skipped.length ? `\n\nПропустил ${skipped.join(", ")} — там перебор.` : ""),
        cta: {
          label: "Открыть программу",
          run: () => {
            openProgram(p.id);
            onNavigate("program");
          },
        },
      };
    });

  const hurtShoulder = () =>
    say("Болит плечо", () => {
      addRestriction("delts");
      const p = buildProgram(40, loads, {
        avoid: ["delts" as MuscleId, ...restrictions],
        name: "GymBro: без плеч",
        note: "Плечо исключено из программы до восстановления.",
      });
      addProgram(p);
      return {
        text:
          "Убрал плечи из подбора и пересобрал тренировку без жимов над головой.\n\n" +
          "Объём на остальные группы сохранён. Если через неделю не пройдёт — это к врачу, не ко мне.",
        cta: {
          label: "Открыть программу",
          run: () => {
            openProgram(p.id);
            onNavigate("program");
          },
        },
      };
    });

  const actions: { label: string; run: () => void }[] = [
    { label: "Что у меня отстаёт?", run: askLagging },
    { label: "Есть перебор?", run: askOvertrained },
    { label: "Собери тренировку на 40 минут", run: () => buildFor(40) },
    { label: "Собери короткую на 20 минут", run: () => buildFor(20) },
    { label: "Болит плечо", run: hurtShoulder },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="card flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="chip">GymBro PRO</span>
          <span className="text-xs text-dim">Платная вкладка</span>
        </div>
        {restrictions.length > 0 && (
          <p className="text-xs text-dim">
            Исключено: {restrictions.map((m) => muscleNames[m]).join(", ")}
          </p>
        )}
      </div>

      <div className="card card-lit flex flex-col gap-3 p-5 sm:p-6">
        {thread.map((m, i) => (
          <div
            key={i}
            className={`reveal flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            style={{ "--i": 0 } as React.CSSProperties}
          >
            <div
              className={`max-w-[88%] rounded-[16px] px-4 py-3 text-sm leading-relaxed ${
                m.role === "user"
                  ? "border border-accent-dim bg-accent/10 text-bright"
                  : "border border-line bg-accent/[0.03] text-bright"
              }`}
            >
              {m.role === "bot" && <p className="kicker mb-2">GymBro</p>}
              <p className="whitespace-pre-line">{m.text}</p>
              {m.cta && (
                <button onClick={m.cta.run} className="btn mt-3.5 px-5 py-2 text-[12px]">
                  {m.cta.label}
                </button>
              )}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <div className="card p-5">
        <p className="kicker">Спросить</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {actions.map((a) => (
            <button
              key={a.label}
              onClick={a.run}
              className="btn-ghost px-4 py-2 text-left text-[12px]"
            >
              {a.label}
            </button>
          ))}
        </div>
        <p className="mt-4 text-[11px] leading-relaxed text-dim">
          Помощник читает ваш реальный объём из схемы тела и создаёт программы во
          вкладке «Программа». Языковой модели на сайте нет — логика подбора
          считается на месте.
        </p>
      </div>
    </div>
  );
}
