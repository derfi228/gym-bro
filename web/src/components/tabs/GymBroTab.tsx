"use client";

import { useEffect, useRef, useState } from "react";

type Message = { role: "user" | "bot"; text: string };

/** Заготовленные ответы: на сайте помощник только показан, модели здесь нет. */
const replies: { prompt: string; answer: string }[] = [
  {
    prompt: "Хочу пожать 100 кг до конца лета",
    answer:
      "Реально. Сейчас 82,5 кг на 5 повторов — это около 93 кг разового. До дедлайна 14 недель, нужно +7 кг.\n\nСтавлю жим в начало недели, добавляю второй лёгкий день и убираю разведения — они сейчас едят восстановление.",
  },
  {
    prompt: "Сбросить 12 кг за 6 недель",
    answer:
      "Так не выйдет. Это по 2 кг в неделю — на таком дефиците уйдёт мышечная масса, а жим просядет.\n\nРеалистично 5–6 кг за этот срок. Могу собрать план под 6 кг, силовые при этом сохраним.",
  },
  {
    prompt: "Болит плечо, что делать с тренировкой",
    answer:
      "Убираю жим штанги стоя и разведения — там плечо в крайней точке. Оставляю жим гантелей на наклонной с нейтральным хватом и тягу к груди.\n\nОбъём на грудь и спину сохраняется, нагрузка на сустав падает примерно вдвое. Если через неделю не пройдёт — это к врачу, а не ко мне.",
  },
  {
    prompt: "Какой вес взять на жим сегодня",
    answer:
      "В прошлый раз 80 кг × 8, последний подход дался с запасом. Беру 82,5 кг на 8, 8, 7, 6.\n\nЕсли первый подход уйдёт легче ожидаемого — добавим 2,5 кг со следующей недели.",
  },
  {
    prompt: "Почему в программе жим ногами, а не присед",
    answer:
      "На этой неделе квадрицепс уже перебран: 18 подходов при целевых 16. Присед добавил бы нагрузку ещё и на поясницу, а она нужна свежей для тяги в четверг.\n\nЖим ногами даёт почти тот же объём на квадрицепс без осевой нагрузки.",
  },
];

export default function GymBroTab() {
  const [thread, setThread] = useState<Message[]>([
    {
      role: "bot",
      text: "Я веду вашу программу. Спросите про цель, вес на подход или что делать, если что-то болит.",
    },
  ]);
  const [asked, setAsked] = useState<string[]>([]);
  const endRef = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);

  useEffect(() => {
    // Не дёргаем страницу при первой отрисовке
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [thread]);

  function ask(prompt: string, answer: string) {
    setAsked((a) => [...a, prompt]);
    setThread((t) => [...t, { role: "user", text: prompt }]);
    setTimeout(
      () => setThread((t) => [...t, { role: "bot", text: answer }]),
      450
    );
  }

  const remaining = replies.filter((r) => !asked.includes(r.prompt));

  return (
    <div className="flex flex-col gap-4">
      <div className="card flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="chip">GymBro PRO</span>
          <span className="text-xs text-dim">Платная вкладка</span>
        </div>
        <p className="text-xs text-dim">Ответы на сайте — демонстрационные</p>
      </div>

      {/* Диалог */}
      <div className="card card-lit flex flex-col gap-3 p-5 sm:p-6">
        {thread.map((m, i) => (
          <div
            key={i}
            className={`reveal flex ${
              m.role === "user" ? "justify-end" : "justify-start"
            }`}
            style={{ "--i": 0 } as React.CSSProperties}
          >
            <div
              className={`max-w-[85%] whitespace-pre-line rounded-[16px] px-4 py-3 text-sm leading-relaxed ${
                m.role === "user"
                  ? "border border-accent-dim bg-accent/10 text-bright"
                  : "border border-line bg-accent/[0.03] text-bright"
              }`}
            >
              {m.role === "bot" && <p className="kicker mb-2">GymBro</p>}
              {m.text}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {/* Что можно спросить */}
      {remaining.length > 0 && (
        <div className="card p-5">
          <p className="kicker">Спросить</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {remaining.map((r) => (
              <button
                key={r.prompt}
                onClick={() => ask(r.prompt, r.answer)}
                className="btn-ghost px-4 py-2 text-left text-[12px]"
              >
                {r.prompt}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
