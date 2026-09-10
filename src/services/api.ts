import type { HealthResponse } from '../net/apiTypes';

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
    return (await res.json()) as T;
};

/** Liveness check — the only endpoint in X2; leaderboard / save / hint land in X3 / X5. */
export const health = (signal?: AbortSignal) => request<HealthResponse>('/health', { signal });

export const api = { request, health };
