import MuscleMap from "@/components/MuscleMap";

/* ── Мелкие строительные блоки ────────────────────────────────────────────── */

function SectionHead({
  index,
  kicker,
  title,
  lead,
}: {
  index: string;
  kicker: string;
  title: string;
  lead: string;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="kicker">
        {index} — {kicker}
      </p>
      <h2 className="mt-4 font-serif text-4xl font-light tracking-[0.02em] text-bright sm:text-5xl">
        {title}
      </h2>
      <p className="mt-5 text-[15px] leading-relaxed text-dim">{lead}</p>
    </div>
  );
}

function Section({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <section id={id} className="border-t border-line/60 px-6 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl">{children}</div>
    </section>
  );
}

/* ── Страница ─────────────────────────────────────────────────────────────── */

export default function Home() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <Hero />
        <Positioning />

        <Section id="body">
          <SectionHead
            index="01 · 02"
            kicker="Анализ тела и схема человека"
            title="Видно, что отстаёт"
            lead="Схема строится по вашему фото и профилю — рост, вес, возраст. После записанной тренировки нужные мышцы заполняются. Пустые группы видно сразу, перебор — тоже."
          />
          <div className="mt-14">
            <MuscleMap />
          </div>
        </Section>

        <Programs />
        <AiAssistant />
        <Challenges />
        <Cta />
      </main>
      <Footer />
    </>
  );
}

/* ── Шапка ────────────────────────────────────────────────────────────────── */

function Header() {
  const links = [
    { href: "#body", label: "Схема тела" },
    { href: "#programs", label: "Программы" },
    { href: "#ai", label: "GymBro" },
    { href: "#challenges", label: "Челленджи" },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-line/60 bg-ink/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-4">
        <a
          href="#top"
          className="font-serif text-xl font-light tracking-[0.14em] text-bright"
        >
          GYM<span className="text-accent">BRO</span>
        </a>
        <nav className="hidden gap-8 md:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-[13px] text-dim transition-colors hover:text-accent"
            >
              {l.label}
            </a>
          ))}
        </nav>
        <a href="#cta" className="btn-ghost text-[13px]">
          Ранний доступ
        </a>
      </div>
    </header>
  );
}

/* ── Первый экран ─────────────────────────────────────────────────────────── */

