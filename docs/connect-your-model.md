# Connect your model

Dashboards never contain hand-written DAX. Each one reads a short description of a semantic model from `customize/models/<id>.json`, and the app generates every query from it. To move the app to another model, you edit this file.

## The connector

`rayfin/rayfin.yml` declares one connector per semantic model. The default is called `salesmodel` and takes its IDs from `rayfin/.env`:

```yaml
connectors:
  - name: salesmodel
    type: fabric-semanticmodel
    config:
      workspaceId: ${FCC_MODEL_WORKSPACE_ID}
      itemId: ${FCC_MODEL_ITEM_ID}
    auth:
      type: delegated
```

`delegated` means every query runs as the person viewing the app, so their permissions and any row-level security apply.

To add a second model, add another connector with its own variables (for example `${FCC_OPS_WORKSPACE_ID}`), add the variables to `rayfin/.env`, and create a new `customize/models/<id>.json` that uses it. You can also run `npx rayfin connector add` to add one interactively.

## The model file

```jsonc
{
  "$schema": "../schema/model.schema.json",
  "id": "sales",                    // must match the file name
  "connector": "salesmodel",        // a connector name from rayfin.yml
  "modelName": "AdventureWorks sales",
  "locale": "en-US",
  "currency": "USD",
  "valueFormat": "currency",        // currency, number or percent
  "series": [ ... ],                // 1 to 4 things to compare
  "dimensions": { ... },            // time, geo and category
  "extraFilters": [ ... ],          // more slicers for the filters pane
  "detail": { ... },                // drill-through columns
  "extraMeasures": [ ... ]          // more measures for the workbench
}
```

### Series

A series is one of the things the dashboard compares, such as two sales channels or three business units. Each has a DAX expression, and optionally a units expression (when every series has one, the readouts show units and value per unit).

```json
{
  "id": "internet",
  "label": "Internet",
  "short": "WEB",
  "value": "SUM ( 'FactInternetSales'[SalesAmount] )",
  "units": "SUM ( 'FactInternetSales'[OrderQuantity] )"
}
```

`value` can be any scalar DAX expression, including a measure reference such as `[Total Sales]`. If your model has one measure and no natural split, use a single series.

### Dimensions

| Dimension | Drives | Example |
| --- | --- | --- |
| `time` | the trend line | `'DimDate'[CalendarYear]` |
| `geo` | the globe and the target list | `'DimSalesTerritory'[SalesTerritoryCountry]` |
| `category` | the bubble chart | `'DimProduct'[Color]` |

`time` is required. `geo` and `category` are optional: leave one out and its panels are hidden. Every column must be written as `'Table'[Column]`, and it must be related to the tables your series use, or filters on it will not change the numbers.

The globe places countries by name. It knows common names and aliases (USA, UK, Czech Republic and so on). For names it does not know, add `aliases` (your name → its English name) or exact `coordinates` (`[longitude, latitude]`) to `geo`. Countries it cannot place are listed as "not on map" and still appear in the target list.

For `category`, set `"colorNames": true` when the members are colour names, and the bubbles are painted in those colours.

### Extra filters, detail and extra measures

```json
"extraFilters": [{ "id": "region", "label": "Region", "column": "'DimSalesTerritory'[SalesTerritoryRegion]" }],
"detail": {
  "columns": [{ "label": "Product", "column": "'DimProduct'[EnglishProductName]" }],
  "maxRows": 500
},
"extraMeasures": [{ "id": "units", "label": "Units", "expression": "SUM ( 'FactInternetSales'[OrderQuantity] )", "format": "number" }]
```

- `extraFilters` appear in the filters pane and can be saved in views.
- `detail.columns` are the rows of the drill-through table (up to `maxRows`, at most 5,000).
- `extraMeasures` are offered in the visual workbench next to the series.

## Find the right names

```bash
npx rayfin login
npm run doctor -- --discover            # first connector
npm run doctor -- --discover salesmodel # a specific one
```

This lists the model's measures and visible columns. Then run `npm run doctor -- --live` to execute every query the app will run.

## Adding a dashboard tile

A model file does nothing until a profile points at it:

```json
{ "type": "dashboard", "id": "ops-hud", "title": "Operations live", "model": "operations" }
```

See [Profiles](profiles.md).
