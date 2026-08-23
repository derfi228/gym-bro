"use client";

import { useEffect, useRef, useState } from "react";
import type { MuscleId, MuscleLoad } from "@shared/types";
import { ask, runTool, type ChatMessage, type ToolDeps } from "@/lib/ai";
import { useAuth } from "@/lib/auth";
import { ageFrom, ageLabel } from "@/lib/profile";
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
  const { selectMuscle } = store;
  const { profile } = useAuth();

  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  /** Разговор в том виде, в каком его ждёт модель */
  const history = useRef<ChatMessage[]>([]);

  // Пока профиль пустой, помощник о нём не заикается вместо выдуманных цифр
  const profileLine = [
    profile?.heightCm && `${profile.heightCm} см`,
    profile?.weightKg && `${profile.weightKg} кг`,
    profile?.birthYear && ageLabel(ageFrom(profile.birthYear)!),
  ]
    .filter(Boolean)
    .join(" / ");

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
          (profileLine ? `Считаю от вашего профиля: ${profileLine}. ` : "") +
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

  /** Что модель знает о человеке на момент вопроса */
  const context = () => ({
    name: profile?.name || undefined,
    sex: profile?.sex,
    heightCm: profile?.heightCm,
    weightKg: profile?.weightKg,
    age: profile?.birthYear ? ageFrom(profile.birthYear) : undefined,
    level: profile?.level,
    avoid: restrictions.map((m) => muscleNames[m]),
    volume: loads.map((l) => ({
      muscle: muscleNames[l.muscleId],
      done: Math.round(l.setsDone * 10) / 10,
      target: l.setsTarget,
      status: l.ratio < 0.5 ? "мало" : l.ratio > 1 ? "перебор" : "в диапазоне",
    })),
  });

  /** Инструменты выполняет приложение: модель только просит */
  const deps: ToolDeps = {
    buildProgram: (minutes, avoid) => {
      const p = buildProgram(minutes, loads, {
        avoid,
        name: `GymBro: ${minutes} мин`,
      });
      addProgram(p);
      const names = p.slots
        .map((sl) => exerciseById(sl.exerciseId).name.toLowerCase())
        .join(", ");
      setThread((t) => [
        ...t,
        {
          role: "bot",
          text: `Собрал тренировку на ${programMinutes(p)} мин: ${names}.`,
          cta: {
            label: "Открыть программу",
            run: () => {
              openProgram(p.id);
              onNavigate("program");
            },
          },
        },
      ]);
      return `Собрана программа на ${programMinutes(p)} мин из ${p.slots.length} упражнений: ${names}. Человек видит кнопку, чтобы её открыть.`;
    },
    showOnBody: (muscles) => {
      selectMuscle(muscles[0]);
      onNavigate("body");
      return `Открыл схему тела на группе «${muscleNames[muscles[0]]}».`;
    },
  };

  /**
   * Круг разговора: спросили — модель могла попросить действие — выполнили и
   * спросили снова. Больше трёх кругов не даём: дальше это обычно петля.
   */
  async function send(text: string) {
    const question = text.trim();
    if (question === "" || busy) return;
    setDraft("");
    setBusy(true);
    setThread((t) => [...t, { role: "user", text: question }]);
    history.current = [...history.current, { role: "user", content: question }];

    for (let round = 0; round < 3; round++) {
      const res = await ask(context(), history.current);

      if ("error" in res) {
        setThread((t) => [...t, { role: "bot", text: res.error }]);
        break;
      }

      const msg = res.message;
      history.current = [
        ...history.current,
        { role: "assistant", content: msg.content, tool_calls: msg.tool_calls },
      ];

      if (msg.content?.trim())
        setThread((t) => [...t, { role: "bot", text: msg.content!.trim() }]);

      if (!msg.tool_calls?.length) break;

      for (const call of msg.tool_calls) {
        const result = await runTool(call, deps);
        history.current = [
          ...history.current,
          { role: "tool", tool_call_id: call.id, content: result },
        ];
      }
    }

    setBusy(false);
  }

  const actions: { label: string; run: () => void }[] = [
    { label: "Что у меня отстаёт?", run: askLagging },
    { label: "Есть перебор?", run: askOvertrained },
    { label: "Собери тренировку на 40 минут", run: () => buildFor(40) },
    { label: "Собери короткую на 30 минут", run: () => buildFor(30) },
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
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send(draft);
          }}
          className="flex items-center gap-2.5"
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={busy}
            placeholder={busy ? "Думаю…" : "Спросите что угодно"}
            aria-label="Вопрос помощнику"
            className="min-w-0 flex-1 rounded-pill border border-line bg-accent/[0.04] px-4 py-2.5 text-sm text-bright outline-none transition-colors placeholder:text-dim focus:border-accent disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={busy || draft.trim() === ""}
            className="btn shrink-0 px-5 py-2.5 text-[12px] disabled:cursor-default disabled:opacity-40"
          >
            Спросить
          </button>
        </form>

        <p className="kicker mt-6">Или готовые вопросы</p>
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
          Готовые вопросы считаются на месте и работают мгновенно. Свободный
          вопрос уходит модели: она видит ваш профиль и объём за неделю, умеет
          собрать тренировку, открыть группу на схеме и посмотреть историю
          подходов в упражнении. Сами тренировки собирает приложение, а не
          модель — цифры она не выдумывает.
        </p>
      </div>
    </div>
  );
}
