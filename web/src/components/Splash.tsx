"use client";

import { useEffect, useState } from "react";

type Phase = "in" | "out" | "gone";

/** Заставка при входе: логотип проявляется, затем открывается приложение. */
export default function Splash() {
  const [phase, setPhase] = useState<Phase>("in");

  useEffect(() => {
    // При отключённой анимации заставка проскакивает мгновенно — тем же путём,
    // что и обычная, просто с нулевой задержкой
    const quick = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const toOut = setTimeout(() => setPhase("out"), quick ? 0 : 1800);
    const toGone = setTimeout(() => setPhase("gone"), quick ? 0 : 2450);
    return () => {
      clearTimeout(toOut);
      clearTimeout(toGone);
    };
  }, []);

  useEffect(() => {
    // Пока идёт заставка — страница не скроллится
    document.body.style.overflow = phase === "gone" ? "" : "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [phase]);

  if (phase === "gone") return null;

  return (
    <div
      aria-hidden
      className={`fixed inset-0 z-[100] grid place-items-center bg-ink transition-opacity duration-[600ms] ${
        phase === "out" ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      {/* Свечение за логотипом */}
      <div
        className="aura pointer-events-none absolute h-[360px] w-[560px] max-w-[92vw] rounded-full"
        style={{
          background:
            "radial-gradient(closest-side, rgb(111 159 216 / 0.25), transparent)",
        }}
      />

      <div className="relative text-center">
        <p className="splash-word font-serif text-5xl font-light text-bright sm:text-6xl">
          GYM<span className="text-accent">BRO</span>
        </p>
        <div
          className="splash-line mx-auto mt-5 h-px w-56"
          style={{
            background:
              "linear-gradient(90deg, transparent, var(--color-accent), transparent)",
          }}
        />
        <p className="splash-sub kicker mt-5">Тренировки без лишнего</p>
      </div>
    </div>
  );
}
