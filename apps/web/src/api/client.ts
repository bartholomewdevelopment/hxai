import type {
  ApiErrorBody,
  ApiErrorCode,
  HistoricalPersonDetail,
  HistoricalPersonSummary,
  Paginated,
  SourceDetail,
  SourceSummary,
} from '@historyai/shared';

/** Relative base — Vite proxies /api to the backend in dev. */
const BASE_URL = '/api';

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly requestId: string | undefined;

  constructor(status: number, code: ApiErrorCode, message: string, requestId?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.requestId = requestId;
  }
}

let authToken: string | null = null;

export function setAuthToken(token: string | null): void {
  authToken = token;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        ...init?.headers,
      },
    });
  } catch {
    // Network-level failure — most often the API simply isn't running.
    throw new ApiError(0, 'INTERNAL_ERROR', 'Could not reach the HistoryAI API.');
  }

  if (!response.ok) {
    let body: Partial<ApiErrorBody> = {};
    try {
      body = (await response.json()) as Partial<ApiErrorBody>;
    } catch {
      // Non-JSON error body; fall through to the generic message below.
    }
    throw new ApiError(
      response.status,
      body.error?.code ?? 'INTERNAL_ERROR',
      body.error?.message ?? `Request failed with status ${response.status}`,
      body.error?.requestId,
    );
  }

  return (await response.json()) as T;
}

export interface PeopleQuery {
  search?: string;
  era?: string;
  category?: string;
  limit?: number;
  offset?: number;
}

export const api = {
  listPeople(query: PeopleQuery = {}): Promise<Paginated<HistoricalPersonSummary>> {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== '') params.set(key, String(value));
    }
    const qs = params.toString();
    return request(`/people${qs ? `?${qs}` : ''}`);
  },

  getPerson(slug: string): Promise<HistoricalPersonDetail> {
    return request(`/people/${encodeURIComponent(slug)}`);
  },

  listPersonSources(personId: string): Promise<Paginated<SourceSummary>> {
    return request(`/people/${encodeURIComponent(personId)}/sources`);
  },

  getSource(id: string): Promise<SourceDetail> {
    return request(`/sources/${encodeURIComponent(id)}`);
  },
};
