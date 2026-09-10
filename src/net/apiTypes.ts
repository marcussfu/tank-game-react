/**
 * Shared request/response shapes for the REST API — imported by both
 * `src/services/api.ts` (browser) and `server/src/http/` (Node), the same
 * cross-boundary pattern as `protocol.ts`. X2 has only `/health`; leaderboard /
 * save shapes arrive with X3, `/hint` with X5.
 */

export interface HealthResponse {
    ok: boolean;
    /** Server clock at response time (ms). */
    ts: number;
}
