import { SPRITE_SIZE } from '../engine/constants';
import { directionToRotateDegree } from '../engine/systems/movement.system';
import { getSprite } from './sprites';
import type { BulletEntity, PlayerEntity, TankEntity } from '../engine/types';

const drawSprite = (ctx: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, degrees: number): void => {
    const cx = x + SPRITE_SIZE / 2;
    const cy = y + SPRITE_SIZE / 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((degrees * Math.PI) / 180);
    ctx.drawImage(image, -SPRITE_SIZE / 2, -SPRITE_SIZE / 2, SPRITE_SIZE, SPRITE_SIZE);
    ctx.restore();
};

export interface EntityLayerState {
    tanks: TankEntity[];
    bullets: BulletEntity[];
    player: PlayerEntity;
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

    if (!state.player.hidden) {
        const playerImage = getSprite('playerTank');
        if (playerImage) {
            drawSprite(ctx, playerImage, state.player.position[0], state.player.position[1], directionToRotateDegree(state.player.direction));
        }
    }
};