function Hero() {
  const stats = [
    { n: "5", l: "функций в MVP" },
    { n: "0", l: "лишних вкладок" },
    { n: "35", l: "минут — и программа готова" },
  ];

  return (
    <section
      id="top"
      className="relative overflow-hidden px-6 pt-24 pb-28 sm:pt-32 sm:pb-36"
    >
      {/* Свечение за заголовком */}
      <div
        aria-hidden
        className="aura pointer-events-none absolute left-1/2 top-24 h-[420px] w-[620px] max-w-[90vw] -translate-x-1/2 rounded-full"
        style={{
          background:
            "radial-gradient(closest-side, rgb(111 159 216 / 0.22), transparent)",
        }}
      />

      <div className="relative mx-auto max-w-3xl text-center">
        <p className="reveal kicker" style={{ "--i": 0 } as React.CSSProperties}>
          Приложение для зала · скоро
        </p>

        <h1
          className="reveal mt-7 font-serif text-6xl font-light leading-[1.05] tracking-[0.04em] text-bright sm:text-7xl"
          style={{ "--i": 1 } as React.CSSProperties}
        >
          Тренировки
          <br />
          <span className="text-accent-hi">без лишнего</span>
        </h1>

        <p
          className="reveal mx-auto mt-8 max-w-xl text-[17px] leading-relaxed text-dim"
          style={{ "--i": 2 } as React.CSSProperties}
        >
          Пять функций вместо сотни вкладок. Схема тела показывает, что отстаёт.
          Программа собирается под ваше время. Помощник ведёт к цели.
        </p>

        <div
          className="reveal mt-11 flex flex-wrap items-center justify-center gap-3"
          style={{ "--i": 3 } as React.CSSProperties}
        >
          <a href="#cta" className="btn">
            Записаться в ранний доступ
          </a>
          <a href="#body" className="btn-ghost">
            Посмотреть схему тела
          </a>
        </div>

        <div
          className="reveal mt-16 flex flex-wrap items-center justify-center gap-x-10 gap-y-4"
          style={{ "--i": 4 } as React.CSSProperties}
        >
          {stats.map((s) => (
            <div key={s.l} className="text-center">
              <p className="font-serif text-4xl font-light text-accent">{s.n}</p>
              <p className="kicker mt-1.5">{s.l}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Позиционирование ─────────────────────────────────────────────────────── */

function Positioning() {
  const points = [
    { t: "Пять функций", d: "Ровно столько, сколько нужно для тренировки" },
    { t: "Один экран", d: "Записать подход — одно касание" },
    { t: "Без ленты", d: "Ни соцсети, ни рекламы добавок" },
    { t: "Считает за вас", d: "Объём, отдых и прогресс — сами" },
  ];

  return (
    <Section id="why">
      <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
        <div>
          <p className="kicker">Почему ещё одно приложение</p>
          <h2 className="mt-4 font-serif text-4xl font-light tracking-[0.02em] text-bright sm:text-5xl">
            Конкуренты перегружены
          </h2>
          <p className="mt-6 text-[15px] leading-relaxed text-dim">
            Ленты, соцсеть, магазин добавок, дневник питания, встроенный
            маркетплейс. Чтобы записать подход, нужно пройти четыре экрана.
          </p>
          <p className="mt-4 text-[15px] leading-relaxed text-dim">
            Мы делаем обратное: приложение отвечает на один вопрос —{" "}
            <span className="text-bright">что делать сегодня в зале</span> — и
            отвечает быстро. Сайт остаётся витриной, вся работа происходит в
            телефоне.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {points.map((c, i) => (
            <div
              key={c.t}
              className="card reveal p-5"
              style={{ "--i": i } as React.CSSProperties}
            >
              <p className="text-sm text-accent-hi">{c.t}</p>
              <p className="mt-2 text-[13px] leading-relaxed text-dim">{c.d}</p>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

/* ── 03 Программы тренировок ──────────────────────────────────────────────── */

function Programs() {
  const plan = [
    { name: "Жим гантелей на наклонной", sets: "4 × 8–10", rest: 120 },
    { name: "Жим ногами", sets: "4 × 12", rest: 150 },
    { name: "Махи гантелей в стороны", sets: "3 × 15", rest: 60 },
    { name: "Скручивания на блоке", sets: "3 × 12", rest: 45 },
  ];

  return (
    <Section id="programs">
      <SectionHead
        index="03"
        kicker="Программы тренировок"
        title="Программа под ваше время"
        lead="Скажите, что у вас 35 минут — программа соберётся под 35 минут. Отдых между подходами приложение отсчитывает само, без секундомера в руках."
      />

      <div className="mt-14 grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        {/* Карточка программы */}
        <div className="card card-lit p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="kicker">Сегодня · верх + ноги</p>
              <p className="mt-2 font-serif text-3xl font-light text-bright">
                35 <span className="text-dim">мин</span>
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <span className="chip">35 минут</span>
              <span className="chip">Средний уровень</span>
            </div>
          </div>

          <ul className="mt-7 flex flex-col gap-2.5">
            {plan.map((e, i) => (
              <li
                key={e.name}
                className="reveal flex items-center justify-between gap-4 rounded-[14px] border border-line bg-accent/[0.03] px-4 py-3.5"
                style={{ "--i": i } as React.CSSProperties}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-bright">{e.name}</p>
                  <p className="mt-1 text-xs text-dim">
                    {e.sets} · отдых {e.rest} с
                  </p>
                </div>
                <span className="btn-ghost shrink-0 px-4 py-1.5 text-[11px]">
                  Заменить
                </span>
              </li>
            ))}
          </ul>

          <div className="callout mt-6">
            <p className="text-sm text-bright">
              Замена показывает альтернативы на ту же группу
            </p>
            <p className="mt-1 text-xs leading-relaxed text-dim">
              Список отсортирован от самого рекомендованного к наименее
              подходящему — с учётом того, что уже нагружено на этой неделе.
            </p>
          </div>
        </div>

        {/* Таймер отдыха */}
        <div className="card card-lit flex flex-col items-center justify-center p-8">
          <p className="kicker">Отдых до следующего подхода</p>

          <div className="relative mt-8 grid place-items-center">
            <svg viewBox="0 0 200 200" className="w-52">
              <circle
                cx="100"
                cy="100"
                r="86"
                fill="none"
                stroke="var(--color-line)"
                strokeWidth="6"
              />
              <circle
                cx="100"
                cy="100"
                r="86"
                fill="none"
                stroke="var(--color-accent)"
                strokeWidth="6"
                strokeLinecap="round"
                transform="rotate(-90 100 100)"
                strokeDasharray="540"
                strokeDashoffset="175"
              />
            </svg>
            <div className="absolute text-center">
              <p className="font-serif text-6xl font-light text-accent-hi">
                1:22
              </p>
              <p className="kicker mt-2">из 2:00</p>
            </div>
          </div>

          <p className="mt-8 max-w-xs text-center text-[13px] leading-relaxed text-dim">
            Пауза стартует сама, как только вы отметили подход. Для базы —
            длиннее, для изоляции — короче.
          </p>
        </div>
      </div>
    </Section>
  );
}

/* ── 04 ИИ-помощник ───────────────────────────────────────────────────────── */

function AiAssistant() {
  const extras = [
    {
      t: "Болит — перестроит",
      d: "Уберёт нагрузку на сустав, оставит объём на остальном",
    },
    {
      t: "Подберёт вес",
      d: "Под конкретный подход, а не примерно как в прошлый раз",
    },
    {
      t: "Объяснит выбор",
      d: "Почему это упражнение, а не другое — текстом, без магии",
    },
  ];

  return (
    <Section id="ai">
      <SectionHead
        index="04"
        kicker="Вкладка GymBro · платная"
        title="Помощник, который спорит"
        lead="Поставьте цель — помощник скажет, реальна ли она, и подгонит программу. Болит плечо — перестроит тренировку. Не уверены в весе — подберёт под конкретный подход."
      />

      <div className="mt-14 grid gap-6 lg:grid-cols-2">
        {/* Реальная цель */}
        <div className="card card-lit shine p-6 sm:p-8">
          <span className="chip">Цель принята</span>
          <p className="mt-5 text-sm text-dim">Вы поставили цель</p>
          <p className="mt-2 font-serif text-3xl font-light text-bright">
            Пожать 100 кг до конца лета
          </p>
          <div className="callout mt-6">
            <p className="text-sm leading-relaxed text-bright">
              Реально. Сейчас 82,5 кг на 5 повторов — это около 93 кг разового.
              До дедлайна 14 недель, нужно +7 кг.
            </p>
            <p className="mt-2 text-[13px] leading-relaxed text-dim">
              Ставлю жим в начало недели, добавляю второй лёгкий день и убираю
              разведения — они сейчас едят восстановление.
            </p>
          </div>
        </div>

        {/* Нереальная цель */}
        <div className="card card-lit p-6 sm:p-8">
          <span className="chip">Цель завышена</span>
          <p className="mt-5 text-sm text-dim">Вы поставили цель</p>
          <p className="mt-2 font-serif text-3xl font-light text-bright">
            Сбросить 12 кг за 6 недель
          </p>
          <div className="callout mt-6">
            <p className="text-sm leading-relaxed text-bright">
              Так не выйдет. Это по 2 кг в неделю — на таком дефиците уйдёт
              мышечная масса, а жим просядет.
            </p>
            <p className="mt-2 text-[13px] leading-relaxed text-dim">
              Реалистично 5–6 кг за этот срок. Могу собрать план под 6 кг —
              силовые при этом сохраним.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {extras.map((c, i) => (
          <div
            key={c.t}
            className="card reveal p-5"
            style={{ "--i": i } as React.CSSProperties}
          >
            <p className="text-sm text-accent-hi">{c.t}</p>
            <p className="mt-2 text-[13px] leading-relaxed text-dim">{c.d}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ── 05 Челленджи ─────────────────────────────────────────────────────────── */

function Challenges() {
  const items = [
    { title: "Три зала за неделю", done: 2, goal: 3, friend: false },
    { title: "Не пропустить ноги", done: 1, goal: 1, friend: false },
    { title: "Вдвоём: 6 тренировок", done: 4, goal: 6, friend: true },
  ];

  return (
    <Section id="challenges">
      <SectionHead
        index="05"
        kicker="Челленджи"
        title="Выполнимые, а не героические"
        lead="Каждую неделю — несколько задач, которые реально закрыть. Часть можно проходить вдвоём с другом: серия горит, пока держитесь оба."
      />

      <div className="mt-14 grid gap-4 sm:grid-cols-3">
        {items.map((c, i) => {
          const pct = Math.round((c.done / c.goal) * 100);
          return (
            <div
              key={c.title}
              className="card card-lit reveal p-6"
              style={{ "--i": i } as React.CSSProperties}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-[15px] leading-snug text-bright">{c.title}</p>
                {c.friend && <span className="chip">с другом</span>}
              </div>

              <p className="mt-6 font-serif text-4xl font-light text-accent">
                {c.done}
                <span className="text-dim">/{c.goal}</span>
              </p>

              <div className="meter mt-4">
                <span style={{ width: `${pct}%` }} />
              </div>

              <p className="mt-4 text-xs text-dim">
                {pct === 100 ? "Закрыто" : `Осталось ${c.goal - c.done}`}
              </p>
            </div>
          );
        })}
      </div>

      <div className="card card-lit mt-6 flex flex-wrap items-center justify-between gap-6 p-7">
        <div>
          <p className="kicker">Серия</p>
          <p className="mt-3 font-serif text-4xl font-light text-bright">
            7 <span className="text-dim">недель подряд</span>
          </p>
        </div>
        <p className="max-w-md text-[13px] leading-relaxed text-dim">
          Серия общая с другом. Если один пропускает неделю — гаснет у обоих.
          Это работает лучше любых уведомлений.
        </p>
      </div>
    </Section>
  );
}

/* ── Финальный призыв ─────────────────────────────────────────────────────── */

function Cta() {
  return (
    <Section id="cta">
      <div className="card card-lit shine px-6 py-16 text-center sm:px-12">
        <p className="kicker">Ранний доступ</p>
        <h2 className="mt-5 font-serif text-4xl font-light tracking-[0.02em] text-bright sm:text-5xl">
          Приложение в разработке
        </h2>
        <p className="mx-auto mt-6 max-w-lg text-[15px] leading-relaxed text-dim">
          Сайт — витрина, основное происходит в телефоне. Напишите нам, и мы
          позовём вас в закрытый тест, когда соберём первую версию.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <a
            href="https://github.com/derfi228/gym-bro"
            className="btn"
            target="_blank"
            rel="noreferrer"
          >
            Проект на GitHub
          </a>
          <a href="#body" className="btn-ghost">
            Ещё раз посмотреть схему
          </a>
        </div>
      </div>
    </Section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-line/60 px-6 py-10">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
        <p className="font-serif text-lg font-light tracking-[0.14em] text-dim">
          GYM<span className="text-accent">BRO</span>
        </p>
        <p className="text-xs text-dim">Данные на странице — демонстрационные.</p>
      </div>
    </footer>
  );
}
