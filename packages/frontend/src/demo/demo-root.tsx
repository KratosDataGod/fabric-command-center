import { ErrorBoundary } from 'react-error-boundary';

import App from '@/App';
import { ErrorFallback } from '@/ErrorFallback';
import { ThemeContext } from '@/hooks/theme.context';
import { useAppTheme } from '@/hooks/use-theme';

/** The app without Fabric sign-in, on synthetic data. Shows a banner so nobody mistakes it for real numbers. */
export function DemoRoot() {
  const { isDark, toggleTheme } = useAppTheme();
  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <div className="fcc-demo-banner" role="note">Demo mode · synthetic data · not connected to Fabric</div>
        <App />
      </ErrorBoundary>
    </ThemeContext.Provider>
  );
}
