import { readFileSync } from 'node:fs';
import { mkdir, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { MemoryDb } from './memory';
import type { DbData } from './memory';

const WRITE_DEBOUNCE_MS = 50;

/**
 * File-backed `Db`: reads the JSON store once on construction, keeps the
 * working set in memory (all `MemoryDb` logic), and writes the whole file back
 * atomically (`.tmp` → `rename`) a short debounce after any mutation. Fine for
 * the local, single-process, hobby-volume use this milestone targets; an X6
 * `D1Db` replaces it for a real deploy.
 */
export class JsonDb extends MemoryDb {
    private flushTimer: ReturnType<typeof setTimeout> | null = null;
    private readonly file: string;

    constructor(file: string) {
        super();
        this.file = file;
        this.load();
    }

    private load(): void {
        try {
            const parsed = JSON.parse(readFileSync(this.file, 'utf8')) as Partial<DbData>;
            this.data = { scores: parsed.scores ?? [], saves: parsed.saves ?? {} };
        } catch {
            // no file yet, or unreadable → start from an empty store
        }
    }

    protected onMutate(): void {
        if (this.flushTimer) return;
        this.flushTimer = setTimeout(() => {
            this.flushTimer = null;
            void this.flush();
        }, WRITE_DEBOUNCE_MS);
    }

    private async flush(): Promise<void> {
        await mkdir(dirname(this.file), { recursive: true });
        const tmp = `${this.file}.${process.pid}.tmp`;
        await writeFile(tmp, JSON.stringify(this.data, null, 2) + '\n');
        await rename(tmp, this.file);
    }

    async close(): Promise<void> {
        if (this.flushTimer) {
            clearTimeout(this.flushTimer);
            this.flushTimer = null;
        }
        await this.flush();
    }
}
