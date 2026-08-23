/**
 * Node не достраивает расширения в относительных TS-импортах, а исходники
 * пишутся без них. Хук дописывает «.ts» на лету — нужен только для `npm test`,
 * Next и tsc резолвят сами.
 *
 * Сначала пробуем «.ts», и только если такого файла нет — отдаём путь как был.
 * Без отката ломались зависимости: внутри node_modules те же относительные
 * пути ведут на «.js», и им «.ts» дописывать нельзя.
 */
import { registerHooks } from "node:module";

registerHooks({
  resolve(spec, ctx, next) {
    if (spec.startsWith(".") && !/\.[mc]?[jt]s$/.test(spec)) {
      try {
        return next(`${spec}.ts`, ctx);
      } catch {
        // Не наш исходник — резолвим обычным способом
      }
    }
    return next(spec, ctx);
  },
});
