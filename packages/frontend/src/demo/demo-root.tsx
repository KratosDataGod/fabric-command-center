import { Palette } from 'lucide-react';
import { lazy, Suspense, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

import App from '@/App';
import { ErrorFallback } from '@/ErrorFallback';
import { ThemeContext } from '@/hooks/theme.context';
import { useAppTheme } from '@/hooks/use-theme';

const BrandStudio = lazy(() => import('./brand-studio').then((m) => ({ default: m.BrandStudio })));

/** The app without Fabric sign-in, on synthetic data. Shows a banner so nobody mistakes it for real numbers. */
export function DemoRoot() {
  const { isDark, toggleTheme } = useAppTheme();
  const [studio, setStudio] = useState(() => new URLSearchParams(window.location.search).has('studio'));
  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <div className="fcc-demo-banner" role="note">Demo mode · synthetic data · not connected to Fabric</div>
        <div className="hud hud--bare">
          {!studio ? (
            <button type="button" className="hud-btn fcc-studio-open" onClick={() => setStudio(true)}>
              <Palette className="icon-size-200" aria-hidden /> Brand Studio
            </button>
          ) : null}
        </div>
        <div className={studio ? 'fcc-with-studio' : undefined}>
          <App />
        </div>
        {studio ? (
          <div className="hud hud--bare">
            <Suspense fallback={null}>
              <BrandStudio look={isDark ? 'hud' : 'comic'} onClose={() => setStudio(false)} />
            </Suspense>
          </div>
        ) : null}
      </ErrorBoundary>
    </ThemeContext.Provider>
  );
}
