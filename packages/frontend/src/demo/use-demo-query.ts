import type { SemanticModelQueryResult } from '@microsoft/rayfin-connector-fabric-semanticmodel';
import { useCallback, useEffect, useState } from 'react';

import { answer } from './synthetic';

/** Drop-in replacement for useSemanticModelQuery in `npm run demo`. */
export function useSemanticModelQuery({ query }: { connection: string; query: string }) {
  const [state, setState] = useState<{ query: string; data?: SemanticModelQueryResult }>({ query: '' });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!query) return;
    const t = setTimeout(() => {
      const rows = answer(query);
      setState({ query, data: { status: 'success', table: { columns: [], rows } } as unknown as SemanticModelQueryResult });
    }, 180 + Math.random() * 320);
    return () => clearTimeout(t);
  }, [query, tick]);
  const refetch = useCallback(async () => setTick((n) => n + 1), []);
  const fresh = state.query === query;
  return { data: fresh ? state.data : undefined, isLoading: Boolean(query) && !fresh, error: undefined, refetch };
}
