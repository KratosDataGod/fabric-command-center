import { type ReactNode, useCallback, useMemo, useState } from 'react';

import { addRecent, loadPersonal, type Personal, sameRef, storePersonal, togglePin, type TileRef } from '@/state/personal';

import { findItem } from './content';
import { PersonalContext } from './personal-context';

const exists = (r: TileRef) => Boolean(findItem(r.profile, r.item));

export function PersonalProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Personal>(() => loadPersonal(exists));
  const update = useCallback((fn: (p: Personal) => Personal) => {
    setState((p) => {
      const next = fn(p);
      storePersonal(next);
      return next;
    });
  }, []);
  const api = useMemo(
    () => ({
      ...state,
      isPinned: (ref: TileRef) => state.pins.some((x) => sameRef(x, ref)),
      togglePin: (ref: TileRef) => update((p) => togglePin(p, ref)),
      touch: (ref: TileRef) => update((p) => addRecent(p, ref)),
    }),
    [state, update]
  );
  return <PersonalContext.Provider value={api}>{children}</PersonalContext.Provider>;
}
