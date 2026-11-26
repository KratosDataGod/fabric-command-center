import { createContext, useContext } from 'react';

import type { Personal, TileRef } from '@/state/personal';

export interface PersonalApi extends Personal {
  isPinned: (ref: TileRef) => boolean;
  togglePin: (ref: TileRef) => void;
  touch: (ref: TileRef) => void;
}

export const PersonalContext = createContext<PersonalApi>({
  pins: [],
  recent: [],
  isPinned: () => false,
  togglePin: () => {},
  touch: () => {},
});
export const usePersonal = () => useContext(PersonalContext);
