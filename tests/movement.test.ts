import { describe, expect, it } from 'vitest';
import { frameSeconds, movePlayer, movementDirection, PLAYER_SPEED } from '../src/game/movement';
import { canStand } from '../src/game/collision';
import { CAMERA, clampPitch } from '../src/game/view';
const input = { x: 0, forward: 1, lookX: 0, lookY: 0 };
describe('movement and collision', () => {
  it('calculates camera-relative directions', () => {
    expect(movementDirection(0, 1, 0)).toEqual({ x: 0, z: 1 });
    expect(movementDirection(0, -1, 0).z).toBe(-1);
    expect(movementDirection(1, 0, 0).x).toBe(1);
    expect(movementDirection(-1, 0, 0).x).toBe(-1);
    expect(movementDirection(0, 1, Math.PI / 2).x).toBeCloseTo(1);
    expect(movementDirection(1, 0, Math.PI / 2).z).toBeCloseTo(-1);
  });
  it('normalizes diagonals and preserves analog magnitude', () => {
    const d = movementDirection(1, 1, 0);
    expect(Math.hypot(d.x, d.z)).toBeCloseTo(1);
    expect(movementDirection(0, .5, 0).z).toBe(.5);
  });
  it('moves equally at 30 and 60 FPS', () => {
    expect(PLAYER_SPEED).toBe(6);
    for (const fps of [30, 60]) {
      const p = { x: 0, z: -5, yaw: 0 };
      for (let i = 0; i < fps; i++) movePlayer(p, input, 0, 1 / fps);
      expect(p.z).toBeCloseTo(1);
    }
  });
  it('caps frame time and stops with released input', () => {
    expect(frameSeconds(10)).toBe(.05); expect(frameSeconds(NaN)).toBe(0);
    const p = { x: 0, z: -5, yaw: 0 };
    movePlayer(p, { ...input, forward: 0 }, 0, 1); expect(p.z).toBe(-5);
    movePlayer(p, input, 0, 10); expect(p.z).toBeCloseTo(-4.7);
  });
  it('moves diagonally at six units per second', () => {
    const p = { x: 0, z: -8, yaw: 0 };
    for (let i = 0; i < 60; i++) movePlayer(p, { ...input, x: -1 }, 0, 1 / 60);
    expect(Math.hypot(p.x, p.z + 8)).toBeCloseTo(6);
  });
  it('rejects interiors, radius overlaps and boundaries', () => {
    expect(canStand(-4, 2)).toBe(false); expect(canStand(-2.2, 2)).toBe(false);
    expect(canStand(11, 0)).toBe(false); expect(canStand(0, -5)).toBe(true);
  });
  it('slides along walls and stops without jitter', () => {
    const p = { x: 0, z: 7.7, yaw: 0 };
    for (let i = 0; i < 60; i++) movePlayer(p, { ...input, x: 1 }, 0, 1 / 60);
    expect(p.x).toBeGreaterThan(2); expect(p.z).toBeLessThanOrEqual(7.72);
    expect(canStand(p.x, p.z)).toBe(true);
    const z = p.z;
    for (let i = 0; i < 60; i++) movePlayer(p, input, 0, 1 / 60);
    expect(p.z).toBe(z);
  });
  it('cannot cross obstacles', () => {
    const p = { x: -4, z: -3, yaw: 0 };
    for (let i = 0; i < 200; i++) movePlayer(p, input, 0, .05);
    expect(p.z).toBeLessThan(.03); expect(canStand(p.x, p.z)).toBe(true);
  });
});
describe('camera angles', () => {
  it('clamps vertical rotation without inversion', () => {
    expect(clampPitch(-100)).toBe(CAMERA.minPitch);
    expect(clampPitch(100)).toBe(CAMERA.maxPitch);
    expect(clampPitch(.2)).toBe(.2);
  });
});
