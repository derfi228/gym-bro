# Gym Bro — контекст для Claude Code

## Стек
- Сайт: Next.js + TypeScript + Tailwind, деплой Vercel
- Приложение: Expo (React Native) + TypeScript
- Бэкенд: Supabase (auth + база + storage)

## Структура
- web/ — сайт (Next.js, App Router, src/, Tailwind, ESLint)
- mobile/ — мобильное приложение (Expo, TypeScript, blank-typescript template)
- shared/ — общие типы и контракты данных между сайтом и приложением

## Конвенции
- Весь код на TypeScript
- Стили только через Tailwind (web) / StyleSheet (mobile), без inline-стилей
- Модель данных менять только через shared/types.ts, синхронно для web и mobile

## Фичи приложения (MVP)
<!-- ЗАПОЛНИТЬ ВРУЧНУЮ: сюда мы с другом впишем список фич первой версии.
Claude Code — не придумывай фичи сам, оставь этот раздел пустым и жди,
пока мы его заполним. -->
