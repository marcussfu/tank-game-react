import { describe, expect, it } from 'vitest';
import { checkBulletAtSpawn, createBullet, tickBullet } from './bullets.system';
import type { BulletEntity, PlayerEntity, TankEntity, TileGrid } from '../types';

const openTiles: TileGrid = Array.from({ length: 24 }, () => Array(40).fill(0));

const hiddenPlayer: PlayerEntity = {
    position: [0, 0],
    direction: '',
    hidden: true,
    inputDirection: '',
    moveTickAccumulator: 0,
    invincible: false,
};

const makeBullet = (overrides: Partial<BulletEntity> = {}): BulletEntity => ({
    keyIndex: 'b1',
    position: [100, 100],
    direction: 'SOUTH',
    isPlayerBullet: true,
    ...overrides,
});

describe('createBullet', () => {
    it('assigns a unique keyIndex per bullet', () => {
        const a = createBullet({ position: [0, 0], direction: 'NORTH', isPlayerBullet: true });
        const b = createBullet({ position: [0, 0], direction: 'NORTH', isPlayerBullet: true });
        expect(a.keyIndex).not.toBe(b.keyIndex);
    });
});

describe('tickBullet', () => {
    it('expires when the next cell is out of bounds', () => {
        const bullet = makeBullet({ position: [0, 0], direction: 'NORTH' });
        expect(tickBullet(bullet, openTiles, [], hiddenPlayer)).toEqual({ kind: 'expired' });
    });

    it('advances one cell over passable terrain', () => {
        const bullet = makeBullet({ position: [100, 100], direction: 'SOUTH' });
        expect(tickBullet(bullet, openTiles, [], hiddenPlayer)).toEqual({
            kind: 'advance',
            position: [100, 120],
        });
    });

    it('expires with no special effect on a plain impassable tile (rock)', () => {
        const tiles = openTiles.map(row => row.slice());
        tiles[6][5] = 6; // rock directly south of (100,100)
        const bullet = makeBullet({ position: [100, 100], direction: 'SOUTH' });
        expect(tickBullet(bullet, tiles, [], hiddenPlayer)).toEqual({ kind: 'expired' });
    });

    it('reports hitWall on a wall tile', () => {
        const tiles = openTiles.map(row => row.slice());
        tiles[6][5] = 5;
        const bullet = makeBullet({ position: [100, 100], direction: 'SOUTH' });
        expect(tickBullet(bullet, tiles, [], hiddenPlayer)).toEqual({ kind: 'hitWall', position: [100, 120] });
    });

    it('reports hitTreasure on the treasure tile', () => {
        const tiles = openTiles.map(row => row.slice());
        tiles[6][5] = 12;
        const bullet = makeBullet({ position: [100, 100], direction: 'SOUTH' });
        expect(tickBullet(bullet, tiles, [], hiddenPlayer)).toEqual({ kind: 'hitTreasure', position: [100, 120] });
    });

    it('reports hitEagle on any of the four eagle sub-tiles', () => {
        const tiles = openTiles.map(row => row.slice());
        tiles[6][5] = 10.4;
        const bullet = makeBullet({ position: [100, 100], direction: 'SOUTH' });
        expect(tickBullet(bullet, tiles, [], hiddenPlayer)).toEqual({ kind: 'hitEagle', position: [100, 120] });
    });

    it('reports hitTank when a player bullet reaches a tank cell, regardless of terrain', () => {
        const tanks: TankEntity[] = [
            { keyIndex: 42, position: [100, 120], direction: 'NORTH', fireTick: 0, moveTickAccumulator: 0 },
        ];
        const bullet = makeBullet({ position: [100, 100], direction: 'SOUTH', isPlayerBullet: true });
        expect(tickBullet(bullet, openTiles, tanks, hiddenPlayer)).toEqual({
            kind: 'hitTank',
            position: [100, 120],
            tankKeyIndex: 42,
        });
    });

    it('does not check tanks for an enemy bullet', () => {
        const tanks: TankEntity[] = [
            { keyIndex: 42, position: [100, 120], direction: 'NORTH', fireTick: 0, moveTickAccumulator: 0 },
        ];
        const bullet = makeBullet({ position: [100, 100], direction: 'SOUTH', isPlayerBullet: false });
        expect(tickBullet(bullet, openTiles, tanks, hiddenPlayer)).toEqual({
            kind: 'advance',
            position: [100, 120],
        });
    });

    it('reports hitPlayer when an enemy bullet reaches the visible player cell', () => {
        const player: PlayerEntity = { ...hiddenPlayer, position: [100, 120], hidden: false };
        const bullet = makeBullet({ position: [100, 100], direction: 'SOUTH', isPlayerBullet: false });
        expect(tickBullet(bullet, openTiles, [], player)).toEqual({ kind: 'hitPlayer', position: [100, 120] });
    });

    it('ignores the player cell while the player is hidden', () => {
        const player: PlayerEntity = { ...hiddenPlayer, position: [100, 120], hidden: true };
        const bullet = makeBullet({ position: [100, 100], direction: 'SOUTH', isPlayerBullet: false });
        expect(tickBullet(bullet, openTiles, [], player)).toEqual({ kind: 'advance', position: [100, 120] });
    });

    it('does not check the player for a player bullet', () => {
        const player: PlayerEntity = { ...hiddenPlayer, position: [100, 120], hidden: false };
        const bullet = makeBullet({ position: [100, 100], direction: 'SOUTH', isPlayerBullet: true });
        expect(tickBullet(bullet, openTiles, [], player)).toEqual({ kind: 'advance', position: [100, 120] });
    });
});

describe('checkBulletAtSpawn', () => {
    // Regression coverage: a bullet spawns one cell ahead of its shooter, so
    // firing at point-blank range into a wall spawns the bullet embedded in
    // that wall's cell. `tickBullet` alone only ever classifies the cell a
    // bullet is about to move INTO, never the one it started on — so without
    // this spawn-time check, such a bullet silently phases through the wall
    // on its first tick instead of destroying it (and if something sits one
    // cell further — the eagle, in one real map layout — the bullet reaches
    // it as if the wall in front of it had never existed).
    it('classifies the bullet\'s own spawn cell, not one cell further', () => {
        const tiles = openTiles.map(row => row.slice());
        tiles[5][5] = 5; // wall the bullet spawns directly inside
        const bullet = makeBullet({ position: [100, 100], direction: 'SOUTH' });
        expect(checkBulletAtSpawn(bullet, tiles, [], hiddenPlayer)).toEqual({
            kind: 'hitWall',
            position: [100, 100],
        });
    });

    it('reports hitTank for a bullet spawned directly on a tank', () => {
        const tanks: TankEntity[] = [
            { keyIndex: 1, position: [100, 100], direction: 'NORTH', fireTick: 0, moveTickAccumulator: 0 },
        ];
        const bullet = makeBullet({ position: [100, 100], direction: 'SOUTH', isPlayerBullet: true });
        expect(checkBulletAtSpawn(bullet, openTiles, tanks, hiddenPlayer)).toEqual({
            kind: 'hitTank',
            position: [100, 100],
            tankKeyIndex: 1,
        });
    });

    it('reports advance (no-op) for a bullet spawned over open ground', () => {
        const bullet = makeBullet({ position: [100, 100], direction: 'SOUTH' });
        expect(checkBulletAtSpawn(bullet, openTiles, [], hiddenPlayer)).toEqual({
            kind: 'advance',
            position: [100, 100],
        });
    });
});
