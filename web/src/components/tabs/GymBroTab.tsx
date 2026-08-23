"use client";

import { useEffect, useRef, useState } from "react";
import type { MuscleId, MuscleLoad } from "@shared/types";
import {
  ask,
  runTool,
  type ChatMessage,
  type ToolCall,
  type ToolDeps,
} from "@/lib/ai";
import { useAuth } from "@/lib/auth";
import {
  addFact,
  appendChat,
  clearChat,
  loadChat,
  loadFacts,
  removeFact,
  type Fact,
} from "@/lib/chat";
import { ageFrom, ageLabel } from "@/lib/profile";
import { buildProgram, programMinutes, useStore } from "@/lib/store";
import { exerciseById, muscleNames } from "@/lib/demo";

/** Действие под перепиской: открыть то, что помощник только что сделал */
type Action = { label: string; run: () => void };

/** Одна реплика в ленте. Служебные сообщения инструментов сюда не попадают */
type Bubble = { key: number; kind: "user" | "bot" | "note"; text: string };

const list = (ls: MuscleLoad[]) =>
  ls
    .map(
      (l) =>
        `${muscleNames[l.muscleId].toLowerCase()} ${Math.round(l.setsDone * 10) / 10}/${l.setsTarget}`,
    )
    .join(", ");

/** Подпись под точками: видно, чем помощник занят, а не просто «ждите» */
const statusFor = (tool: string) =>
  ({
    build_program: "собираю тренировку",
    show_on_body: "открываю схему тела",
    exercise_history: "смотрю историю подходов",
    remember: "запоминаю",
  })[tool] ?? "думаю";

const REMEMBERED = "Запомнил: ";

