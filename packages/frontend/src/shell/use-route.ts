import { createFabricAppStateClient, type FabricAppState, type FabricAppStateClient } from '@microsoft/rayfin-app-state-fabric';
import { useCallback, useEffect, useRef, useState } from 'react';

import { type Route, sanitizeRoute } from '@/state/navigation';

import { defaultRoute, known } from './content';

const inFrame = (() => {
  try {
    return window.parent !== window;
  } catch {
    return true;
  }
})();

let client: FabricAppStateClient | undefined;
function getClient(): FabricAppStateClient | undefined {
  if (!inFrame) return undefined;
  try {
    client ??= createFabricAppStateClient();
  } catch {
    client = undefined;
  }
  return client;
}

const toState = (r: Route): FabricAppState => JSON.parse(JSON.stringify({ v: 1, ...r })) as FabricAppState;
const fromState = (s: FabricAppState | undefined): Route | undefined => sanitizeRoute(s, known);

/**
 * Where the viewer is, mirrored into the Fabric portal URL when the host
 * supports deep links: the address bar is then a shareable link, and Back
 * and Forward work. Elsewhere (local dev, older hosts) it stays in memory.
 */
export function useRoute() {
  const [route, setRoute] = useState<Route>(() => fromState(getClient()?.getLaunchStateSync()) ?? defaultRoute());
  const [deepLinks, setDeepLinks] = useState(false);
  const supported = useRef(false);

  useEffect(() => {
    const c = getClient();
    if (!c) return;
    let alive = true;
    void c.getLaunchState().then((s) => {
      const r = fromState(s);
      if (alive && r) setRoute(r);
    }).catch(() => undefined);
    void c.isSupported().then((caps) => {
      if (!alive) return;
      supported.current = Boolean(caps);
      setDeepLinks(Boolean(caps));
    }).catch(() => undefined);
    const off = c.onStateChange((s) => setRoute(fromState(s) ?? defaultRoute()));
    return () => {
      alive = false;
      off();
    };
  }, []);

  /** User-caused moves make a history entry; `replace` is for app-caused or rapid changes. */
  const navigate = useCallback((next: Route, opts?: { replace?: boolean }) => {
    setRoute(next);
    const c = getClient();
    if (!c || !supported.current) return;
    const write = opts?.replace ? c.replaceState(toState(next)) : c.setState(toState(next));
    write.catch(() => undefined);
  }, []);

  return { route, navigate, deepLinks };
}
