import type { ModelConfig, ValueFormat } from '@/config';

export interface Formatters {
  /** Compact value, e.g. $1.2M. */
  value: (n: number) => string;
  /** Full value, e.g. $1,234,567. */
  full: (n: number) => string;
  count: (n: number) => string;
  pct: (n: number) => string;
  /** Formats with an explicit format (visual builder measures). */
  as: (n: number, format?: ValueFormat) => string;
}

export function formattersFor(model: Pick<ModelConfig, 'locale' | 'currency' | 'valueFormat'>): Formatters {
  const locale = model.locale || undefined;
  const currency = model.currency || 'USD';
  const make = (format: ValueFormat | undefined, compact: boolean) => {
    const base: Intl.NumberFormatOptions = compact ? { notation: 'compact', maximumFractionDigits: 1, minimumFractionDigits: 0 } : { maximumFractionDigits: 0 };
    if (format === 'percent') return new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 1 });
    if (format === 'number') return new Intl.NumberFormat(locale, base);
    return new Intl.NumberFormat(locale, { style: 'currency', currency, ...base });
  };
  const compactFmt = make(model.valueFormat, true);
  const fullFmt = make(model.valueFormat, false);
  const countFmt = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  const pctFmt = new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 1 });
  return {
    value: (n) => compactFmt.format(n),
    full: (n) => fullFmt.format(n),
    count: (n) => countFmt.format(n),
    pct: (n) => pctFmt.format(n),
    as: (n, format) => make(format ?? model.valueFormat, true).format(n),
  };
}

export function ratio(n: number, d: number): number | undefined {
  return d ? n / d : undefined;
}
