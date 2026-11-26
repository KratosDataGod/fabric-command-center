# Changelog

All notable changes to this project are listed here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## Unreleased

### Added

- Command palette (Ctrl/Cmd+K or /) across all profiles, saved views and actions; pinned tiles and recently opened tiles on every launchpad.
- Period-over-period comparison on readouts and in the insight feed (`features.periodCompare`).
- Presentation mode: a timed, full-screen tour for wall screens and demos (`features.presentation`).
- `npm run setup`: guided brand, model and mapping setup that proposes `customize/models/*.json` from the model's metadata.
- Brand Studio in `npm run demo`: live brand editing with contrast checks and brand.json download.
- End-to-end and accessibility tests (Playwright and axe-core) in CI; `npm run test:e2e`.
- The doctor warns about brand colours below WCAG AA contrast.

### Changed

- Default and KratosBI comic palettes darkened to meet WCAG AA as text.
- Dashboards load on first open, so the launchpad appears sooner.

### Fixed

- Drawers no longer pull keyboard focus back on every filter change; focus stays inside drawers and search.
- Accessible names that hid visible text; interactive marks inside images.

## 1.0.0 - 2026-11-26

First public release.

### Added

- Profiles and launchpads: dashboard, Power BI report and link tiles grouped into sections, with a pre-wired Fabric Admin profile (Admin portal, Govern, Feature usage and adoption, Capacity Metrics, FUAM) and Sales, Operations and HR starters.
- Live dashboards generated from `customize/models/*.json`: core rings, readouts, holo-globe, target list, category bubbles, trend and insight feed, with multi-select cross-filtering.
- Filters pane, drill-through detail with CSV export, saved and shareable views with Fabric deep links, visual workbench, and per-panel CSV, PNG, copy, Teams and email actions.
- Branding from `customize/brand/brand.json` with dark HUD and light comic looks, and brand packs (`default`, `kratosbi`) switched with `npm run brand`.
- Optional, experimental Power BI report embedding with two-way filter sync.
- `npm run doctor` (config checks, `--live` query tests, `--discover`), `npm run demo` (synthetic data), JSON schemas for every config file, and CI.
