import type { EngineSnapshot, Position } from '../engine/types';

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

const lerpPos = (from: Position, to: Position, t: number): Position => [
    lerp(from[0], to[0], t),
    lerp(from[1], to[1], t),
];

/**
 * Blends entity positions between the two most recent server snapshots so the
 * ~20 Hz snapshot stream renders smoothly at display frame rate. Only
 * positions of entities present in BOTH snapshots are interpolated — anything
 * new pops in at its `latest` position, anything gone simply isn't in
 * `latest`. Everything non-positional (direction, tiles, status, lives, …)
 * comes straight from `latest`, which is always the authoritative truth.
 *
 * `alpha` is the fraction of a snapshot interval elapsed since `latest`
 * arrived, clamped to [0, 1]; 0 renders `prev`'s positions, 1 renders
 * `latest`'s.
 */
export const interpolateSnapshot = (
    prev: EngineSnapshot | null,
    latest: EngineSnapshot,
    alpha: number,
): EngineSnapshot => {
    if (!prev || prev === latest) return latest;
    const t = alpha <= 0 ? 0 : alpha >= 1 ? 1 : alpha;
    if (t === 1) return latest;

    const prevTanks = new Map(prev.tanks.map((tk) => [tk.keyIndex, tk.position]));
    const prevBullets = new Map(prev.bullets.map((b) => [b.keyIndex, b.position]));
    const prevPlayers = new Map(prev.players.map((p) => [p.id, p.position]));

    const tanks = latest.tanks.map((tk) => {
        const from = prevTanks.get(tk.keyIndex);
        return from ? { ...tk, position: lerpPos(from, tk.position, t) } : tk;
    });
    const bullets = latest.bullets.map((b) => {
        const from = prevBullets.get(b.keyIndex);
        return from ? { ...b, position: lerpPos(from, b.position, t) } : b;
    });
    const players = latest.players.map((p) => {
        const from = prevPlayers.get(p.id);
        return from && !p.hidden ? { ...p, position: lerpPos(from, p.position, t) } : p;
    });

    return { ...latest, tanks, bullets, players, player: players[0] };
};
