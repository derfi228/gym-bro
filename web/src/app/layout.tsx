import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: "Gym Bro — тренировки без лишнего",
  description:
    "Схема тела по объёму нагрузки, программы под ваше время и ИИ-помощник. " +
    "Пять функций вместо сотни вкладок.",
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
