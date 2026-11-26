import { toCsv } from '@/data/rows';

/**
 * "Insight to action" helpers. The app runs inside a Fabric iframe, so every
 * browser capability (downloads, clipboard, pop-ups) can be blocked by the
 * host; each helper reports failure instead of throwing.
 */

export function safeFileName(name: string): string {
  return name.replace(/[^\w.-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || 'export';
}

function download(blob: Blob, fileName: string): boolean {
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    return true;
  } catch {
    return false;
  }
}

export function exportCsv(name: string, header: string[], rows: unknown[][]): boolean {
  // BOM so Excel opens UTF-8 names correctly.
  const blob = new Blob(['﻿' + toCsv(header, rows)], { type: 'text/csv;charset=utf-8' });
  return download(blob, `${safeFileName(name)}.csv`);
}

export async function exportPng(element: HTMLElement, name: string): Promise<boolean> {
  try {
    // Loaded on demand: only people who export pay for it.
    const { toPng } = await import('html-to-image');
    const background = getComputedStyle(element.closest('.hud') ?? element).getPropertyValue('--hud-bg').trim() || '#04050c';
    const dataUrl = await toPng(element, { pixelRatio: 2, backgroundColor: background, skipFonts: true });
    const blob = await (await fetch(dataUrl)).blob();
    return download(blob, `${safeFileName(name)}.png`);
  } catch {
    return false;
  }
}

/** Clipboard API first, then the legacy copy command. Returns false if both are blocked. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

function openExternal(url: string): boolean {
  try {
    return window.open(url, '_blank', 'noopener,noreferrer') !== null;
  } catch {
    return false;
  }
}

/** Microsoft Teams "share to Teams" deep link. */
export function teamsShareUrl(text: string, href?: string): string {
  const params = new URLSearchParams({ msgText: text });
  if (href) params.set('href', href);
  return `https://teams.microsoft.com/share?${params.toString()}`;
}

export function mailtoUrl(subject: string, body: string): string {
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export const shareToTeams = (text: string, href?: string) => openExternal(teamsShareUrl(text, href));
export const shareByEmail = (subject: string, body: string) => {
  try {
    window.location.href = mailtoUrl(subject, body);
    return true;
  } catch {
    return openExternal(mailtoUrl(subject, body));
  }
};
export const openInNewTab = openExternal;
