# customize/

Everything a company changes lives here. The app validates these files when it starts, and `npm run doctor` checks them from the command line.

| Path | What it is | Guide |
| --- | --- | --- |
| `brand/` | The active brand: `brand.json`, logos | [Branding](../docs/customize-branding.md) |
| `brands/` | Brand packs; `npm run brand -- <pack>` makes one active | [Branding](../docs/customize-branding.md#brand-packs) |
| `models/` | One file per semantic model the dashboards use | [Connect your model](../docs/connect-your-model.md) |
| `profiles/` | One file per profile and its launchpad | [Profiles](../docs/profiles.md) |
| `features.json` | Panels, features and share actions | [Features](../docs/features.md) |
| `powerbi.example.json` | Copy to `powerbi.local.json` (git-ignored) for report embedding | [Power BI embedding](../docs/power-bi-embed.md) |
| `schema/` | JSON schemas, so your editor validates and autocompletes | |
