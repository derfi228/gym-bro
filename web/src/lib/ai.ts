/**
 * Помощник: разговор с моделью и выполнение того, что она просит сделать.
 *
 * Ключ от модели лежит в серверной функции Supabase, сюда он не попадает.
 * Инструменты выполняются здесь, а не на сервере: они меняют то, что человек
 * видит на экране, и опираются на каталог упражнений, который живёт в коде.
 */

import type { MuscleId } from "@shared/types";
import { demoExercises, muscleNames } from "./demo";
import { getSupabase } from "./supabase";

/* ── Формат разговора ─────────────────────────────────────────────────────── */

export type ToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

export type ChatMessage =
  | { role: "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: ToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };

export type AskContext = {
  name?: string;
  sex?: string;
  heightCm?: number;
  weightKg?: number;
  age?: number;
  level?: string;
  volume?: { muscle: string; done: number; target: number; status: string }[];
  avoid?: string[];
};

export type AskResult =
  | { message: { content: string | null; tool_calls?: ToolCall[] } }
  | { error: string };

/** Спросить модель. Токен подставляет клиент Supabase сам */
export async function ask(
  context: AskContext,
  messages: ChatMessage[],
): Promise<AskResult> {
  const sb = getSupabase();
  if (!sb) return { error: "Помощник не настроен в этой сборке" };

  const { data, error } = await sb.functions.invoke("gymbro", {
    body: { context, messages },
  });

  if (error) {
    // Ответ функции с кодом ошибки приходит сюда же, полезный текст — внутри
    const detail = await readError(error);
    return { error: detail ?? "Не получилось связаться с помощником" };
  }
  if (!data?.message) return { error: "Пустой ответ помощника" };
  return { message: data.message };
}

async function readError(error: unknown): Promise<string | null> {
  const ctx = (error as { context?: Response })?.context;
  if (!ctx || typeof ctx.json !== "function") return null;
  try {
    const body = await ctx.json();
    return typeof body?.error === "string" ? body.error : null;
  } catch {
    return null;
  }
}

/* ── Поиск по русским названиям ───────────────────────────────────────────── */

const norm = (s: string) => s.trim().toLowerCase().replace(/ё/g, "е");

const muscleByExact = new Map(
  (Object.keys(muscleNames) as MuscleId[]).map((id) => [
    norm(muscleNames[id]),
    id,
  ]),
);

/**
 * Модель называет группы словами и не всегда теми же: «грудные» вместо
 * «Грудь». Сначала точное совпадение, потом вхождение в обе стороны.
 * Не нашли — возвращаем null, выдумывать группу нельзя.
 */
export function muscleByName(name: string): MuscleId | null {
  const q = norm(name);
  const exact = muscleByExact.get(q);
  if (exact) return exact;
  for (const [ru, id] of muscleByExact)
    if (q.startsWith(ru) || ru.startsWith(q)) return id;
  return null;
}

const exerciseByExact = new Map(demoExercises.map((e) => [norm(e.name), e]));

export function exerciseByName(name: string) {
  const q = norm(name);
  return (
    exerciseByExact.get(q) ??
    demoExercises.find((e) => norm(e.name).includes(q) || q.includes(norm(e.name))) ??
    null
  );
}

/** Список групп из ответа модели, неизвестные отбрасываются */
export const musclesFrom = (names: unknown): MuscleId[] =>
  Array.isArray(names)
    ? (names
        .map((n) => (typeof n === "string" ? muscleByName(n) : null))
        .filter(Boolean) as MuscleId[])
    : [];

/* ── Выполнение инструментов ──────────────────────────────────────────────── */

export type ToolDeps = {
  /** Собрать тренировку и открыть её. Возвращает описание для модели */
  buildProgram: (minutes: number, avoid: MuscleId[]) => string;
  /** Подсветить группы на схеме тела */
  showOnBody: (muscles: MuscleId[]) => string;
};

/** Последние подходы в упражнении — читаются из базы под правами человека */
async function history(exerciseId: string, name: string): Promise<string> {
  const sb = getSupabase();
  if (!sb) return "Нет доступа к истории";

  const { data, error } = await sb
    .from("workout_sets")
    .select("weight_kg,reps,feedback,done_at")
    .eq("exercise_id", exerciseId)
    .order("done_at", { ascending: false })
    .limit(20);

  if (error) return `Не удалось прочитать историю: ${error.message}`;
  if (!data || data.length === 0)
    return `В «${name}» пока нет записанных подходов`;

  const lines = data.map((r) => {
    const day = new Date(r.done_at as string).toLocaleDateString("ru-RU");
    const kg = r.weight_kg === null ? "без веса" : `${r.weight_kg} кг`;
    return `${day}: ${kg} × ${r.reps ?? "?"} (${r.feedback ?? "без оценки"})`;
  });
  return `Последние подходы в «${name}», от новых к старым:\n${lines.join("\n")}`;
}

/**
 * Выполняет то, что попросила модель, и возвращает текст для неё же.
 * Ошибки не глотаются: модель должна узнать, что действие не вышло,
 * иначе она отчитается об успехе, которого не было.
 */
export async function runTool(
  call: ToolCall,
  deps: ToolDeps,
): Promise<string> {
  let args: Record<string, unknown> = {};
  try {
    args = JSON.parse(call.function.arguments || "{}");
  } catch {
    return "Не разобрал аргументы вызова";
  }

  switch (call.function.name) {
    case "build_program": {
      const raw = Number(args.minutes);
      if (!Number.isFinite(raw)) return "Не указано время тренировки";
      const minutes = Math.min(120, Math.max(30, Math.round(raw)));
      return deps.buildProgram(minutes, musclesFrom(args.avoid));
    }

    case "show_on_body": {
      const muscles = musclesFrom(args.muscles);
      if (muscles.length === 0) return "Таких групп в приложении нет";
      return deps.showOnBody(muscles);
    }

    case "exercise_history": {
      const name = typeof args.exercise === "string" ? args.exercise : "";
      const ex = exerciseByName(name);
      if (!ex) return `Упражнения «${name}» нет в каталоге`;
      return await history(ex.id, ex.name);
    }

    default:
      return `Неизвестное действие: ${call.function.name}`;
  }
}
