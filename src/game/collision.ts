import { stage } from '../stage';
export const PLAYER_RADIUS = .48;
/** Horizontal circle against shared static boxes and floor perimeter. */
export function canStand(x: number, z: number): boolean {
  const r = PLAYER_RADIUS;
  if (Math.abs(x) > stage.width / 2 - r || Math.abs(z) > stage.depth / 2 - r) return false;
  return stage.boxes.every(b => {
    const dx = x - Math.max(b.x - b.width / 2, Math.min(x, b.x + b.width / 2));
    const dz = z - Math.max(b.z - b.depth / 2, Math.min(z, b.z + b.depth / 2));
    return dx * dx + dz * dz >= r * r - 1e-10;
  });
}
