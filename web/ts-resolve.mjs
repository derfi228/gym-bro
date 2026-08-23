/**
 * Node не достраивает расширения в относительных TS-импортах, а исходники
 * пишутся без них. Хук дописывает «.ts» на лету — нужен только для `npm test`,
 * Next и tsc резолвят сами.
 */
import { registerHooks } from "node:module";

registerHooks({
  resolve: (spec, ctx, next) =>
    next(
      spec.startsWith(".") && !/\.[mc]?[jt]s$/.test(spec) ? `${spec}.ts` : spec,
      ctx,
    ),
});
