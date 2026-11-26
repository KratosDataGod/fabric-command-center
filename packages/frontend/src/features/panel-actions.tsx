import { Copy, Download, Image as ImageIcon, Mail, MoreHorizontal, Table2, Users } from 'lucide-react';
import { useEffect, useRef, useState, type RefObject } from 'react';

import { features, isActionOn } from '@/config';
import { useToast } from '@/shell/toast-context';

import { copyText, exportCsv, exportPng, shareByEmail, shareToTeams } from './actions';

export interface PanelData {
  title: string;
  header: string[];
  rows: unknown[][];
  /** One-paragraph plain-text summary for copy / Teams / email. */
  summary: string;
}

/** The "⋯" menu on every panel: export, copy, share, drill through. */
export function PanelActions({ data, target, onDetail }: { data: PanelData | undefined; target: RefObject<HTMLElement | null>; onDetail?: () => void }) {
  const [open, setOpen] = useState(false);
  const toast = useToast();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  const runChecked = async (fn: () => boolean | Promise<boolean>, ok: string, fail: string) => {
    setOpen(false);
    const done = await fn();
    toast(done ? ok : fail, done ? 'ok' : 'warn');
  };
  const items = [
    data && isActionOn('csv') && { icon: Download, label: 'Export CSV', act: () => runChecked(() => exportCsv(data.title, data.header, data.rows), 'CSV downloaded.', 'Downloads are blocked here. Try Copy summary instead.') },
    isActionOn('png') && { icon: ImageIcon, label: 'Export PNG', act: () => runChecked(() => (target.current ? exportPng(target.current, data?.title ?? 'panel') : false), 'Image downloaded.', 'Could not export an image in this browser.') },
    data && isActionOn('copy') && { icon: Copy, label: 'Copy summary', act: () => runChecked(() => copyText(data.summary), 'Summary copied.', 'Clipboard is blocked here.') },
    data && isActionOn('teams') && { icon: Users, label: 'Share to Teams', act: () => runChecked(() => shareToTeams(data.summary, features.shareUrl || undefined), 'Opening Teams…', 'Pop-ups are blocked. Use Copy summary instead.') },
    data && isActionOn('email') && { icon: Mail, label: 'Email', act: () => runChecked(() => shareByEmail(data.title, `${data.summary}\n\n${features.shareUrl ?? ''}`.trim()), 'Opening your email app…', 'Could not open email.') },
    onDetail && { icon: Table2, label: 'Show detail', act: () => { setOpen(false); onDetail(); } },
  ].filter(Boolean) as { icon: typeof Download; label: string; act: () => void }[];

  if (!items.length) return null;
  return (
    <div ref={ref} className="hud-panel-actions relative">
      <button type="button" className="hud-icon-btn" aria-label="Panel actions" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <MoreHorizontal className="icon-size-200" aria-hidden />
      </button>
      {open ? (
        <div className="hud-menu" role="menu">
          {items.map(({ icon: Icon, label, act }) => (
            <button key={label} type="button" role="menuitem" className="hud-menu-item" onClick={act}>
              <Icon className="icon-size-200" aria-hidden /> {label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
