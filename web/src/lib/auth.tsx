"use client";

/**
 * Аккаунт: вход, регистрация и профиль. Состояние сессии держит сам Supabase,
 * здесь только подписка на него и перевод строк базы в модель приложения.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Session } from "@supabase/supabase-js";
import type { UserProfile } from "@shared/types";
import { authError } from "./authText";
import { fromRow, toRow, type ProfileRow } from "./profile";
import { getSupabase, isConfigured } from "./supabase";

/** Что вернула операция входа: ошибка, либо просьба подтвердить почту */
export type AuthResult = { error?: string; confirmEmail?: boolean };

type Auth = {
  /** loading — сессию ещё читаем; off — вход не настроен в этой сборке */
  status: "loading" | "in" | "out" | "off";
  session: Session | null;
  profile: UserProfile | null;
  signUp: (email: string, password: string, name: string) => Promise<AuthResult>;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  saveProfile: (patch: Partial<UserProfile>) => Promise<AuthResult>;
  /**
   * Открыта ли форма входа. Живёт здесь, а не в оболочке, потому что открывают
   * её из трёх мест сразу — шапки, первого экрана и закрытых вкладок,
   * и тянуть флаг пропсами через все вкладки дороже, чем держать рядом с сессией.
   */
  panel: "signin" | "signup" | null;
  openPanel: (mode?: "signin" | "signup") => void;
  closePanel: () => void;
};

const AuthContext = createContext<Auth | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Auth["status"]>(
    isConfigured ? "loading" : "off",
  );
  const [session, setSession] = useState<Session | null>(null);
  /**
   * Профиль хранится вместе с тем, чей он: иначе после смены аккаунта до
   * прихода нового запроса секунду виден профиль предыдущего.
   */
  const [loaded, setLoaded] = useState<{
    userId: string;
    profile: UserProfile;
  } | null>(null);
  const [panel, setPanel] = useState<"signin" | "signup" | null>(null);

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;

    sb.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setStatus(data.session ? "in" : "out");
    });

    const { data } = sb.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setStatus(next ? "in" : "out");
      if (next) setPanel(null);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  // Профиль подтягивается следом за сессией
  const userId = session?.user.id;
  const profile = loaded && loaded.userId === userId ? loaded.profile : null;

  useEffect(() => {
    const sb = getSupabase();
    if (!sb || !userId) return;
    let cancelled = false;
    sb.from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled && data)
          setLoaded({ userId, profile: fromRow(data as ProfileRow) });
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const signUp = useCallback(
    async (email: string, password: string, name: string) => {
      const sb = getSupabase();
      if (!sb) return { error: "Вход не настроен в этой сборке" };
      const { data, error } = await sb.auth.signUp({
        email,
        password,
        options: { data: { name } },
      });
      if (error) return { error: authError(error.message) };
      // Если в проекте включено подтверждение почты, сессии сразу не будет
      return { confirmEmail: data.session === null };
    },
    [],
  );

  const signIn = useCallback(async (email: string, password: string) => {
    const sb = getSupabase();
    if (!sb) return { error: "Вход не настроен в этой сборке" };
    const { error } = await sb.auth.signInWithPassword({ email, password });
    return error ? { error: authError(error.message) } : {};
  }, []);

  const signOut = useCallback(async () => {
    await getSupabase()?.auth.signOut();
  }, []);

  const saveProfile = useCallback(
    async (patch: Partial<UserProfile>) => {
      const sb = getSupabase();
      if (!sb || !userId) return { error: "Нужен аккаунт" };
      const { data, error } = await sb
        .from("profiles")
        .update(toRow(patch))
        .eq("id", userId)
        .select()
        .maybeSingle();
      if (error) return { error: authError(error.message) };
      if (data) setLoaded({ userId, profile: fromRow(data as ProfileRow) });
      return {};
    },
    [userId],
  );

  const openPanel = useCallback((mode: "signin" | "signup" = "signin") => {
    setPanel(mode);
  }, []);
  const closePanel = useCallback(() => setPanel(null), []);

  const value = useMemo<Auth>(
    () => ({
      status,
      session,
      profile,
      signUp,
      signIn,
      signOut,
      saveProfile,
      panel,
      openPanel,
      closePanel,
    }),
    [
      status,
      session,
      profile,
      signUp,
      signIn,
      signOut,
      saveProfile,
      panel,
      openPanel,
      closePanel,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): Auth {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth вне AuthProvider");
  return ctx;
}

/** Открыт ли доступ к личным разделам */
export const useSignedIn = () => useAuth().status === "in";
