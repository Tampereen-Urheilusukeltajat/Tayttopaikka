# Täyttöpaikka — Claude Code Guide

Täyttöpaikka is a production diving cylinder management system for Finnish diving clubs. It tracks gas fills, cylinder sets, storage cylinders, fill events, invoicing and payments. It is in active production use — treat all data and migrations with care.

---

## Coding Style (Most Important)

These rules take priority over any general TypeScript conventions:

- **Return early.** Prefer early returns over nested `if/else`. `if` is fine; `else` is almost always an anti-pattern.
- **Extract functions.** If a block looks like a function and is more than ~5 lines, extract it into a named helper.
- **No deep nesting.** Maximum 2 levels of loops or conditionals. Refactor anything deeper.
- **DRY.** Small reusable helpers belong in `apps/*/src/lib/` or `packages/`. Don't repeat logic.
- **Data/presentation separation (frontend).** Presentation components receive ready-to-render data. Fetching, loading states, and error handling belong in the data layer (`lib/`).
- **Explicit over implicit.** Clear variable names; no reliance on side effects.
- **Type safety.** Always prefer compile-time errors over runtime ones. Avoid `any`.

---

## Business Domain

### Gas types

There are exactly 5 gases, inserted by migration and never changed:

| id  | name    | Notes                                                                                 |
| --- | ------- | ------------------------------------------------------------------------------------- |
| 1   | Air     | Always free — bypasses cost calculation entirely                                      |
| 2   | Helium  | Charged per litre                                                                     |
| 3   | Oxygen  | Charged per litre                                                                     |
| 4   | Argon   | Charged per litre                                                                     |
| 5   | Diluent | Price derived from He% composition only — O₂ is free; no fixed per-litre price stored |

**Never add pricing logic to air fills.** Air's `gas_price` row exists in the DB but its value is ignored. The admin UI hides the edit button for Air (and Diluent) and the backend rejects price changes for them with 400.

**Diluent price** is always computed as:

```
price_eur_cents = ceil((he% / 100 × hePrice) × volumeLitres)
```

Oxygen content is not charged. The `ceil` ensures a whole number of cents.

### Pricing invariants

- Prices are stored as **euro cents per litre** (`FLOAT(6,2)`).
- Each gas always has exactly **one current price** (`active_from <= NOW < active_to`).
- At most **one future price** per gas is allowed (`active_from > NOW`).
- `active_to = '9999-12-31 23:59:59'` means open-ended.
- **Prices are frozen at fill time.** `fill_event_gas_fill.gas_price_id` is a FK to the price row active when the fill was recorded. Historical fills are never affected by price changes.
- All datetimes are UTC. Knex connection uses `timezone: 'Z'`.

### User roles

Roles are boolean flags on the user row (not an enum):

| Flag                | Capabilities                                          |
| ------------------- | ----------------------------------------------------- |
| `isAdmin`           | Full access including gas price management, invoicing |
| `isAdvancedBlender` | Planned — not yet in use                              |
| `isBlender`         | Can fill basic gas mixes                              |
| `isInstructor`      | Instructor-specific features                          |
| `isUser`            | Base access (own fills, own cylinder sets)            |

Only users with `isBlender`, `isAdvancedBlender`, or `isAdmin` can submit storage cylinder usage. Regular users can only record air fills (which are free).

### Fill events

A fill event records one gas-filling session. It can involve multiple cylinder sets (via the `fill_event_cylinder_set` join table) and multiple gases. The total cost is computed server-side and compared to the client's submitted price — mismatch returns 400.

Volume is calculated as: `ceil(startPressure - endPressure) × cylinderVolume` litres.

### Invoicing

A fill event is **unpaid** until a `payment_event` with status `COMPLETED` is linked to it. Invoice totals always reflect prices at fill time.

---

## Architecture

Turborepo monorepo. Run all commands from the repository root.

