import { X } from 'lucide-react';
import { type ReactNode, useRef } from 'react';

import { useFocusTrap } from '@/hooks/use-focus-trap';

/** Slide-over panel used by the filters pane, drill-through and saved views. */
export function Drawer({ title, onClose, wide, children }: { title: string; onClose: () => void; wide?: boolean; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, onClose);
  return (
    <div className="hud-drawer-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title} className={`hud-drawer ${wide ? 'hud-drawer--wide' : ''}`}>
        <header className="hud-drawer-head">
          <h2 className="hud-title">{title}</h2>
          <button type="button" className="hud-icon-btn" onClick={onClose} aria-label="Close">
            <X className="icon-size-200" aria-hidden />
          </button>
        </header>
        <div className="hud-drawer-body">{children}</div>
      </div>
    </div>
  );
}
