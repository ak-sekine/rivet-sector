import { canStand } from './collision';
export const PLAYER_SPEED = 6, TURN_SPEED = 12, MAX_FRAME_SECONDS = .05;
export interface PlayerState { x: number; z: number; yaw: number }
/** lookX/lookY are angular deltas in radians, converted once by the input layer. */
export interface Controls { x: number; forward: number; lookX: number; lookY: number }
export const frameSeconds = (s: number) => Number.isFinite(s) ? Math.max(0, Math.min(MAX_FRAME_SECONDS, s)) : 0;
export function movementDirection(x: number, forward: number, yaw: number, result = { x: 0, z: 0 }) {
  const scale = 1 / Math.max(1, Math.hypot(x, forward));
  result.x = (x * Math.cos(yaw) + forward * Math.sin(yaw)) * scale;
  result.z = (forward * Math.cos(yaw) - x * Math.sin(yaw)) * scale;
  return result;
}
const direction = { x: 0, z: 0 };
export function movePlayer(p: PlayerState, input: Controls, yaw: number, seconds: number): void {
  const dt = frameSeconds(seconds), d = movementDirection(input.x, input.forward, yaw, direction);
  const dx = d.x * PLAYER_SPEED * dt, dz = d.z * PLAYER_SPEED * dt;
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / .04));
  for (let i = 0; i < steps; i++) {
    if (canStand(p.x + dx / steps, p.z)) p.x += dx / steps;
    if (canStand(p.x, p.z + dz / steps)) p.z += dz / steps;
  }
  if (Math.hypot(dx, dz) > 0) {
    const target = Math.atan2(d.x, d.z);
    p.yaw += Math.atan2(Math.sin(target - p.yaw), Math.cos(target - p.yaw)) * (1 - Math.exp(-TURN_SPEED * dt));
  }
}
