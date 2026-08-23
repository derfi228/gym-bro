/**
 * Серверная часть помощника. Существует ровно ради одного: ключ от модели не
 * должен попадать в браузер. Сайт статический, спрятать его там негде.
 *
 * Разбор данных сюда намеренно не переехал. Каталог упражнений, расчёт объёма
 * и сборка программ живут в приложении, и дублировать их на Deno означало бы
 * держать две расходящиеся копии. Поэтому:
 *   - приложение присылает готовый срез своих данных,
 *   - функция подставляет его в наставление и зовёт модель,
 *   - инструменты, которые модель просит выполнить, выполняет само приложение.
 *
 * Доступ закрыт проверкой токена на уровне Supabase: без входа сюда не попасть.
 */

/**
 * Адрес и модель берутся из переменных, чтобы сменить поставщика можно было
 * без правки кода. По умолчанию — DeepSeek напрямую.
 *
 * Для ключа OpenRouter (начинается на «sk-or-v1-») достаточно задать:
 *   AI_BASE_URL = https://openrouter.ai/api/v1/chat/completions
 *   AI_MODEL    = deepseek/deepseek-v4-flash-0731
 * API у них одинаковый, поэтому больше ничего не меняется.
 */
const API_URL =
  Deno.env.get("AI_BASE_URL") ?? "https://api.deepseek.com/chat/completions";

// Быстрая модель. Pro втрое дороже и нужен, только если flash перестанет
// справляться со сценариями, где он сам выбирает действие
const MODEL = Deno.env.get("AI_MODEL") ?? "deepseek-v4-flash";

/** Дальше разговор всё равно теряет связность, а счёт растёт */
const MAX_MESSAGES = 24;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/** Что приложение знает о человеке на момент вопроса */
type Context = {
  name?: string;
  sex?: string;
  heightCm?: number;
  weightKg?: number;
  age?: number;
  level?: string;
  /** Подходов за неделю по группам: «Грудь: 12 из 16» */
  volume?: { muscle: string; done: number; target: number; status: string }[];
  /** Группы, которые просили не трогать */
  avoid?: string[];
};

/**
 * Инструменты выполняет приложение, а не функция: они меняют то, что человек
 * видит на экране, и лезут в его данные под его же правами.
 */
const tools = [
  {
    type: "function",
    function: {
      name: "build_program",
      description:
        "Собрать тренировку под заданное время и открыть её. Вызывать, когда просят составить тренировку или программу.",
      parameters: {
        type: "object",
        properties: {
          minutes: {
            type: "integer",
            minimum: 30,
            maximum: 120,
            description: "Сколько минут есть на тренировку. Минимум 30.",
          },
          avoid: {
            type: "array",
            items: { type: "string" },
            description:
              "Группы мышц, которые не трогать. Русские названия, как в разделе объёма.",
          },
        },
        required: ["minutes"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "show_on_body",
      description:
        "Подсветить группы мышц на схеме тела и перевести человека на эту вкладку.",
      parameters: {
        type: "object",
        properties: {
          muscles: {
            type: "array",
            items: { type: "string" },
            description: "Русские названия групп, как в разделе объёма.",
          },
        },
        required: ["muscles"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "exercise_history",
      description:
        "Посмотреть, как менялся вес в упражнении: последние выполненные подходы с датами. Вызывать, когда спрашивают про прогресс или застой.",
      parameters: {
        type: "object",
        properties: {
          exercise: {
            type: "string",
            description: "Название упражнения по-русски, как в каталоге.",
          },
        },
        required: ["exercise"],
      },
    },
  },
];

function systemPrompt(ctx: Context): string {
  const who = [
    ctx.sex === "female" ? "женщина" : ctx.sex === "male" ? "мужчина" : null,
    ctx.age ? `${ctx.age} лет` : null,
    ctx.heightCm ? `${ctx.heightCm} см` : null,
    ctx.weightKg ? `${ctx.weightKg} кг` : null,
    ctx.level ? `опыт: ${ctx.level}` : null,
  ]
    .filter(Boolean)
    .join(", ");

  const volume = (ctx.volume ?? [])
    .map((v) => `  ${v.muscle}: ${v.done} из ${v.target} (${v.status})`)
    .join("\n");

  return [
    "Ты — тренер в приложении Gym Bro. Отвечаешь по-русски, коротко и по делу.",
    "",
    "Как себя вести:",
    "— Говори простым языком, без обращения «пользователь» и без канцелярита.",
    "— Не выдумывай числа. Если данных нет, так и скажи.",
    "— ЭМГ-активация показывает работу мышцы в моменте и не предсказывает рост.",
    "  Объём и прогрессия важнее выбора упражнения — не переставляй эти приоритеты.",
    "— Не давай медицинских советов. При боли предлагай обратиться к врачу,",
    "  а со своей стороны — убрать нагрузку с проблемной группы.",
    "— Границы объёма это ориентиры для среднего человека, переносимость различается.",
    "— Если просят собрать тренировку — вызывай build_program, не описывай её словами.",
    "",
    who ? `Про человека: ${who}.` : "Профиль не заполнен — цифр про него нет.",
    ctx.avoid?.length ? `Просил не трогать: ${ctx.avoid.join(", ")}.` : "",
    "",
    volume
      ? `Подходов за эту неделю по группам:\n${volume}`
      : "Данных по объёму за неделю нет.",
  ]
    .filter((s) => s !== "")
    .join("\n");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const key = Deno.env.get("AI_API_KEY");
  if (!key) {
    return json({ error: "Ключ модели не задан на сервере" }, 500);
  }

  let body: { context?: Context; messages?: unknown[] };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Не разобрал запрос" }, 400);
  }

  const messages = Array.isArray(body.messages) ? body.messages : [];
  if (messages.length === 0) return json({ error: "Пустой разговор" }, 400);
  if (messages.length > MAX_MESSAGES)
    return json({ error: "Разговор слишком длинный, начните заново" }, 400);

  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt(body.context ?? {}) },
        ...messages,
      ],
      tools,
      temperature: 0.3,
      max_tokens: 900,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("Модель ответила", res.status, text);
    // Наружу не отдаём тело ответа: в нём может быть техническая изнанка
    return json(
      {
        error:
          res.status === 402
            ? "На счету модели закончились средства"
            : res.status === 401
              ? "Ключ модели не принят"
              : res.status === 429
                ? "Слишком часто — подождите немного"
                : "Модель не ответила, попробуйте ещё раз",
      },
      502,
    );
  }

  const data = await res.json();
  const choice = data.choices?.[0]?.message;
  if (!choice) return json({ error: "Пустой ответ модели" }, 502);

  return json({
    message: choice,
    usage: data.usage ?? null,
  });
});

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}
