import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin", "cyrillic"],
  weight: ["300", "400"],
  display: "swap",
});

/**
 * Текстовая гарнитура. Системный стек читался как «страница без дизайна»
 * и спорил с серифом в заголовках; Manrope держит ту же геометрию, что
 * кнопки-пилюли, и у неё нормальная кириллица. Шрифт самохостится.
 */
const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

const TITLE = "Gym Bro — тренировки без лишнего";
const DESCRIPTION =
  "Схема тела по объёму нагрузки, программы под ваше время и ИИ-помощник. " +
  "Пять функций вместо сотни вкладок.";

export const metadata: Metadata = {
  metadataBase: new URL("https://gym-bro.ru"),
  title: TITLE,
  description: DESCRIPTION,
  // Ссылка на сайт кидается в переписке: без этого видна голая строка адреса
  openGraph: {
    type: "website",
    locale: "ru_RU",
    siteName: "Gym Bro",
    url: "https://gym-bro.ru",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export const viewport: Viewport = {
  // Полоса браузера на телефоне красится в цвет фона: без этого над тёмным
  // приложением висит белая полоса
  themeColor: "#080b12",
  // Браузер рисует свои элементы — выпадающие списки, полосы прокрутки —
  // в тёмном варианте
  colorScheme: "dark",
  // Нижняя панель не должна прятаться под чёрточкой на телефонах без кнопки
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ru"
      className={`${cormorant.variable} ${manrope.variable} h-full scroll-smooth antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