export default function GymBroTab({
  onNavigate,
}: {
  onNavigate: (tab: "body" | "program") => void;
}) {
  const store = useStore();
  const { loads, restrictions, addProgram, openProgram, addRestriction } = store;
  const { selectMuscle } = store;
  const { profile, session } = useAuth();
  const userId = session?.user.id ?? null;

  /** Переписка в том виде, в каком её ждёт модель. Из неё же рисуется лента */
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [facts, setFacts] = useState<Fact[]>([]);
  const [factsOpen, setFactsOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [action, setAction] = useState<Action | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const busy = status !== null;

  // Переписка и память подтягиваются при входе
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    void (async () => {
      const [chat, mem] = await Promise.all([loadChat(), loadFacts()]);
      if (cancelled) return;
      setMessages(chat);
      setFacts(mem);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, status]);

  const profileLine = [
    profile?.heightCm && `${profile.heightCm} см`,
    profile?.weightKg && `${profile.weightKg} кг`,
    profile?.birthYear && ageLabel(ageFrom(profile.birthYear)!),
  ]
    .filter(Boolean)
    .join(" / ");

  /** Что модель знает о человеке на момент вопроса */
  const context = () => ({
    name: profile?.name || undefined,
    sex: profile?.sex,
    heightCm: profile?.heightCm,
    weightKg: profile?.weightKg,
    age: profile?.birthYear ? ageFrom(profile.birthYear) : undefined,
    level: profile?.level,
    avoid: restrictions.map((m) => muscleNames[m]),
    facts: facts.map((f) => f.fact),
    volume: loads.map((l) => ({
      muscle: muscleNames[l.muscleId],
      done: Math.round(l.setsDone * 10) / 10,
      target: l.setsTarget,
      status: l.ratio < 0.5 ? "мало" : l.ratio > 1 ? "перебор" : "в диапазоне",
    })),
  });

  /* ── Инструменты выполняет приложение, модель только просит ───────────── */

  function makeProgram(minutes: number, avoid: MuscleId[], name: string) {
    const p = buildProgram(minutes, loads, { avoid, name, aiGenerated: true });
    addProgram(p);
    setAction({
      label: "Открыть программу",
      run: () => {
        openProgram(p.id);
        onNavigate("program");
      },
    });
    return p;
  }

  const deps: ToolDeps = {
    buildProgram: (minutes, avoid) => {
      const p = makeProgram(
        minutes,
        [...avoid, ...restrictions],
        `GymBro: ${minutes} мин`,
      );
      const names = p.slots
        .map((sl) => exerciseById(sl.exerciseId).name.toLowerCase())
        .join(", ");
      return `Собрана программа на ${programMinutes(p)} мин из ${p.slots.length} упражнений: ${names}. Человек видит кнопку, чтобы её открыть.`;
    },
    showOnBody: (muscles) => {
      // Вкладку не переключаем сами: переход предлагается кнопкой
      selectMuscle(muscles[0]);
      setAction({ label: "Посмотреть на схеме", run: () => onNavigate("body") });
      return `Схема тела переключена на «${muscleNames[muscles[0]]}». Человек видит кнопку, чтобы перейти.`;
    },
    remember: async (fact) => {
      if (!userId) return "Запоминать некуда: человек не вошёл";
      const saved = await addFact(userId, fact);
      if (!saved) return "Такое уже записано";
      setFacts((f) => [...f, saved]);
      return REMEMBERED + saved.fact;
    },
  };

  /* ── Разговор ─────────────────────────────────────────────────────────── */

  async function send(text: string) {
    const question = text.trim();
    if (question === "" || busy) return;
    setDraft("");
    setStatus("думаю");

    const asked: ChatMessage = { role: "user", content: question };
    let convo = [...messages, asked];
    const fresh: ChatMessage[] = [asked];
    setMessages(convo);

    // Круг: спросили — модель могла попросить действие — выполнили и спросили
    // снова. Больше трёх кругов не даём: дальше это обычно петля
    for (let round = 0; round < 3; round++) {
      const res = await ask(context(), convo);

      if ("error" in res) {
        // Ошибку показываем, но в переписку не пишем: модель её не говорила
        setMessages((m) => [...m, { role: "assistant", content: res.error }]);
        break;
      }

      const said: ChatMessage = {
        role: "assistant",
        content: res.message.content,
        ...(res.message.tool_calls
          ? { tool_calls: res.message.tool_calls }
          : {}),
      };
      convo = [...convo, said];
      fresh.push(said);
      setMessages(convo);

      const calls: ToolCall[] = res.message.tool_calls ?? [];
      if (calls.length === 0) break;

      for (const call of calls) {
        setStatus(statusFor(call.function.name));
        const done: ChatMessage = {
          role: "tool",
          tool_call_id: call.id,
          content: await runTool(call, deps),
        };
        convo = [...convo, done];
        fresh.push(done);
        setMessages(convo);
      }
      setStatus("думаю");
    }

    setStatus(null);
    if (userId) await appendChat(userId, fresh);
  }

  async function reset() {
    setMessages([]);
    setAction(null);
    await clearChat();
  }

  async function forget(id: string) {
    setFacts((f) => f.filter((x) => x.id !== id));
    await removeFact(id);
  }

  /* ── Готовые вопросы: считаются на месте, модель не нужна ─────────────── */

  async function say(prompt: string, answer: string) {
    const pair: ChatMessage[] = [
      { role: "user", content: prompt },
      { role: "assistant", content: answer },
    ];
    setMessages((m) => [...m, ...pair]);
    if (userId) await appendChat(userId, pair);
  }

  const actions: { label: string; run: () => void }[] = [
    {
      label: "Что у меня отстаёт?",
      run: () => {
        const lag = [...loads]
          .filter((l) => l.ratio < 0.5)
          .sort((a, b) => a.ratio - b.ratio);
        if (lag.length === 0) {
          void say(
            "Что у меня отстаёт?",
            "Отстающих групп нет — объём разложен ровно.",
          );
          return;
        }
        setAction({ label: "Показать на схеме", run: () => onNavigate("body") });
        void say(
          "Что у меня отстаёт?",
          `Сильнее всего отстают: ${list(lag.slice(0, 3))}.` +
            (profileLine ? `\n\nСчитаю от вашего профиля: ${profileLine}.` : ""),
        );
      },
    },
    {
      label: "Есть перебор?",
      run: () => {
        const over = loads.filter((l) => l.ratio > 1);
        void say(
          "Есть перебор?",
          over.length === 0
            ? "Перебора нет, можно работать в обычном режиме."
            : `Перебор: ${list(over)}.\n\nЭто работа в минус восстановлению. Пропускаю эти группы, пока объём не откатится.`,
        );
      },
    },
    {
      label: "Собери тренировку на 40 минут",
      run: () => {
        const p = makeProgram(40, restrictions, "GymBro: 40 мин");
        const names = p.slots
          .map((s) => exerciseById(s.exerciseId).name.toLowerCase())
          .join(", ");
        void say(
          "Собери тренировку на 40 минут",
          `Готово: ${p.slots.length} упражнений, ${programMinutes(p)} мин.\n\n${names}.`,
        );
      },
    },
    {
      label: "Болит плечо",
      run: () => {
        addRestriction("delts");
        const p = makeProgram(
          40,
          ["delts", ...restrictions],
          "GymBro: без плеч",
        );
        void say(
          "Болит плечо",
          `Убрал плечи из подбора и собрал тренировку без жимов над головой на ${programMinutes(p)} мин.\n\n` +
            "Если через неделю не пройдёт — это к врачу, не ко мне.",
        );
      },
    },
  ];

  /* ── Что видно в ленте ────────────────────────────────────────────────── */

  const bubbles: Bubble[] = messages.flatMap((m, i): Bubble[] => {
    if (m.role === "user") return [{ key: i, kind: "user", text: m.content }];
    if (m.role === "assistant")
      return m.content?.trim()
        ? [{ key: i, kind: "bot", text: m.content.trim() }]
        : [];
    // Из ответов инструментов показываем только отметки о запоминании
    return m.content.startsWith(REMEMBERED)
      ? [{ key: i, kind: "note", text: m.content }]
      : [];
  });

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

      {/* Что помощник запомнил */}
      {facts.length > 0 && (
        <div className="card p-4">
          <button
            onClick={() => setFactsOpen(!factsOpen)}
            aria-expanded={factsOpen}
            className="flex w-full items-center justify-between gap-3 text-left"
          >
            <span className="kicker">Помнит о вас: {facts.length}</span>
            <span className="text-[11px] text-dim">
              {factsOpen ? "свернуть" : "показать"}
            </span>
          </button>
          {factsOpen && (
            <ul className="mt-3 flex flex-col gap-1.5">
              {facts.map((f) => (
                <li
                  key={f.id}
                  className="flex items-center justify-between gap-3 rounded-[12px] border border-line px-3.5 py-2"
                >
                  <span className="text-[13px] text-bright">{f.fact}</span>
                  <button
                    onClick={() => void forget(f.id)}
                    aria-label={`Забыть: ${f.fact}`}
                    title="Забыть"
                    className="shrink-0 text-dim transition-colors hover:text-accent"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="card card-lit flex flex-col gap-3 p-5 sm:p-6">
        {bubbles.length === 0 && !busy && (
          <div className="flex justify-start">
            <div className="max-w-[88%] rounded-[16px] border border-line bg-accent/[0.03] px-4 py-3 text-sm leading-relaxed text-bright">
              <p className="kicker mb-2">GymBro</p>
              <p>
                Я вижу ваш профиль и объём за неделю. Спросите что угодно или
                возьмите готовый вопрос ниже.
              </p>
            </div>
          </div>
        )}

        {bubbles.map((b) =>
          b.kind === "note" ? (
            <p key={b.key} className="text-center text-[11px] text-warm">
              {b.text}
            </p>
          ) : (
            <div
              key={b.key}
              className={`flex ${b.kind === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[88%] rounded-[16px] px-4 py-3 text-sm leading-relaxed ${
                  b.kind === "user"
                    ? "border border-accent-dim bg-accent/10 text-bright"
                    : "border border-line bg-accent/[0.03] text-bright"
                }`}
              >
                {b.kind === "bot" && <p className="kicker mb-2">GymBro</p>}
                <p className="whitespace-pre-line">{b.text}</p>
              </div>
            </div>
          ),
        )}

        {busy && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2.5 rounded-[16px] border border-line bg-accent/[0.03] px-4 py-3">
              <span className="typing" aria-hidden>
                <span />
                <span />
                <span />
              </span>
              <span className="text-[12px] text-dim">{status}</span>
            </div>
          </div>
        )}

        {action && !busy && (
          <div className="flex justify-start">
            <button onClick={action.run} className="btn px-5 py-2 text-[12px]">
              {action.label}
            </button>
          </div>
        )}

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
            placeholder={busy ? "Отвечаю…" : "Спросите что угодно"}
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
          <button
            type="button"
            onClick={() => void reset()}
            disabled={busy || messages.length === 0}
            aria-label="Очистить переписку"
            title="Очистить переписку"
            className="stepper shrink-0 disabled:cursor-default disabled:opacity-35"
          >
            ×
          </button>
        </form>

        <p className="kicker mt-6">Или готовые вопросы</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {actions.map((a) => (
            <button
              key={a.label}
              onClick={a.run}
              disabled={busy}
              className="btn-ghost px-4 py-2 text-left text-[12px] disabled:opacity-40"
            >
              {a.label}
            </button>
          ))}
        </div>
        <p className="mt-4 text-[11px] leading-relaxed text-dim">
          Готовые вопросы считаются на месте и работают без модели. Свободный
          вопрос уходит модели: она видит профиль, объём за неделю и то, что
          запомнила, умеет собрать тренировку, открыть группу на схеме и
          посмотреть историю подходов. Тренировки собирает приложение, а не
          модель — цифры она не выдумывает.
        </p>
      </div>
    </div>
  );
}
