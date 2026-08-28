import { SPRITE_SIZE } from '../engine/constants';
import { directionToRotateDegree } from '../engine/systems/movement.system';
import { getSprite } from './sprites';
import type { BulletEntity, PlayerEntity, PowerupEntity, TankEntity } from '../engine/types';

const drawSprite = (ctx: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, degrees: number): void => {
    const cx = x + SPRITE_SIZE / 2;
    const cy = y + SPRITE_SIZE / 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((degrees * Math.PI) / 180);
    ctx.drawImage(image, -SPRITE_SIZE / 2, -SPRITE_SIZE / 2, SPRITE_SIZE, SPRITE_SIZE);
    ctx.restore();
};

// No dedicated art for the powerup kinds yet — drawn procedurally (a filled
// circle + a glyph) rather than reusing an existing tile sprite, so a
// powerup can never be visually confused with what that sprite already
// means elsewhere (e.g. the star tile, which ends the level on pickup).
const POWERUP_STYLE: Record<PowerupEntity['kind'], { color: string; glyph: string }> = {
    invincibility: { color: '#ffd700', glyph: '★' },
    freeze: { color: '#66e0ff', glyph: '❄' },
};

const drawPowerup = (ctx: CanvasRenderingContext2D, powerup: PowerupEntity): void => {
    const { color, glyph } = POWERUP_STYLE[powerup.kind];
    const cx = powerup.position[0] + SPRITE_SIZE / 2;
    const cy = powerup.position[1] + SPRITE_SIZE / 2;
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy, SPRITE_SIZE / 2 - 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.font = `${SPRITE_SIZE - 6}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(glyph, cx, cy + 1);
    ctx.restore();
};

/** A gold ring behind a player tank while `invincible` — the only visual cue
 * that a touched enemy tank will die instead of the player. */
const drawInvincibilityRing = (ctx: CanvasRenderingContext2D, player: PlayerEntity): void => {
    const cx = player.position[0] + SPRITE_SIZE / 2;
    const cy = player.position[1] + SPRITE_SIZE / 2;
    ctx.save();
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, SPRITE_SIZE / 2 + 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
};

// Player 2 has no separate tank sprite yet — outline its cell in green so the
// two co-op tanks are tellable apart at a glance (composite-safe, unlike a
// source-atop tint which would bleed onto everything else on the layer).
const drawPlayerTwoMarker = (ctx: CanvasRenderingContext2D, player: PlayerEntity): void => {
    ctx.save();
    ctx.strokeStyle = '#3ad13a';
    ctx.lineWidth = 2;
    ctx.strokeRect(player.position[0] + 1, player.position[1] + 1, SPRITE_SIZE - 2, SPRITE_SIZE - 2);
    ctx.restore();
};

export interface EntityLayerState {
    tanks: TankEntity[];
    bullets: BulletEntity[];
    powerups: PowerupEntity[];
    players: PlayerEntity[];
}

/** Draws the dynamic entity layer. Call every RAF frame (unlike drawMap) —
 * cheap since there are only ever a few dozen entities at most. */
export const drawEntities = (
    ctx: CanvasRenderingContext2D,
    state: EntityLayerState,
    mapWidth: number,
    mapHeight: number,
): void => {
    ctx.clearRect(0, 0, mapWidth, mapHeight);

    for (const powerup of state.powerups) {
        drawPowerup(ctx, powerup);
    }

    const tankImage = getSprite('enemyTank');
    if (tankImage) {
        for (const tank of state.tanks) {
            drawSprite(ctx, tankImage, tank.position[0], tank.position[1], directionToRotateDegree(tank.direction));
        }
    }

    const bulletImage = getSprite('bullet');
    if (bulletImage) {
        for (const bullet of state.bullets) {
            drawSprite(ctx, bulletImage, bullet.position[0], bullet.position[1], directionToRotateDegree(bullet.direction));
        }
    }

    const playerImage = getSprite('playerTank');
    for (const player of state.players) {
        if (player.hidden) continue;
        if (player.invincible) drawInvincibilityRing(ctx, player);
        if (playerImage) {
            drawSprite(ctx, playerImage, player.position[0], player.position[1], directionToRotateDegree(player.direction));
        }
        if (player.id === 1) drawPlayerTwoMarker(ctx, player);
    }
};
