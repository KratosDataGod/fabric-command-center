import { ChevronRight, Pause, Play, X } from 'lucide-react';
import { useEffect } from 'react';

import type { TourStep } from './presentation';

/** Controls shown while presenting. Space pauses, → skips, Esc exits. */
export function PresentationBar(p: { step: TourStep; index: number; count: number; paused: boolean; onPause: () => void; onNext: () => void; onExit: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') p.onExit();
      else if (e.key === ' ') p.onPause();
      else if (e.key === 'ArrowRight') p.onNext();
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [p]);
  return (
    <div className="hud-present-bar" role="toolbar" aria-label="Presentation">
      <span className="hud-dot-live" aria-hidden />
      <span className="hud-label">Presenting</span>
      <span className="hud-present-caption" aria-live="polite">{p.step.caption}</span>
      <span className="hud-mono hud-hint">{p.index + 1}/{p.count}</span>
      <div className="hud-present-progress" aria-hidden>
        {!p.paused ? <span key={p.index} className="hud-present-fill" /> : null}
      </div>
      <button type="button" className="hud-icon-btn" onClick={p.onPause} aria-label={p.paused ? 'Resume' : 'Pause'} title="Space">
        {p.paused ? <Play className="icon-size-200" aria-hidden /> : <Pause className="icon-size-200" aria-hidden />}
      </button>
      <button type="button" className="hud-icon-btn" onClick={p.onNext} aria-label="Next" title="→">
        <ChevronRight className="icon-size-200" aria-hidden />
      </button>
      <button type="button" className="hud-icon-btn" onClick={p.onExit} aria-label="Stop presenting" title="Esc">
        <X className="icon-size-200" aria-hidden />
      </button>
    </div>
  );
}
