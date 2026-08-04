import type { Metadata } from "next";
import { Cormorant_Garamond } from "next/font/google";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin", "cyrillic"],
  weight: ["300", "400"],
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
      className={`${cormorant.variable} h-full scroll-smooth antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
