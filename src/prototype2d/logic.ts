export const STAMINA_MAX = 100, DODGE_STAMINA_COST = 25;
export const STAMINA_RECOVERY_RATE = 40, STAMINA_RECOVERY_DELAY = .5;
import { solids, SPAWN, TARGET, type Rect } from './stage';

export const SPEED = 144, PLAYER_RADIUS = 10;
export const SHOT_INTERVAL = .25, BULLET_SPEED = 480, BULLET_LIFETIME = 1.8, BULLET_RADIUS = 2;
export const STEP_DISTANCE = 80, STEP_SECONDS = .2, FIXED_SECONDS = 1 / 120;
export interface Vector { x: number; y: number }
export interface Input { move: Vector; aim: Vector; fire: boolean; dodge: boolean }
export interface Bullet extends Vector { id: number; direction: Vector; life: number }
export interface Effect extends Vector { id: number; kind: 'hit' | 'wall' | 'trail'; life: number; direction: Vector }
export type GameEvent = 'shot' | 'hit' | 'explosion' | 'dodge';
export const idleInput = (): Input => ({ move: { x: 0, y: 0 }, aim: { x: 0, y: 0 }, fire: false, dodge: false });
export function unit(v: Vector): Vector {
  const length = Math.hypot(v.x, v.y);
  return length > 1e-8 ? { x: v.x / length, y: v.y / length } : { x: 0, y: 0 };
}
export function eightWay(v: Vector): Vector {
  if (Math.hypot(v.x, v.y) < .2) return { x: 0, y: 0 };
  const angle = Math.round(Math.atan2(v.y, v.x) / (Math.PI / 4)) * Math.PI / 4;
  return { x: Math.cos(angle), y: Math.sin(angle) };
}
export function facingRow(v: Vector): number {
  return Math.abs(v.x) > Math.abs(v.y) ? (v.x < 0 ? 2 : 3) : (v.y < 0 ? 1 : 0);
}
export function circleBlocked(p: Vector, radius: number, geometry = solids): boolean {
  return geometry.some(r => {
    const x = Math.max(r.x, Math.min(p.x, r.x + r.width));
    const y = Math.max(r.y, Math.min(p.y, r.y + r.height));
    return (p.x - x) ** 2 + (p.y - y) ** 2 < radius ** 2 - 1e-8;
  });
}
/** Segment versus expanded rectangle. Returns earliest contact, including start-inside. */
export function segmentRect(from: Vector, to: Vector, r: Rect, radius = 0): number | undefined {
  let near = 0, far = 1;
  for (const axis of ['x', 'y'] as const) {
    const d = to[axis] - from[axis], min = r[axis] - radius;
    const max = r[axis] + (axis === 'x' ? r.width : r.height) + radius;
    if (Math.abs(d) < 1e-10) { if (from[axis] < min || from[axis] > max) return; }
    else {
      const a = (min - from[axis]) / d, b = (max - from[axis]) / d;
      near = Math.max(near, Math.min(a, b)); far = Math.min(far, Math.max(a, b));
      if (near > far) return;
    }
  }
  return near;
}
function segmentCircle(from: Vector, to: Vector, center: Vector, radius: number): number | undefined {
  const dx = to.x - from.x, dy = to.y - from.y, ox = from.x - center.x, oy = from.y - center.y;
  const c = ox * ox + oy * oy - radius * radius;
  if (c <= 0) return 0;
  const a = dx * dx + dy * dy, b = 2 * (ox * dx + oy * dy), discriminant = b * b - 4 * a * c;
  if (!a || discriminant < 0) return;
  const t = (-b - Math.sqrt(discriminant)) / (2 * a);
  if (t >= 0 && t <= 1) return t;
}
export function createGame(geometry = solids, target = TARGET) {
  const state = {
    player: { ...SPAWN }, facing: { x: 0, y: -1 }, moving: false, time: 0,
    stamina: STAMINA_MAX, recoveryDelay: 0, dodgeRemaining: 0, dodgeDirection: { x: 0, y: 0 },
    cooldown: 0, targetFlash: 0, shots: 0, hits: 0, dodges: 0,
    bullets: [] as Bullet[], effects: [] as Effect[],
  };
  let id = 0, trailWait = 0;
  const effect = (kind: Effect['kind'], p: Vector, life: number) => {
    state.effects.push({ ...p, id: ++id, kind, life, direction: { ...state.facing } });
  };
  const move = (dx: number, dy: number, slide: boolean): boolean => {
    const count = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 2));
    for (let i = 0; i < count; i++) {
      const next = { x: state.player.x + dx / count, y: state.player.y + dy / count };
      if (!slide) {
        if (circleBlocked(next, PLAYER_RADIUS, geometry)) return false;
        Object.assign(state.player, next);
      } else {
        if (!circleBlocked({ x: next.x, y: state.player.y }, PLAYER_RADIUS, geometry)) state.player.x = next.x;
        if (!circleBlocked({ x: state.player.x, y: next.y }, PLAYER_RADIUS, geometry)) state.player.y = next.y;
      }
    }
    return true;
  };
  return {
    state,
    suspend() { state.dodgeRemaining = 0; state.moving = false; state.effects = []; },
    step(input: Input, seconds: number): GameEvent[] {
      if (!Number.isFinite(seconds) || seconds <= 0) return [];
      const events: GameEvent[] = [];
      let dodgeRequest = input.dodge;
      // Logic is independent of drawing rate; substeps also keep player collisions bounded.
      for (let left = seconds; left > 1e-10;) {
        const dt = Math.min(left, FIXED_SECONDS); left -= dt; state.time += dt;
        state.effects = state.effects.filter(e => (e.life -= dt) > 0);
        state.targetFlash = Math.max(0, state.targetFlash - dt);
        const movement = unit(input.move), aim = unit(input.aim);
        if (state.dodgeRemaining === 0) {
          if (Math.hypot(aim.x, aim.y) > 0) state.facing = aim;
          else if (Math.hypot(movement.x, movement.y) > 0) state.facing = movement;
        }
        if (dodgeRequest && state.dodgeRemaining === 0 && state.stamina >= DODGE_STAMINA_COST) {
          state.dodgeDirection = Math.hypot(movement.x, movement.y) > .2 ? eightWay(movement) : { x: -state.facing.x, y: -state.facing.y };
          state.dodgeRemaining = STEP_SECONDS; state.stamina -= DODGE_STAMINA_COST;
          state.recoveryDelay = STAMINA_RECOVERY_DELAY; state.dodges++; trailWait = 0; events.push('dodge');
        }
        dodgeRequest = false; // Rejected requests are not buffered.
        const wait = state.recoveryDelay;
        state.recoveryDelay = Math.max(0, wait - dt);
        const dodgeTime = Math.min(state.dodgeRemaining, dt);
        state.moving = Math.hypot(movement.x, movement.y) > 0;
        if (dodgeTime > 0) {
          trailWait -= dt;
          if (trailWait <= 0) { effect('trail', state.player, .18); trailWait = .035; }
          const clear = move(state.dodgeDirection.x * STEP_DISTANCE / STEP_SECONDS * dodgeTime, state.dodgeDirection.y * STEP_DISTANCE / STEP_SECONDS * dodgeTime, false);
          state.dodgeRemaining = clear ? Math.max(0, state.dodgeRemaining - dodgeTime) : 0;
          if (state.dodgeRemaining < 1e-10) state.dodgeRemaining = 0;
          const normalTime = dt - dodgeTime;
          if (normalTime > 1e-10) move(movement.x * SPEED * normalTime, movement.y * SPEED * normalTime, true);
        } else move(movement.x * SPEED * dt, movement.y * SPEED * dt, true);
        state.stamina = Math.min(STAMINA_MAX, state.stamina + STAMINA_RECOVERY_RATE * Math.max(0, dt - Math.max(wait, dodgeTime)));
        state.cooldown = Math.max(0, state.cooldown - dt);
        if (input.fire && Math.hypot(aim.x, aim.y) > 0 && state.cooldown < 1e-10) {
          // Spawn at center so a muzzle protruding into a wall cannot shoot through it.
          state.bullets.push({ ...state.player, id: ++id, direction: aim, life: BULLET_LIFETIME });
          state.cooldown += SHOT_INTERVAL; state.shots++; events.push('shot');
        }
        state.bullets = state.bullets.filter(bullet => {
          const travel = Math.min(dt, bullet.life);
          const next = { x: bullet.x + bullet.direction.x * BULLET_SPEED * travel, y: bullet.y + bullet.direction.y * BULLET_SPEED * travel };
          let contact = Infinity, kind: 'wall' | 'hit' = 'wall';
          for (const rect of geometry) {
            const t = segmentRect(bullet, next, rect, BULLET_RADIUS);
            if (t !== undefined && t < contact) contact = t;
          }
          const enemy = segmentCircle(bullet, next, target, target.radius + BULLET_RADIUS);
          if (enemy !== undefined && enemy < contact) { contact = enemy; kind = 'hit'; }
          if (contact <= 1) {
            effect(kind, { x: bullet.x + (next.x - bullet.x) * contact, y: bullet.y + (next.y - bullet.y) * contact }, .24);
            if (kind === 'hit') { state.hits++; state.targetFlash = .15; events.push('hit'); }
            events.push('explosion'); return false;
          }
          Object.assign(bullet, next); bullet.life -= dt; return bullet.life > 1e-10;
        });
      }
      return events;
    },
  };
}
