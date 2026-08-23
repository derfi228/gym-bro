import { strict as assert } from "node:assert";
import { test } from "node:test";
import { trimOrphans } from "./chat.ts";
import type { ChatMessage, ToolCall } from "./ai.ts";

const call = (id: string): ToolCall => ({
  id,
  type: "function",
  function: { name: "build_program", arguments: "{}" },
});

test("целая пара «вызов — результат» проходит как есть", () => {
  const msgs: ChatMessage[] = [
    { role: "user", content: "собери" },
    { role: "assistant", content: null, tool_calls: [call("a")] },
    { role: "tool", tool_call_id: "a", content: "готово" },
    { role: "assistant", content: "Собрал" },
  ];
  assert.deepEqual(trimOrphans(msgs), msgs);
});

test("результат без своего вызова отбрасывается", () => {
  // Так выглядит хвост переписки, срезанный посередине
  const msgs: ChatMessage[] = [
    { role: "tool", tool_call_id: "a", content: "готово" },
    { role: "assistant", content: "Собрал" },
    { role: "user", content: "спасибо" },
  ];
  assert.deepEqual(trimOrphans(msgs), [
    { role: "assistant", content: "Собрал" },
    { role: "user", content: "спасибо" },
  ]);
});

test("вызов без ответа теряет вызовы, но не текст", () => {
  // Так бывает, если страницу закрыли между вызовом и его выполнением
  const msgs: ChatMessage[] = [
    { role: "user", content: "собери" },
    { role: "assistant", content: "Сейчас соберу", tool_calls: [call("a")] },
  ];
  assert.deepEqual(trimOrphans(msgs), [
    { role: "user", content: "собери" },
    { role: "assistant", content: "Сейчас соберу" },
  ]);
});

test("вызов без ответа и без текста пропадает целиком", () => {
  const msgs: ChatMessage[] = [
    { role: "user", content: "собери" },
    { role: "assistant", content: null, tool_calls: [call("a")] },
  ];
  assert.deepEqual(trimOrphans(msgs), [{ role: "user", content: "собери" }]);
});

test("из нескольких вызовов достаточно потерять один, чтобы отбросить все", () => {
  const msgs: ChatMessage[] = [
    { role: "assistant", content: null, tool_calls: [call("a"), call("b")] },
    { role: "tool", tool_call_id: "a", content: "ок" },
  ];
  // Иначе поставщик отвергнет ленту: у вызова b нет ответа
  assert.deepEqual(trimOrphans(msgs), []);
});

test("обычная переписка без инструментов не меняется", () => {
  const msgs: ChatMessage[] = [
    { role: "user", content: "привет" },
    { role: "assistant", content: "привет" },
  ];
  assert.deepEqual(trimOrphans(msgs), msgs);
});

test("пустая переписка не ломает разбор", () => {
  assert.deepEqual(trimOrphans([]), []);
});
