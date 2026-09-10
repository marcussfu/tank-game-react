const STORAGE_KEY = 'tank:playerKey';

/**
 * A stable anonymous id for this browser, used to key cloud saves. Persisted in
 * `localStorage` — clearing site data starts a fresh identity (that's the
 * accepted tradeoff for a no-auth save). Falls back to a volatile id if
 * storage is unavailable (private mode, etc.).
 */
export const getPlayerKey = (): string => {
    try {
        let key = localStorage.getItem(STORAGE_KEY);
        if (!key) {
            key = crypto.randomUUID();
            localStorage.setItem(STORAGE_KEY, key);
        }
        return key;
    } catch {
        return 'anon';
    }
};

const LAST_NAME_KEY = 'tank:lastName';

/** Remembered leaderboard name, so the submit form can prefill it. */
export const getLastName = (): string => {
    try {
        return localStorage.getItem(LAST_NAME_KEY) ?? '';
    } catch {
        return '';
    }
};

export const setLastName = (name: string): void => {
    try {
        localStorage.setItem(LAST_NAME_KEY, name);
    } catch {
        // ignore
    }
};
