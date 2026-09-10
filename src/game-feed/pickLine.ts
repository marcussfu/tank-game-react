type Pools = Record<string, readonly string[]>;

const shuffled = <T>(src: readonly T[]): T[] => {
    const out = [...src];
    for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
};

/**
 * Per-category bag picker: hands out every line in a category once, in random
 * order, before any line repeats. Returns null for an unknown or empty
 * category. Stateful — one instance per `bindBanter`.
 */
export const makePicker = (pools: Pools) => {
    const bags: Record<string, string[]> = {};

    return (category: string): string | null => {
        const pool = pools[category];
        if (!pool || pool.length === 0) return null;
        if (!bags[category] || bags[category].length === 0) {
            bags[category] = shuffled(pool);
        }
        return bags[category].pop() ?? null;
    };
};
