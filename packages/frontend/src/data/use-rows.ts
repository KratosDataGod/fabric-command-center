import { NetworkError } from '@microsoft/rayfin-lib';

import { useSemanticModelQuery } from '@/hooks/use-semantic-model-query';
import { isThrottlingError, SemanticModelQueryError } from '@/lib/semantic-model-errors';

export interface Loaded<T> {
  data: T | undefined;
  loading: boolean;
  error: string | undefined;
  refetch: () => Promise<void>;
}

/** Turns connector and Power BI failures into a sentence someone can act on. */
export function describeFailure(error: Error | undefined): string | undefined {
  if (!error) return undefined;
  if (isThrottlingError(error)) return 'The semantic model is busy (throttled). Wait a moment and try again.';
  const status = error instanceof NetworkError ? error.status : error instanceof SemanticModelQueryError ? error.httpStatus : undefined;
  if (status === 401 || status === 403) {
    return 'You do not have access to this semantic model. Ask its owner for Build permission.';
  }
  if (error instanceof SemanticModelQueryError) {
    const raw = `${error.code ?? ''} ${error.message} ${error.details ?? ''}`;
    if (/OAuthTokenRefreshFailed|AADSTS/i.test(raw)) {
      return "The model's data source sign-in has expired. Its owner can refresh it under the semantic model's Settings → Data source credentials.";
    }
    if (/Gateway/i.test(raw)) return "The model's on-premises data gateway is unreachable.";
    if (/UNKNOWN_CONNECTOR|connector/i.test(error.code ?? '')) return error.message;
    if (error.category === 'overflow') return 'This query returned more rows than Power BI allows. Add a filter.';
    return error.recoveryHint ?? error.message;
  }
  return `Could not reach the semantic model: ${error.message}`;
}

/** Runs a DAX query and returns its rows, positionally. An empty query stays idle. */
export function useRows(connection: string, query: string | undefined): Loaded<unknown[][]> {
  const { data, isLoading, error, refetch } = useSemanticModelQuery({ connection, query: query ?? '' });
  return {
    data: data?.status === 'success' ? data.table.rows : undefined,
    loading: isLoading,
    error: describeFailure(error),
    refetch,
  };
}
