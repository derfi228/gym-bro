"use client";

/**
 * Всё про аккаунт в одном месте: форма входа, кнопка в шапке, первый экран
 * с выбором и заглушка для разделов, которым нужен аккаунт.
 */

import { useState } from "react";
import { useAuth } from "@/lib/auth";

const GUEST_KEY = "gymbro.guest";

/** Человек уже решил смотреть без аккаунта — больше не спрашиваем */
const chosenGuest = () =>
  typeof window !== "undefined" && localStorage.getItem(GUEST_KEY) === "1";

const field =
  "mt-2 w-full rounded-pill border border-line bg-accent/[0.04] px-4 py-2.5 text-sm text-bright outline-none transition-colors placeholder:text-dim focus:border-accent";

/* ── Форма входа и регистрации ────────────────────────────────────────────── */

function AuthForm() {
  const { panel, closePanel, openPanel, signIn, signUp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const signingUp = panel === "signup";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = signingUp
      ? await signUp(email.trim(), password, name.trim())
      : await signIn(email.trim(), password);
    setBusy(false);
    if (res.error) setError(res.error);
    else if (res.confirmEmail) setSent(true);
  }

  if (sent) {
    return (
      <div className="text-center">
        <p className="font-serif text-3xl font-light text-accent-hi">
          Проверьте почту
        </p>
        <p className="mt-4 text-sm leading-relaxed text-bright">
          На {email} ушло письмо со ссылкой. Откройте её, и аккаунт заработает.
        </p>
        <button onClick={closePanel} className="btn mt-7 w-full">
          Понятно
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <p className="font-serif text-3xl font-light text-bright">
        {signingUp ? "Создать аккаунт" : "Вход"}
      </p>

      {signingUp && (
        <label className="block">
          <span className="kicker">Имя</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            placeholder="Как к вам обращаться"
            className={field}
          />
        </label>
      )}

      <label className="block">
        <span className="kicker">Почта</span>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          placeholder="you@example.com"
          className={field}
        />
      </label>

      <label className="block">
        <span className="kicker">Пароль</span>
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={signingUp ? "new-password" : "current-password"}
          placeholder={signingUp ? "Минимум 6 символов" : "······"}
          className={field}
        />
      </label>

      {error && (
        <p role="alert" className="callout text-sm text-bright">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="btn w-full disabled:cursor-default disabled:opacity-40"
      >
        {busy ? "Секунду…" : signingUp ? "Создать аккаунт" : "Войти"}
      </button>

      <p className="text-center text-[12px] text-dim">
        {signingUp ? "Аккаунт уже есть? " : "Нет аккаунта? "}
        <button
          type="button"
          onClick={() => {
            setError(null);
            openPanel(signingUp ? "signin" : "signup");
          }}
          className="underline underline-offset-2 transition-colors hover:text-accent"
        >
          {signingUp ? "Войти" : "Создать"}
        </button>
      </p>
    </form>
  );
}

/** Форма поверх приложения. Рендерится один раз, в оболочке */
export function AuthOverlay() {
  const { panel, closePanel } = useAuth();
  if (!panel) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Вход в аккаунт"
      onClick={closePanel}
      className="fixed inset-0 z-[90] grid place-items-center bg-ink/80 p-5 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="card card-lit w-full max-w-sm p-6 sm:p-7"
      >
        <AuthForm />
        <button
          onClick={closePanel}
          className="mt-5 w-full text-center text-[12px] text-dim transition-colors hover:text-accent"
        >
          Закрыть
        </button>
      </div>
    </div>
  );
}

/* ── Кнопка в шапке ───────────────────────────────────────────────────────── */

export function AccountButton() {
  const { status, session, profile, signOut, openPanel } = useAuth();

  // Вход не настроен в сборке или сессия ещё читается — место пустое
  if (status === "off" || status === "loading") return null;

  if (status === "out") {
    return (
      <button onClick={() => openPanel("signin")} className="chip-btn">
        Войти
      </button>
    );
  }

  const who = profile?.name?.trim() || session?.user.email || "аккаунт";
  return (
    <div className="flex items-center gap-2">
      <span className="hidden max-w-[16ch] truncate text-[12px] text-dim sm:inline">
        {who}
      </span>
      <button onClick={signOut} className="chip-btn">
        Выйти
      </button>
    </div>
  );
}

/* ── Первый экран: с аккаунтом или посмотреть так ─────────────────────────── */

export function StartGate() {
  const { status, openPanel } = useAuth();
  const [dismissed, setDismissed] = useState(chosenGuest);

  if (status !== "out" || dismissed) return null;

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-ink p-5">
      <div className="card card-lit w-full max-w-sm p-7 text-center">
        <p className="font-serif text-4xl font-light text-bright">
          GYM<span className="text-accent">BRO</span>
        </p>
        <p className="mt-5 text-sm leading-relaxed text-dim">
          С аккаунтом сохраняются ваши тренировки, веса и схема тела — и
          работает помощник. Без него открыт каталог упражнений.
        </p>

        <button onClick={() => openPanel("signup")} className="btn mt-7 w-full">
          Создать аккаунт
        </button>
        <button
          onClick={() => openPanel("signin")}
          className="btn-ghost mt-2.5 w-full py-2.5"
        >
          У меня уже есть
        </button>
        <button
          onClick={() => {
            localStorage.setItem(GUEST_KEY, "1");
            setDismissed(true);
          }}
          className="mt-5 w-full text-[12px] text-dim underline underline-offset-2 transition-colors hover:text-accent"
        >
          Посмотреть без аккаунта
        </button>
      </div>
    </div>
  );
}

/* ── Заглушка закрытого раздела ───────────────────────────────────────────── */

export function NeedsAccount() {
  const { openPanel } = useAuth();
  return (
    <div className="card card-lit p-7 text-center sm:p-9">
      <p className="font-serif text-3xl font-light text-bright">
        Нужен аккаунт
      </p>
      <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-dim">
        Каталог упражнений открыт и без него.
      </p>
      <button onClick={() => openPanel("signup")} className="btn mt-7">
        Создать аккаунт
      </button>
      <button
        onClick={() => openPanel("signin")}
        className="mt-4 block w-full text-[12px] text-dim underline underline-offset-2 transition-colors hover:text-accent"
      >
        Войти
      </button>
    </div>
  );
}
