# Changelog

All notable changes to this project are listed here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## Unreleased

## 1.0.0 - 2026-11-26

First public release.

### Added

- Profiles and launchpads: dashboard, Power BI report and link tiles grouped into sections, with a pre-wired Fabric Admin profile (Admin portal, Govern, Feature usage and adoption, Capacity Metrics, FUAM) and Sales, Operations and HR starters.
- Live dashboards generated from `customize/models/*.json`: core rings, readouts, holo-globe, target list, category bubbles, trend and insight feed, with multi-select cross-filtering.
- Filters pane, drill-through detail with CSV export, saved and shareable views with Fabric deep links, visual workbench, and per-panel CSV, PNG, copy, Teams and email actions.
- Branding from `customize/brand/brand.json` with dark HUD and light comic looks, and brand packs (`default`, `kratosbi`) switched with `npm run brand`.
- Optional, experimental Power BI report embedding with two-way filter sync.
- `npm run doctor` (config checks, `--live` query tests, `--discover`), `npm run demo` (synthetic data), JSON schemas for every config file, and CI.
