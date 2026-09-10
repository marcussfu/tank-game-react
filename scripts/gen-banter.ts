/**
 * Offline regenerator for src/assets/banter/banter.json — the pool of arcade
 * one-liners BannerFeed shows on gameplay events. NOT part of the build; run
 * by hand when you want fresh lines:
 *
 *   ANTHROPIC_API_KEY=sk-... npx tsx scripts/gen-banter.ts
 *
 * The committed JSON is hand-authored to the same spec, so a missing key never
 * blocks anyone — this just refreshes it.
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import Anthropic from '@anthropic-ai/sdk';

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'assets', 'banter', 'banter.json');

/** category -> what triggers it in the game */
const CATEGORIES: Record<string, string> = {
    kill: 'the player just destroyed one enemy tank',
    streak: 'the player destroyed 3+ enemy tanks in quick succession',
    lowTime: 'the level timer is almost out',
    eagleLost: 'the eagle base was just destroyed (the player is about to lose)',
    star: 'the player grabbed the star and cleared the stage',
    powerup: 'the player picked up a power-up (invincibility or freeze)',
    respawn: 'the player was hit and respawned with one less life',
    levelUp: 'the player advanced to the next level',
};

const LINES_PER_CATEGORY = 10;

const SYSTEM = [
    'You write single-line callouts for a retro NES tank game (Battle City clone).',
    'STYLE: terse, ALL-CAPS, English, 4 words max, arcade cabinet / drill-sergeant energy.',
    'Match the tone of "STAGE CLEAR", "GAME OVER", "YOU WIN". No emoji, no punctuation beyond ! and ?.',
    'No numbering, no quotes, one line per entry.',
].join(' ');

const client = new Anthropic();

const genCategory = async (name: string, trigger: string): Promise<string[]> => {
    const res = await client.messages.create({
        model: 'claude-haiku-4-5',
        max_tokens: 400,
        system: SYSTEM,
        messages: [{
            role: 'user',
            content: `Write ${LINES_PER_CATEGORY} distinct callouts for when: ${trigger}. Output ONLY a JSON array of strings.`,
        }],
    });
    const text = res.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
    const parsed = JSON.parse(text.slice(text.indexOf('['), text.lastIndexOf(']') + 1)) as string[];
    return parsed.map((s) => s.trim().toUpperCase()).filter(Boolean).slice(0, LINES_PER_CATEGORY);
};

const main = async () => {
    const out: Record<string, string[]> = {};
    for (const [name, trigger] of Object.entries(CATEGORIES)) {
        process.stdout.write(`  ${name}… `);
        out[name] = await genCategory(name, trigger);
        console.log(`${out[name].length} lines`);
    }
    writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
    console.log(`\nwrote ${OUT}`);
};

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
