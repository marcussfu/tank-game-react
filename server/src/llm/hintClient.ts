import Anthropic from '@anthropic-ai/sdk';

/** The one method the /hint route needs — narrow enough that tests can inject
 * a fake instead of calling the real API. */
export interface HintClient {
    generate(prompt: string): Promise<string>;
}

const SYSTEM = [
    'You are a battle-hardened tank commander giving one piece of tactical',
    'advice to a paused player of a retro NES tank game (Battle City clone).',
    'STYLE: ALL-CAPS, English, ONE sentence, 20 words max, direct and urgent.',
    'Base it on the concrete situation described — never generic filler.',
    'Output ONLY the sentence.',
].join(' ');

const FALLBACK_HINT = 'HOLD YOUR GROUND AND WATCH THE OPEN LANES.';

/** Calls Claude Sonnet. Kept low-effort — this is a quick tactical one-liner,
 * not a task worth spending extra latency/tokens on. */
export class AnthropicHintClient implements HintClient {
    private readonly client: Anthropic;

    constructor() {
        this.client = new Anthropic();
    }

    async generate(prompt: string): Promise<string> {
        const res = await this.client.messages.create({
            model: 'claude-sonnet-5',
            max_tokens: 200,
            output_config: { effort: 'low' },
            system: SYSTEM,
            messages: [{ role: 'user', content: prompt }],
        });
        const text = res.content
            .filter((b) => b.type === 'text')
            .map((b) => b.text)
            .join('')
            .trim();
        return text || FALLBACK_HINT;
    }
}

/** For local manual testing without an API key: `LLM_FAKE=1 npm run
 * server:start`. Unit tests inject their own `HintClient` instead — this
 * flag is for the running server, not for tests. */
export class FakeHintClient implements HintClient {
    async generate(): Promise<string> {
        return 'FAKE HINT: THE WEST FLANK IS OPEN — MOVE UP.';
    }
}

export const makeHintClient = (): HintClient =>
    process.env.LLM_FAKE === '1' ? new FakeHintClient() : new AnthropicHintClient();
