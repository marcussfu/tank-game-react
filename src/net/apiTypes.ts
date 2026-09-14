/**
 * Shared request/response shapes for the REST API — imported by both
 * `src/services/api.ts` (browser) and `server/src/` (Node), the same
 * cross-boundary pattern as `protocol.ts`.
 */

import type { EngineSnapshot } from '../engine/types';

export interface HealthResponse {
    ok: boolean;
    /** Server clock at response time (ms). */
    ts: number;
}

// ---- leaderboard ----

export interface ScoreRow {
    id: string;
    name: string;
    score: number;
    /** 1-based level the run reached. */
    level: number;
    /** 'solo' | 'coop' | 'online' — validated at the route. */
    mode: string;
    createdAt: number;
}

/** `POST /scores` body. */
export type ScoreSubmission = Pick<ScoreRow, 'name' | 'score' | 'level' | 'mode'>;

// ---- cloud save ----

export interface SaveRow {
    levelIndex: number;
    lives: number;
    score: number;
    updatedAt: number;
}

/** `PUT /save/:key` body. */
export type SavePayload = Pick<SaveRow, 'levelIndex' | 'lives' | 'score'>;

// ---- pause hint (LLM) ----

/** `POST /hint` body — the paused game's own snapshot (server-side only; the
 * LLM key never reaches the browser). */
export interface HintRequest {
    snapshot: EngineSnapshot;
}

export interface HintResponse {
    hint: string;
}
