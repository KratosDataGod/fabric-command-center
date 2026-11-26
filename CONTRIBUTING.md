# Contributing

Thanks for helping make Fabric Command Center better. Issues, ideas and pull requests are all welcome.

## Set up

```bash
npm install
npm run demo        # the app on synthetic data, no Fabric account needed
npm run check       # typecheck, lint, tests and the config doctor
```

## Ground rules

- **Keep it config-driven.** Anything a company would want to change belongs in `customize/`, with a type, a validation rule, a JSON schema and docs. See the rules at the top of [AGENTS.md](AGENTS.md); they apply to people too.
- **Generate DAX in one place**: `packages/frontend/src/dax/builder.ts`, with tests.
- **No tenant data.** No real workspace, item, tenant or client IDs, names or numbers in code, tests, docs or screenshots. Use AdventureWorks or the demo data.
- **Accessible by default.** Every control is reachable by keyboard, has a name, and respects reduced motion.
- **Tests.** Add or update a spec next to the code you change.

## Pull requests

- Branch from `main`, keep each pull request to one change, and use [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:` ...).
- Update [CHANGELOG.md](CHANGELOG.md) under "Unreleased", and call out anything in `customize/` that changed shape.
- CI must pass. Add a screenshot for visible changes (from `npm run demo`).
