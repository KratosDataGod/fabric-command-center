# Architecture

Fabric Command Center is a React and Vite single-page app, deployed as a Fabric App with the Rayfin SDK. It has no server of its own: the browser queries semantic models through Rayfin's semantic-model connector, as the signed-in viewer.

```text
customize/*.json ──► config loader + validation ──► app shell (profiles, routing)
                                                         │
                     ┌───────────────────────────────────┼─────────────────────┐
                     ▼                                   ▼                     ▼
               launchpad tiles                  dashboard screen        report view (optional)
                                                         │                     │
                                     DAX builder ◄── filters state ──► powerbi-client + MSAL
                                          │
                                          ▼
                     Rayfin connector (fabric-semanticmodel, delegated) ──► your semantic model
```

## Source layout (`packages/frontend/src`)

| Folder | Responsibility |
| --- | --- |
| `config/` | Loads `customize/` at build time, types it, validates it, and exposes feature switches |
| `brand/` | Turns `brand.json` into CSS variables, fonts, title and favicon before the first render |
| `shell/` | Header, profile picker, launchpad, routing and deep links, toasts |
| `dashboard/` | The dashboard screen and the context every visual reads (model, filters, formatters, colours) |
| `dax/` | Generates every DAX query from a model description. Results are read by column position |
| `data/` | Runs queries, turns failures into actionable messages, shapes rows, formats numbers |
| `state/` | Filters, saved views and share codes, and validation of routes from links |
| `hud/` | The visuals and the HUD and comic styles |
| `features/` | Filters pane, drill-through, saved views, workbench, share actions, and the optional embed module |
| `geo/` | Country name to map position |
| `demo/` | Synthetic data and the Brand Studio for `npm run demo`; never part of a Fabric build |

## Decisions worth knowing

- **Config, not code.** Everything a company changes is JSON in `customize/`, validated at start-up and by the doctor with the same functions. A mistake shows a list of problems instead of a broken screen.
- **Generated DAX.** Queries are built from the model file with `SUMMARIZECOLUMNS` and `TREATAS` filters. Each visual leaves its own dimension out of its filters, so it highlights the selection instead of collapsing to it. Filter values are escaped; column references must match `'Table'[Column]`.
- **Delegated identity.** Every query runs as the viewer, so semantic-model permissions and row-level security apply. Profiles only choose what is shown.
- **Untrusted links.** Deep-link state and share codes are parsed and validated against the current configuration before use; unknown profiles, tiles or dimensions are dropped.
- **Optional modules load late.** The embed module, `powerbi-client` and MSAL load only when an embedded report opens; the PNG exporter loads on first export.
- **No secrets in the repository.** Tenant IDs and model IDs live in git-ignored files.

## Scripts

`scripts/` holds the doctor, setup and brand commands. They run on plain Node and reuse the app's own TypeScript (validation, DAX builder, model proposal) through Node's type stripping, so the command line and the app never disagree.

## Quality gates

- `npm run check`: TypeScript typecheck, ESLint, the Vitest unit suites and the doctor.
- `npm run test:e2e`: Playwright tests on the demo build at desktop, laptop and phone sizes, with axe-core WCAG 2.1 AA checks in both looks.

CI runs both on every pull request.
