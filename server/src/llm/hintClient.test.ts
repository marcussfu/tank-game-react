import { afterEach, describe, expect, it, vi } from 'vitest';
import { FakeHintClient, makeHintClient, AnthropicHintClient } from './hintClient';

describe('FakeHintClient', () => {
    it('returns a canned hint without calling any API', async () => {
        const hint = await new FakeHintClient().generate();
        expect(hint.length).toBeGreaterThan(0);
    });
});

describe('makeHintClient', () => {
    afterEach(() => vi.unstubAllEnvs());

    it('returns a FakeHintClient when LLM_FAKE=1', () => {
        vi.stubEnv('LLM_FAKE', '1');
        expect(makeHintClient()).toBeInstanceOf(FakeHintClient);
    });

    it('returns an AnthropicHintClient otherwise', () => {
        vi.stubEnv('LLM_FAKE', '');
        expect(makeHintClient()).toBeInstanceOf(AnthropicHintClient);
    });
});
