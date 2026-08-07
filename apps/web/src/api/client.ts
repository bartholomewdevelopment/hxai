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

// ---------------------------------------------------------------- admin API
//
// Kept in the same client so the auth token and error envelope handling are
// shared. Every call below requires a curator or admin token.

export interface AdminSourceSummary {
  id: string;
  historicalPersonId: string;
  title: string;
  author: string | null;
  documentType: string | null;
  dateCreated: string | null;
  approximateDate: string | null;
  archiveName: string | null;
  sourceType: string;
  rightsStatus: string;
  verificationStatus: string;
  published: boolean;
  processingStatus: string;
  processingError: string | null;
  chunkCount: number;
  hasText: boolean;
  textLength: number;
  embeddedAt: string | null;
  updatedAt: string;
}

export interface AdminSourceDetail extends AdminSourceSummary {
  description: string | null;
  collectionName: string | null;
  canonicalUrl: string | null;
  transcriptionUrl: string | null;
  originalDocumentUrl: string | null;
  retrievedFrom: string | null;
  retrievedAt: string | null;
  fullText: string | null;
  rightsNotes: string | null;
  contentHash: string | null;
  metadata: Record<string, unknown>;
}

export interface AdminChunk {
  id: string;
  chunkIndex: number;
  text: string;
  tokenCount: number | null;
  embedded: boolean;
}

export interface AdminDashboard {
  people: {
    id: string;
    slug: string;
    displayName: string;
    published: boolean;
    sourceCount: number;
  }[];
  sourcesByProcessingStatus: { status: string; total: number }[];
  sourcesByRightsStatus: { rights: string; total: number }[];
  sourcesByType: { sourceType: string; total: number }[];
  chunks: { chunks: number; embedded: number };
}

export const adminApi = {
  dashboard: (): Promise<AdminDashboard> => request('/admin/dashboard'),

  listSources: (personId?: string): Promise<Paginated<AdminSourceSummary>> =>
    request(`/admin/sources${personId ? `?personId=${personId}` : ''}`),

  getSource: (id: string): Promise<{ source: AdminSourceDetail; chunks: AdminChunk[] }> =>
    request(`/admin/sources/${id}`),

  createSource: (body: Record<string, unknown>): Promise<AdminSourceDetail> =>
    request('/admin/sources', { method: 'POST', body: JSON.stringify(body) }),

  updateSource: (id: string, body: Record<string, unknown>): Promise<AdminSourceDetail> =>
    request(`/admin/sources/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),

  processSource: (
    id: string,
    force = false,
  ): Promise<{ chunksCreated: number; skipped: boolean; warnings: string[] }> =>
    request(`/admin/sources/${id}/process`, { method: 'POST', body: JSON.stringify({ force }) }),

  embedSource: (id: string, force = false): Promise<{ chunksEmbedded: number; skipped: boolean }> =>
    request(`/admin/sources/${id}/embed`, { method: 'POST', body: JSON.stringify({ force }) }),

  setPublished: (id: string, published: boolean): Promise<AdminSourceDetail> =>
    request(`/admin/sources/${id}/publish`, {
      method: 'POST',
      body: JSON.stringify({ published }),
    }),
};

export const authApi = {
  login: (
    email: string,
    password: string,
  ): Promise<{ user: { id: string; email: string; role: string }; token: string }> =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
};
