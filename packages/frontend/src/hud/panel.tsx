import { AlertTriangle } from 'lucide-react';
import { forwardRef, type ReactNode } from 'react';

export const HudPanel = forwardRef<
  HTMLElement,
  { code: string; title: string; hint?: ReactNode; actions?: ReactNode; className?: string; children: ReactNode }
>(function HudPanel({ code, title, hint, actions, className, children }, ref) {
  return (
    <section ref={ref} className={`hud-panel ${className ?? ''}`} aria-label={title}>
      <span className="hud-halftone" aria-hidden />
      <header className="hud-panel-head">
        <div className="flex min-w-0 items-baseline gap-300">
          <span className="hud-code">{code}</span>
          <h2 className="hud-title truncate">{title}</h2>
        </div>
        <div className="flex min-w-0 items-center gap-200">
          {hint ? <span className="hud-hint truncate">{hint}</span> : null}
          {actions}
        </div>
      </header>
      <div className="hud-body">{children}</div>
    </section>
  );
});

export function HudError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="hud-error">
      <AlertTriangle className="icon-size-200 mt-100 shrink-0" aria-hidden style={{ color: 'var(--hud-hot)' }} />
      <span className="flex-1">{message}</span>
      {onRetry ? (
        <button type="button" className="hud-btn" onClick={onRetry}>
          Retry
        </button>
      ) : null}
    </div>
  );
}
