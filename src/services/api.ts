import type {
    HealthResponse,
    SavePayload,
    SaveRow,
    ScoreRow,
    ScoreSubmission,
} from '../net/apiTypes';

/** REST API base — the local server's HTTP port unless overridden at build time. */
export const API_URL: string = import.meta.env.VITE_API_URL ?? 'http://localhost:8788';

export class ApiError extends Error {
    readonly status: number;
    readonly path: string;

    constructor(status: number, path: string, message?: string) {
        super(message ?? `${path} → ${status}`);
        this.name = 'ApiError';
        this.status = status;
        this.path = path;
    }
}

interface RequestOptions {
    method?: string;
    body?: unknown;
    query?: Record<string, string | number | undefined>;
    signal?: AbortSignal;
}

const request = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
    const { method = 'GET', body, query, signal } = options;

    const url = new URL(API_URL + path);
    for (const [k, v] of Object.entries(query ?? {})) {
        if (v !== undefined) url.searchParams.set(k, String(v));
    }

    const res = await fetch(url, {
        method,
        signal,
        headers: body === undefined ? undefined : { 'content-type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
    });

    if (!res.ok) {
        throw new ApiError(res.status, path);
    }
    if (res.status === 204) {
        return undefined as T;
    }
    return (await res.json()) as T;
};

/** Liveness check. */
export const health = (signal?: AbortSignal) => request<HealthResponse>('/health', { signal });

// ---- leaderboard ----

export const submitScore = (body: ScoreSubmission) =>
    request<ScoreRow>('/scores', { method: 'POST', body });

export const fetchLeaderboard = (options?: { limit?: number; mode?: string }, signal?: AbortSignal) =>
    request<ScoreRow[]>('/leaderboard', { query: options, signal });

// ---- cloud save ----

/** Resolves to null when there is no save (or the API is unreachable). */
export const loadSave = (playerKey: string, signal?: AbortSignal): Promise<SaveRow | null> =>
    request<SaveRow>(`/save/${encodeURIComponent(playerKey)}`, { signal }).catch(() => null);

export const saveProgress = (playerKey: string, body: SavePayload) =>
    request<SaveRow>(`/save/${encodeURIComponent(playerKey)}`, { method: 'PUT', body });

/** Best-effort — a failed clear is not worth surfacing. */
export const clearSave = (playerKey: string): Promise<void> =>
    request<void>(`/save/${encodeURIComponent(playerKey)}`, { method: 'DELETE' }).catch(() => undefined);

export const api = { request, health, submitScore, fetchLeaderboard, loadSave, saveProgress, clearSave };
