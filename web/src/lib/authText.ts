/** Перевод ответов Supabase: наружу они приходят по-английски */
const messages: [RegExp, string][] = [
  [/invalid login credentials/i, "Неверная почта или пароль"],
  [/email not confirmed/i, "Почта не подтверждена — проверьте письмо"],
  [/user already registered/i, "Аккаунт с такой почтой уже есть"],
  [/password should be at least (\d+)/i, "Пароль короче $1 символов"],
  [/unable to validate email|invalid format/i, "Похоже, в адресе почты опечатка"],
  [/for security purposes.*(\d+) seconds/i, "Слишком часто — подождите $1 секунд"],
  [/failed to fetch|network/i, "Нет связи с сервером"],
];

export function authError(raw: string): string {
  for (const [re, text] of messages) {
    const m = raw.match(re);
    if (m) return text.replace("$1", m[1] ?? "");
  }
  return raw;
}
