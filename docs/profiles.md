# Profiles

A profile is a role's front door: a launchpad of the content that role uses, grouped into sections. People switch profiles from the header, and the app remembers their last one.

**Profiles control what is shown, not what people can access.** Fabric permissions still decide whether someone can open each report and query each model. A tile someone cannot open simply fails for them in Fabric.

## Files

One file per profile in `customize/profiles/`:

```json
{
  "$schema": "../schema/profile.schema.json",
  "id": "operations",
  "name": "Operations",
  "icon": "truck",
  "order": 30,
  "description": "Throughput, backlog and service levels.",
  "enabled": true,
  "sections": [
    {
      "title": "Live dashboards",
      "items": [
        { "type": "dashboard", "id": "ops-hud", "title": "Operations live", "model": "operations" }
      ]
    }
  ]
}
```

- `id` must be unique across profiles, and each tile `id` must be unique within its profile. Ids appear in saved views and shared links, so avoid changing them once people use them.
- `order` sorts the profile list (lowest first); the first profile is where new viewers start.
- `icon` is one of `chart`, `shield`, `cog`, `users`, `briefcase`, `globe`, `gauge`, `dollar`, `book`, `sparkles`, `truck`, `heart`.
- `"enabled": false` hides a profile without deleting it.

## Tiles

| Type | Fields | Opens |
| --- | --- | --- |
| `dashboard` | `model`: a file name in `customize/models/` | The live dashboard inside the app |
| `report` | `workspaceId`, `reportId`, optional `pageName` | The report in Fabric in a new tab, or inside the app when [embedding](power-bi-embed.md) is on |
| `link` | `url` (must be https) | The link in a new tab |

Every tile can also have a `description` and a `source` (shown at the bottom of the tile, such as "FUAM" or "Microsoft Learn").

### Finding a report's IDs

Open the report in Fabric. The address looks like this:

```text
https://app.fabric.microsoft.com/groups/<workspaceId>/reports/<reportId>/<pageName>
```

Copy the two IDs into the tile. Until both are filled in, the tile shows **Setup needed** and opening it explains what to do. `npm run doctor` lists every tile still waiting.

## The Fabric Admin profile

`customize/profiles/admin.json` is pre-wired with the admin content most tenants use. Each report tile needs its IDs once the content exists in your tenant.

**Built into Fabric**

- **Admin portal**: a link; works immediately.
- **Govern report** and **Feature usage and adoption**: in the Admin monitoring workspace, which Fabric creates the first time a Fabric administrator opens it. Feature usage and adoption is a preview report. See [What is the admin monitoring workspace?](https://learn.microsoft.com/fabric/admin/monitoring-workspace)
- **Capacity Metrics**: the Microsoft Fabric Capacity Metrics app, installed by a capacity admin. See [Install the Capacity Metrics app](https://learn.microsoft.com/fabric/enterprise/metrics-app-install).

**FUAM (Fabric Unified Admin Monitoring)**

[FUAM](https://github.com/microsoft/fabric-toolbox/tree/main/monitoring/fabric-unified-admin-monitoring) is an open-source solution accelerator in Microsoft's fabric-toolbox that collects tenant settings, activities, capacity metrics, inventory and more into a lakehouse with ready-made reports. Deploy it once, then add the IDs of its reports: Core, Item Analyzer, SQL Endpoint Analyzer, Semantic Model Meta Data Analyzer and Gateway Monitoring.

FUAM is a community accelerator, not a supported Microsoft product; read its documentation before deploying it.

## Starter profiles

`operations.json` and `hr.json` are starting points with placeholder tiles. Replace the tiles with your own reports and links, add a model file for a live dashboard, or set `"enabled": false` until they are ready.

## Ideas for more profiles

- **Finance**: P&L dashboard on the finance model, budget-vs-actual reports, the close calendar.
- **Executive**: one live dashboard per business unit, the board pack report.
- **Data team**: Capacity Metrics, FUAM Item Analyzer, the semantic model catalog, runbooks.
- **Customer success**: health score dashboard, renewals report, the CRM.
