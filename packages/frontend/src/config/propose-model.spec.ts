import { describe, expect, it } from 'vitest';

import { proposeModel, rowsFromInvoke } from './propose-model';
import { validateModel } from './validate';

const adventureWorks = [
  { table: 'DimDate', name: 'CalendarYear', dataType: 'Int64' },
  { table: 'DimDate', name: 'FiscalYear', dataType: 'Int64' },
  { table: 'DimSalesTerritory', name: 'SalesTerritoryCountry', dataType: 'String' },
  { table: 'DimSalesTerritory', name: 'SalesTerritoryRegion', dataType: 'String' },
  { table: 'DimProduct', name: 'Color', dataType: 'String' },
  { table: 'DimProduct', name: 'EnglishProductName', dataType: 'String' },
  { table: 'DimProductCategory', name: 'EnglishProductCategoryName', dataType: 'String' },
  { table: 'FactInternetSales', name: 'SalesAmount', dataType: 'Decimal' },
  { table: 'FactResellerSales', name: 'SalesAmount', dataType: 'Decimal' },
  { table: 'FactInternetSales', name: 'OrderQuantity', dataType: 'Int64' },
];

describe('proposeModel', () => {
  it('maps an AdventureWorks-shaped model with no measures to a valid config', () => {
    const { model, notes } = proposeModel(adventureWorks, []);
    expect(model.dimensions.time.column).toBe("'DimDate'[CalendarYear]");
    expect(model.dimensions.geo?.column).toBe("'DimSalesTerritory'[SalesTerritoryCountry]");
    expect(model.dimensions.category?.column).toBe("'DimProductCategory'[EnglishProductCategoryName]");
    expect(model.series.map((s) => s.value)).toEqual(["SUM ( 'FactInternetSales'[SalesAmount] )", "SUM ( 'FactResellerSales'[SalesAmount] )"]);
    expect(model.extraFilters?.[0]?.column).toBe("'DimSalesTerritory'[SalesTerritoryRegion]");
    expect(validateModel(model, 'proposal')).toEqual([]);
    expect(notes.join('\n')).toMatch(/Series/);
  });

  it('prefers money measures and skips time-intelligence ones', () => {
    const { model } = proposeModel(
      [{ table: 'Calendar', name: 'Year', dataType: 'Int64' }],
      [{ table: 'Sales', name: 'Sales YTD' }, { table: 'Sales', name: 'Total Revenue' }, { table: 'Sales', name: 'Order Count' }, { table: 'Sales', name: 'Units' }]
    );
    expect(model.series.map((s) => s.value)).toEqual(['[Total Revenue]']);
    expect(model.dimensions.time.column).toBe("'Calendar'[Year]");
    expect(model.dimensions.geo).toBeUndefined();
    expect(model.extraMeasures?.[0]?.expression).toBe('[Units]');
  });

  it('escapes quotes and brackets in names', () => {
    const { model } = proposeModel([{ table: "Bob's Dates", name: 'Year', dataType: 'Int64' }], [{ table: 'x', name: 'Net [EUR] Sales' }]);
    expect(model.dimensions.time.column).toBe("'Bob''s Dates'[Year]");
    expect(model.series[0]?.value).toBe('[Net [EUR]] Sales]');
  });
});

describe('rowsFromInvoke', () => {
  it('finds rows anywhere in the envelope and strips [brackets]', () => {
    const rows = rowsFromInvoke({ status: 'ok', output: { status: 'success', output: { tables: [{ rows: [{ '[Table]': 'DimDate', '[Column]': 'CalendarYear' }] }] } } });
    expect(rows).toEqual([{ Table: 'DimDate', Column: 'CalendarYear' }]);
  });
});