```
/
├── apps/
│   ├── backend/            # @tayttopaikka/backend — Fastify REST API
│   │   └── src/
│   │       ├── app.ts      # Entry point (runs migrations, connects Redis, starts server)
│   │       ├── server.ts   # Fastify server setup
│   │       ├── database/
│   │       │   ├── migrations/   # Knex migrations (run automatically on startup)
│   │       │   └── seeds/        # Dev seed data
│   │       ├── routes/     # Route handlers organised by domain
│   │       ├── lib/
│   │       │   ├── auth/         # JWT + Redis session management
│   │       │   ├── queries/      # Database queries (Knex)
│   │       │   ├── services/     # Business logic
│   │       │   └── utils/        # Shared utilities, logging, scheduler
│   │       ├── test/       # Node.js native test runner (tsx --test)
│   │       └── types/      # TypeScript type definitions (TypeBox schemas)
│   └── frontend/           # @tayttopaikka/frontend — React + Vite SPA
│       └── src/
│           ├── App.tsx     # Root with routing
│           ├── components/ # UI components
│           ├── views/      # Page-level components
│           ├── lib/        # Data layer: API calls, React Query hooks
│           └── interfaces/ # TypeScript interfaces for domain models
├── packages/
│   └── pricing/            # @tayttopaikka/pricing — shared pricing calculation (no deps)
│       └── src/
│           └── index.ts    # Pricing API, dual-build CJS + ESM
├── infra/
│   ├── backend/            # Dockerfile + fly.toml
│   └── ui/                 # Dockerfile + fly.toml (nginx)
├── openspec/               # Spec-driven development (see Workflow below)
│   ├── config.yaml         # Project context shown to AI when creating specs
│   └── changes/            # Active and archived changes
├── docs/
│   └── pricing.md          # Full pricing logic specification (authoritative)
└── .claude/commands/opsx/  # /opsx:* slash commands
```

**Key tech:** Node.js 24, TypeScript 5.9, Fastify 5, MariaDB 10.9, Redis 7, Knex 3, React 19, Vite 7, React Router 7, TanStack Query 5, Bootstrap 5, Formik + Yup, TypeBox schemas, pnpm 9, Turborepo.

---

## Build & Test Commands

```bash
# Type check all apps
pnpm run check-types

# Lint (max-warnings=0 — any warning is a failure)
pnpm run lint

# Format check
pnpm run format

# Build all
pnpm run build
```

**Running backend tests** (MariaDB and Redis must already be running — the developer handles this):

```bash
pnpm --filter @tayttopaikka/backend test
```

Tests use a separate `test_db` database. When you write new tests, run the above command to verify them. Do not worry about starting or stopping Docker services.

---

## Database Migration Rules

- Migrations run automatically on backend startup via Knex.
- **Ask before creating or applying a migration.** This is production data.
- Always create migration files via Knex — never by hand: `pnpm --filter @tayttopaikka/backend db:migrate:make MIGRATION_NAME`
- `down()` functions are generally not implemented — rollbacks are manual. Leave `down()` as a no-op or omit it unless there's a specific reason.
- Non-backward-compatible migrations are acceptable, but you must explicitly flag this to the developer so they can coordinate the deployment.
- New migrations must include pre/post sanity checks for data integrity (see `apps/backend/src/database/migrations/20260516000000_create_fill_event_cylinder_set.ts` for the pattern).

## Development Flow

Code is developed in feature branches and merged to `main` via pull request. Pushes to `main` automatically deploy to production. Local environment is not connected to production.

This means:

- Local development and experimentation can be loose — changes only reach production through a PR.
- The PR is the quality gate. Code merged to `main` must be production-ready.
- When a change affects migrations, data integrity, or pricing logic, call it out clearly in the PR description so the developer can review it carefully before merging.

---

## OpenSpec Workflow

All substantial new features and changes follow a spec-driven workflow using the [OpenSpec](https://openspec.dev) CLI. This ensures changes are planned, documented, and traceable before code is written.

### Slash commands

| Command                | Purpose                                                        |
| ---------------------- | -------------------------------------------------------------- |
| `/opsx:explore`        | Thinking mode — read code, discuss ideas, no implementation    |
| `/opsx:propose <name>` | Create a new change with proposal, design, and tasks artifacts |
| `/opsx:apply [name]`   | Implement tasks from an existing change                        |
| `/opsx:archive [name]` | Archive a completed change                                     |
| `/opsx:sync`           | Sync specs with current codebase state                         |

### Typical workflow

```
1. /opsx:explore          # Think through the problem, read relevant code
2. /opsx:propose <name>   # Scaffold: proposal.md + design.md + tasks.md
3. (review artifacts)     # Edit proposal/design/tasks if needed
4. /opsx:apply            # Implement tasks one by one
5. /opsx:archive          # Archive the completed change
```

Changes live in `openspec/changes/`. The `openspec/config.yaml` provides project context to the AI when generating artifacts.

For exploratory discussions or small fixes that don't need a full proposal, skip to `/opsx:apply` or make the change directly.

---

## Deployment

Deployments to Fly.io trigger automatically on push to `main`. **Never run a manual deploy without explicit instruction from the developer.** This is a user-gated action — confirm before proceeding. If authorized (from repo root):

```bash
flyctl deploy --config infra/backend/fly.toml --dockerfile infra/backend/Dockerfile
flyctl deploy --config infra/ui/fly.toml --dockerfile infra/ui/Dockerfile
```
