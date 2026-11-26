import { HudError } from './panel';

/** Body for a panel whose data is loading, failed, or empty; null when ready to draw. */
export function panelState(state: { loading: boolean; error?: string; refetch?: () => void }, hasData: boolean, empty: boolean) {
  if (state.error) return <HudError message={state.error} onRetry={state.refetch} />;
  if (!hasData) return <div className="hud-skel" aria-label="Loading" />;
  if (empty && !state.loading) return <p className="hud-hint grid h-full place-items-center">NO SIGNAL IN THIS SLICE</p>;
  return null;
}
