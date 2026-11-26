# Power BI embedding (optional, experimental)

By default a report tile opens the report in Fabric in a new tab. That needs no setup and always works.

This optional module shows reports **inside** the app instead, with the app's filters applied, and turns clicks in the report back into app filters. It is off by default because each company must register its own Entra app, and because it has not yet been tested end to end in a tenant. Treat it as experimental and test it in a non-production workspace first.

## How it works

The Fabric App's own sign-in does not issue Power BI tokens. So the module signs the viewer in to a single-page Entra app that your company registers (Microsoft's "user owns data" pattern), with a pop-up, and then:

1. asks the Power BI REST API for the report's embed URL,
2. embeds it with the `powerbi-client` library,
3. pushes the app's filters into the report as basic filters, and listens for clicks in the report.

The viewer's own Power BI permissions apply. Nobody sees a report they could not open in Fabric. The module's code and libraries are only downloaded when someone opens an embedded report.

## Set it up

1. **Register an Entra app** (Microsoft Entra admin center → App registrations → New registration).
   - Platform: **Single-page application**. Add the app's address as a redirect URI. The first sign-in attempt that fails shows the exact address Entra expects.
   - API permissions: **Power BI Service → Delegated → Report.Read.All**. Grant admin consent if your tenant requires it.
2. **Create `customize/powerbi.local.json`** from `customize/powerbi.example.json` and fill in the app's client ID and your tenant ID. The file is git-ignored, so your tenant details never reach the repository. (The client ID of a single-page app is not a secret, but it is still specific to your tenant.)
3. **Map filters.** `filterTargets` says which report column each app filter applies to:

   ```json
   "filterTargets": {
     "time": { "table": "DimDate", "column": "CalendarYear" },
     "geo": { "table": "DimSalesTerritory", "column": "SalesTerritoryCountry" }
   }
   ```

   Keys are the app's filter ids (`time`, `geo`, `category`, or an `extraFilters` id). Reports without a mapped column ignore that filter. Set `"syncFilters": false` to embed reports without any filter sync.
4. **Turn it on** in `customize/features.json`: `"views": { "report": true }`.
5. Run `npm run doctor`, then deploy.

## Limits

- Pop-ups must be allowed for Fabric; the app runs in a frame, so it cannot use a full-page redirect.
- The Fabric hosting environment's content security policy must allow frames from app.powerbi.com and calls to api.powerbi.com and login.microsoftonline.com. If it does not, report tiles keep working by opening in Fabric.
- Only report tiles with both IDs set are embedded.
