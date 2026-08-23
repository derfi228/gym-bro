/**
 * Переписка с помощником и его память о человеке — хранение в базе.
 *
 * Отдельно от `ai.ts`: там разговор с моделью, здесь только чтение и запись.
 */

import type { ChatMessage, ToolCall } from "./ai";
import { getSupabase } from "./supabase";

/** Сколько последних сообщений подгружать и отправлять модели */
export const CHAT_WINDOW = 20;

export type Fact = { id: string; fact: string };

type Row = {
  role: "user" | "assistant" | "tool";
  content: string | null;
  tool_calls: ToolCall[] | null;
  tool_call_id: string | null;
};

/**
 * Убирает разорванные пары «вызов инструмента — его результат».
 *
 * Мы берём только хвост переписки, и срез может прийтись на середину: тогда
 * результат инструмента остаётся без своего вызова. Поставщик такую ленту
 * отвергает целиком, поэтому чистим до отправки.
 *
 * Хвост чистится тоже: если страницу закрыли между вызовом и ответом, вызов
 * остался без результата — он так же не пройдёт.
 */
export function trimOrphans(msgs: ChatMessage[]): ChatMessage[] {
  const answered = new Set<string>();
  for (const m of msgs) if (m.role === "tool") answered.add(m.tool_call_id);

  const called = new Set<string>();
  const out: ChatMessage[] = [];

  for (const m of msgs) {
    if (m.role === "assistant") {
      const calls = m.tool_calls ?? [];
      // Вызов, на который в этом окне нет ответа, тянет за собой отказ
      if (calls.length > 0 && !calls.every((c) => answered.has(c.id))) {
        // Текст сохраняем, вызовы отбрасываем — он мог быть полезным
        if (m.content?.trim()) out.push({ role: "assistant", content: m.content });
        continue;
      }
      for (const c of calls) called.add(c.id);
      out.push(m);
      continue;
    }
    if (m.role === "tool") {
      if (called.has(m.tool_call_id)) out.push(m);
      continue;
    }
    out.push(m);
  }
  return out;
}

const toMessage = (r: Row): ChatMessage =>
  r.role === "tool"
    ? { role: "tool", tool_call_id: r.tool_call_id ?? "", content: r.content ?? "" }
    : r.role === "user"
      ? { role: "user", content: r.content ?? "" }
      : {
          role: "assistant",
          content: r.content,
          ...(r.tool_calls ? { tool_calls: r.tool_calls } : {}),
        };

export async function loadChat(): Promise<ChatMessage[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data } = await sb
    .from("chat_messages")
    .select("role,content,tool_calls,tool_call_id")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(CHAT_WINDOW);
  if (!data) return [];
  return trimOrphans((data as Row[]).reverse().map(toMessage));
}

export async function appendChat(
  userId: string,
  msgs: ChatMessage[],
): Promise<void> {
  const sb = getSupabase();
  if (!sb || msgs.length === 0) return;
  const rows = msgs.map((m) => ({
    user_id: userId,
    role: m.role,
    content: m.role === "assistant" ? m.content : m.content,
    tool_calls: m.role === "assistant" ? (m.tool_calls ?? null) : null,
    tool_call_id: m.role === "tool" ? m.tool_call_id : null,
  }));
  const { error } = await sb.from("chat_messages").insert(rows);
  if (error) console.error("Переписка не сохранена:", error.message);
}

export async function clearChat(): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  // Условие обязательно: без него PostgREST отвергает удаление целиком.
  // Чужие строки не тронутся — их закрывает построчный доступ
  const { error } = await sb.from("chat_messages").delete().gte("id", 0);
  if (error) console.error("Переписка не очищена:", error.message);
}

/* ── Память ───────────────────────────────────────────────────────────────── */

export async function loadFacts(): Promise<Fact[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data } = await sb
    .from("memory_facts")
    .select("id,fact")
    .order("created_at", { ascending: true });
  return (data as Fact[]) ?? [];
}

/** Возвращает записанный факт. null — если не вышло или он уже был */
export async function addFact(
  userId: string,
  fact: string,
): Promise<Fact | null> {
  const sb = getSupabase();
  const text = fact.trim();
  if (!sb || text === "") return null;
  const { data, error } = await sb
    .from("memory_facts")
    .insert({ user_id: userId, fact: text.slice(0, 300) })
    .select("id,fact")
    .maybeSingle();
  if (error) {
    // 23505 — такой факт уже записан, это не ошибка
    if (error.code !== "23505") console.error("Факт не записан:", error.message);
    return null;
  }
  return (data as Fact) ?? null;
}

export async function removeFact(id: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.from("memory_facts").delete().eq("id", id);
  if (error) console.error("Факт не удалён:", error.message);
}
