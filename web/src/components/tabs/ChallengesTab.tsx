"use client";

import { useState } from "react";
import { FlameIcon } from "@/components/icons";

type Challenge = {
  id: string;
  title: string;
  done: number;
  goal: number;
  friend: boolean;
};

const initial: Challenge[] = [
  { id: "gym3", title: "Сходить в зал 3 раза", done: 2, goal: 3, friend: false },
  { id: "legs", title: "Не пропустить ноги", done: 1, goal: 1, friend: false },
  { id: "calves", title: "Добить икры до нормы", done: 3, goal: 8, friend: false },
  { id: "duo", title: "Вдвоём: 6 тренировок", done: 4, goal: 6, friend: true },
];

export default function ChallengesTab() {
  const [items, setItems] = useState(initial);

  function bump(id: string) {
    setItems((list) =>
      list.map((c) =>
        c.id === id ? { ...c, done: Math.min(c.goal, c.done + 1) } : c
      )
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Серия */}
      <div className="card card-lit flex flex-wrap items-center justify-between gap-4 px-5 py-5">
        <div className="flex items-center gap-3">
          <span className="text-accent">
            <FlameIcon className="h-7 w-7" />
          </span>
          <div>
            <p className="font-serif text-3xl font-light text-bright">
              7 <span className="text-dim text-base">недель</span>
            </p>
            <p className="kicker mt-1">серия с Артёмом</p>
          </div>
        </div>
        <p className="max-w-xs text-xs leading-relaxed text-dim">
          Если один пропускает неделю — гаснет у обоих
        </p>
      </div>

      {/* Челленджи недели */}
      <ul className="grid gap-3 sm:grid-cols-2">
        {items.map((c, i) => {
          const pct = Math.round((c.done / c.goal) * 100);
          const done = c.done >= c.goal;
          return (
            <li
              key={c.id}
              className="card card-lit reveal p-5"
              style={{ "--i": i } as React.CSSProperties}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-[15px] leading-snug text-bright">{c.title}</p>
                {c.friend && <span className="chip">с другом</span>}
              </div>

              <p className="mt-5 font-serif text-4xl font-light text-accent">
                {c.done}
                <span className="text-dim">/{c.goal}</span>
              </p>

              <div className="meter mt-3">
                <span style={{ width: `${pct}%` }} />
              </div>

              <div className="mt-4 flex items-center justify-between gap-3">
                <span className="text-xs text-dim">
                  {done ? "Закрыто" : `Осталось ${c.goal - c.done}`}
                </span>
                {!done && (
                  <button
                    onClick={() => bump(c.id)}
                    className="btn-ghost px-4 py-1.5 text-[11px]"
                  >
                    Отметить
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
