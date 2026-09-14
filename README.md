# routine

Монорепозиторій на **pnpm workspaces + Turborepo**.

| Пакет          | Стек                                 | Порт   |
| -------------- | ------------------------------------ | ------ |
| `@routine/api` | NestJS 12 (ESM, Vitest)              | `4000` |
| `@routine/web` | Next.js 16 (App Router, Tailwind v4) | `3000` |

## Структура

```
.
├── apps/
│   ├── api/              # NestJS API, глобальний префікс /api
│   └── web/              # Next.js застосунок
├── packages/             # місце для спільних пакетів (ui, types, config…)
├── eslint.config.mjs     # єдиний flat-config ESLint на весь репозиторій
├── tsconfig.base.json    # спільні compilerOptions, які розширюють застосунки
├── turbo.json            # граф задач і кешування
└── .husky/               # pre-commit (lint-staged) + commit-msg (commitlint)
```

## Старт

```bash
corepack enable pnpm      # один раз
pnpm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
pnpm dev                  # підніме web і api паралельно
```

## Команди

| Команда          | Що робить                                  |
| ---------------- | ------------------------------------------ |
| `pnpm dev`       | dev-режим для всіх застосунків             |
| `pnpm dev:api`   | лише NestJS у watch-режимі                 |
| `pnpm dev:web`   | лише Next.js                               |
| `pnpm build`     | продакшн-збірка всього                     |
| `pnpm lint`      | ESLint по всьому репозиторію               |
| `pnpm lint:fix`  | те саме з автофіксом                       |
| `pnpm typecheck` | `tsc --noEmit` у кожному застосунку        |
| `pnpm format`    | Prettier по всіх файлах                    |
| `pnpm test`      | юніт-тести (Vitest)                        |
| `pnpm test:e2e`  | e2e-тести API                              |
| `pnpm clean`     | чистить артефакти збірки та `node_modules` |

Додати задачу лише для одного пакета: `pnpm turbo run <task> --filter=@routine/api`.

## Домовленості

- **TypeScript 6** з єдиною базою в `tsconfig.base.json` (`strict`, `noUncheckedIndexedAccess`).
- **ESLint** — flat-config з типізованими правилами (`recommendedTypeChecked`), сортуванням імпортів
  і окремими блоками для Nest та Next. Prettier вимикає конфліктні правила останнім у ланцюжку.
- **Коміти** — Conventional Commits (`feat(api): ...`), перевіряє commitlint у `commit-msg`.
- **pre-commit** — lint-staged проганяє ESLint `--fix` та Prettier лише по застейджених файлах.
- Конфігурація Nest-застосунку винесена в `apps/api/src/app.setup.ts`, щоб e2e-тести
  запускали рівно ту саму поведінку, що й `main.ts`.
