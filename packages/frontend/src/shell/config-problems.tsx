import { AlertTriangle } from 'lucide-react';

/** Shown instead of the app when /customize has mistakes, so they are fixed before anyone sees a half-broken screen. */
export function ConfigProblems({ problems }: { problems: string[] }) {
  return (
    <div className="hud">
      <main className="hud-shell">
        <section className="hud-panel" style={{ maxWidth: 860, margin: '40px auto' }} aria-label="Configuration problems">
          <header className="hud-panel-head">
            <div className="flex items-center gap-300">
              <AlertTriangle className="icon-size-300" aria-hidden style={{ color: 'var(--hud-hot)' }} />
              <h1 className="hud-title">Fix the files in /customize</h1>
            </div>
          </header>
          <div className="hud-body" style={{ padding: 16 }}>
            <p>The app found {problems.length} problem{problems.length === 1 ? '' : 's'} in its configuration. Run <code className="hud-mono">npm run doctor</code> for the same list with more detail.</p>
            <ul className="hud-problems">
              {problems.map((p) => <li key={p} className="hud-mono">{p}</li>)}
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
}
