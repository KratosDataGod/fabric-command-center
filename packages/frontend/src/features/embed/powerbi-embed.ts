/**
 * Optional Power BI embed module ("user owns data"). Loaded on demand, only
 * when features.json turns the report view on and customize/powerbi.local.json
 * exists. The Fabric App's own sign-in does not issue Power BI tokens, so this
 * signs the viewer in to a company-owned Entra app registration with MSAL.
 */
import { type AccountInfo, InteractionRequiredAuthError, PublicClientApplication } from '@azure/msal-browser';
import { factories, models, type Report, service } from 'powerbi-client';

import type { PowerBiConfig } from '@/config';
import type { FilterValue, Filters } from '@/state/filters';

const SCOPES = ['https://analysis.windows.net/powerbi/api/Report.Read.All'];
let msal: PublicClientApplication | undefined;
let msalKey = '';
let pbi: service.Service | undefined;

async function getMsal(cfg: PowerBiConfig): Promise<PublicClientApplication> {
  const key = `${cfg.tenantId}/${cfg.clientId}`;
  if (msal && msalKey === key) return msal;
  msal = new PublicClientApplication({
    auth: {
      clientId: cfg.clientId,
      authority: `https://login.microsoftonline.com/${cfg.tenantId}`,
      redirectUri: window.location.origin,
    },
    cache: { cacheLocation: 'sessionStorage' },
  });
  msalKey = key;
  await msal.initialize();
  return msal;
}

/** Silent sign-in when possible; otherwise a pop-up (the app runs in an iframe, so redirects are not an option). */
export async function getPowerBiToken(cfg: PowerBiConfig, interactive: boolean): Promise<string | undefined> {
  const app = await getMsal(cfg);
  const account: AccountInfo | undefined = app.getActiveAccount() ?? app.getAllAccounts()[0];
  if (account) {
    try {
      return (await app.acquireTokenSilent({ scopes: SCOPES, account })).accessToken;
    } catch (e) {
      if (!(e instanceof InteractionRequiredAuthError) && !interactive) throw e;
    }
  }
  if (!interactive) return undefined;
  const result = await app.acquireTokenPopup({ scopes: SCOPES, account });
  app.setActiveAccount(result.account);
  return result.accessToken;
}

export async function getEmbedUrl(token: string, workspaceId: string, reportId: string): Promise<string> {
  const res = await fetch(`https://api.powerbi.com/v1.0/myorg/groups/${encodeURIComponent(workspaceId)}/reports/${encodeURIComponent(reportId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401 || res.status === 403) throw new Error('You do not have access to this report in Power BI.');
  if (res.status === 404) throw new Error('Report not found. Check its workspace and report IDs in the profile.');
  if (!res.ok) throw new Error(`Power BI returned ${res.status} for this report.`);
  const body = (await res.json()) as { embedUrl?: string };
  if (!body.embedUrl) throw new Error('Power BI did not return an embed URL for this report.');
  return body.embedUrl;
}

/** App filters → Power BI basic filters, for the targets the company mapped. */
export function toReportFilters(filters: Filters, targets: PowerBiConfig['filterTargets']): models.IBasicFilter[] {
  return Object.entries(filters)
    .filter(([k, v]) => targets?.[k] && v.length)
    .map(([k, v]) => ({
      $schema: 'http://powerbi.com/product/schema#basic',
      target: { table: targets![k]!.table, column: targets![k]!.column },
      operator: 'In',
      values: v,
      filterType: models.FilterType.Basic,
      requireSingleSelection: false,
    }));
}

export interface EmbedHandle {
  report: Report;
  setFilters: (filters: Filters) => Promise<void>;
  destroy: () => void;
}

export function embedReport(
  container: HTMLElement,
  opts: { token: string; embedUrl: string; reportId: string; pageName?: string; transparent: boolean },
  onSelect: ((dimId: string, value: FilterValue) => void) | undefined,
  cfg: PowerBiConfig
): EmbedHandle {
  pbi ??= new service.Service(factories.hpmFactory, factories.wpmpFactory, factories.routerFactory);
  const report = pbi.embed(container, {
    type: 'report',
    id: opts.reportId,
    embedUrl: opts.embedUrl,
    accessToken: opts.token,
    tokenType: models.TokenType.Aad,
    pageName: opts.pageName || undefined,
    settings: {
      panes: { filters: { visible: false, expanded: false }, pageNavigation: { visible: true } },
      background: opts.transparent ? models.BackgroundType.Transparent : models.BackgroundType.Default,
    },
  }) as Report;

  // Report clicks become app filters, so a selection follows the viewer back to the dashboard.
  if (onSelect && cfg.syncFilters !== false) {
    const reverse = Object.entries(cfg.filterTargets ?? {});
    report.on('dataSelected', (event) => {
      const detail = (event as { detail?: { dataPoints?: { identity?: { target?: { table?: string; column?: string }; equals?: unknown }[] }[] } }).detail;
      for (const point of detail?.dataPoints ?? []) {
        for (const id of point.identity ?? []) {
          const hit = reverse.find(([, t]) => t.table === id.target?.table && t.column === id.target?.column);
          if (hit && (typeof id.equals === 'string' || typeof id.equals === 'number')) onSelect(hit[0], id.equals);
        }
      }
    });
  }

  return {
    report,
    setFilters: async (filters) => {
      if (cfg.syncFilters === false) return;
      await report.updateFilters(models.FiltersOperations.ReplaceAll, toReportFilters(filters, cfg.filterTargets));
    },
    destroy: () => pbi?.reset(container),
  };
}
