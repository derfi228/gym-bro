/**
 * Клиент Supabase. Адрес и публичный ключ приходят из переменных окружения и
 * вшиваются в сборку — сайт статический, читать их во время работы неоткуда.
 *
 * Пока проект не создан, клиента нет и приложение работает без аккаунта:
 * каталог упражнений открыт всем, остальное просит войти.
 *
 * Ключ здесь публичный по устройству Supabase — он лежит в браузере у каждого.
 * Данные закрывает не он, а построчный доступ (RLS) на стороне базы,
 * см. supabase/migrations. Служебный ключ в сайт не попадает никогда.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Настроен ли вход в этой сборке */
export const isConfigured = Boolean(url && anonKey);

let client: SupabaseClient | null | undefined;

/**
 * Клиент создаётся при первом обращении, а не при загрузке модуля: страницы
 * собираются заранее в Node, где нет ни окна, ни хранилища браузера.
 */
export function getSupabase(): SupabaseClient | null {
  if (client === undefined) {
    client = url && anonKey ? createClient(url, anonKey) : null;
  }
  return client;
}
