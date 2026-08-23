"use client";

import { useState } from "react";
import { AuthProvider, useAuth } from "@/lib/auth";
import { StoreProvider } from "@/lib/store";
import Splash from "@/components/Splash";
import {
  AccountButton,
  AuthOverlay,
  NeedsAccount,
  StartGate,
} from "@/components/Account";
import BodyTab from "@/components/tabs/BodyTab";
import ExercisesTab from "@/components/tabs/ExercisesTab";
import ProgramTab from "@/components/tabs/ProgramTab";
import GymBroTab from "@/components/tabs/GymBroTab";
import ChallengesTab from "@/components/tabs/ChallengesTab";
import {
  BodyIcon,
  DumbbellIcon,
  FlameIcon,
  ProgramIcon,
  SparkIcon,
} from "@/components/icons";

type TabId = "body" | "exercises" | "program" | "gymbro" | "challenges";

const tabs: {
  id: TabId;
  label: string;
  Icon: (p: { className?: string }) => React.ReactElement;
}[] = [
  { id: "body", label: "Тело", Icon: BodyIcon },
  { id: "exercises", label: "Упражнения", Icon: DumbbellIcon },
  { id: "program", label: "Программа", Icon: ProgramIcon },
  { id: "gymbro", label: "GymBro", Icon: SparkIcon },
  { id: "challenges", label: "Челленджи", Icon: FlameIcon },
];

/**
 * Что закрыто без аккаунта. Каталог упражнений открыт всем — он одинаковый
 * для всех и ни к кому не привязан. Остальное считается от человека и хранится
 * за ним, поэтому просит войти. null — раздел открыт.
 */
const needsAccount: Record<TabId, string | null> = {
  body: "Схема тела и недельный объём",
  exercises: null,
  program: "Свои тренировки и их история",
  gymbro: "Помощник",
  challenges: "Челленджи",
};

export default function App() {
  return (
    <AuthProvider>
      <StoreProvider>
        <Shell />
      </StoreProvider>
    </AuthProvider>
  );
}

function Shell() {
  const [tab, setTab] = useState<TabId>("body");
  const { status } = useAuth();

  // Пока вход не настроен в сборке, приложение работает целиком, без замков
  const locked = status === "out" ? needsAccount[tab] : null;

  return (
    <>
      <Splash />
      <StartGate />
      <AuthOverlay />

      {/* Верхняя строка */}
      <header className="sticky top-0 z-40 border-b border-line/60 bg-ink/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-5 py-3.5">
          <p className="font-serif text-lg font-light tracking-[0.16em] text-bright">
            GYM<span className="text-accent">BRO</span>
          </p>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-accent">
              <FlameIcon className="h-4 w-4" />
              <span className="font-serif text-lg font-light leading-none">
                7
              </span>
            </div>
            <AccountButton />
          </div>
        </div>
      </header>

      {/* Содержимое вкладки */}
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 pt-5 pb-32 sm:px-5">
        {locked ? (
          <NeedsAccount what={locked} />
        ) : (
          <>
            {tab === "body" && <BodyTab />}
            {tab === "exercises" && <ExercisesTab onNavigate={setTab} />}
            {tab === "program" && <ProgramTab onNavigate={setTab} />}
            {tab === "gymbro" && <GymBroTab onNavigate={setTab} />}
            {tab === "challenges" && <ChallengesTab />}
          </>
        )}
      </main>

      {/* Нижняя панель */}
      <nav
        aria-label="Разделы приложения"
        className="fixed inset-x-0 bottom-0 z-40 px-3 pb-3"
      >
        <div
          role="tablist"
          className="tabbar mx-auto grid max-w-md grid-cols-5 gap-1 p-1.5"
        >
          {tabs.map(({ id, label, Icon }) => (
            <button
              key={id}
              role="tab"
              aria-selected={tab === id}
              aria-label={label}
              onClick={() => setTab(id)}
              className="tab"
            >
              <Icon className="h-[22px] w-[22px]" />
              <span className="text-[10px] leading-none whitespace-nowrap">
                {label}
              </span>
            </button>
          ))}
        </div>
      </nav>
    </>
  );
}
