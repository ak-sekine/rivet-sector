import { frameSeconds, movementDirection, movePlayer, moveWithCollision, type Controls, type PlayerState } from './movement';
export const DODGE_DISTANCE = 2.5, DODGE_SECONDS = .20, DODGE_COOLDOWN = .70, DODGE_INPUT_THRESHOLD = .2;
export function dodgeDirection(x: number, forward: number, yaw: number) {
  if (Math.hypot(x, forward) < DODGE_INPUT_THRESHOLD) return movementDirection(0, -1, yaw);
  const angle = Math.round(Math.atan2(x, forward) / (Math.PI / 4)) * Math.PI / 4;
  return movementDirection(Math.sin(angle), Math.cos(angle), yaw);
}
/** Flat stage is grounded. Interruptions cancel the step and pause its remaining cooldown. */
export function createDodge() {
  let remaining = 0, cooldown = 0, held = false, direction = { x: 0, z: 0 };
  return {
    get active() { return remaining > 0; },
    get cooldown() { return cooldown; },
    get phase() { return remaining > 0 ? 'dodging' : cooldown > 0 ? 'cooldown' : 'ready'; },
    reset() { remaining = 0; held = false; },
    update(p: PlayerState, input: Controls, yaw: number, seconds: number, grounded = true) {
      const dt = frameSeconds(seconds), pressed = !!input.dodge && !held;
      held = !!input.dodge;
      // Check eligibility before advancing clocks: cooldown inputs are discarded.
      if (pressed && remaining === 0 && cooldown === 0 && grounded) {
        direction = dodgeDirection(input.x, input.forward, yaw);
        remaining = DODGE_SECONDS; cooldown = DODGE_COOLDOWN;
      }
      cooldown = Math.max(0, cooldown - dt);
      if (remaining > 0) {
        const time = Math.min(dt, remaining), speed = DODGE_DISTANCE / DODGE_SECONDS;
        const clear = moveWithCollision(p, direction.x * speed * time, direction.z * speed * time, false);
        remaining = clear ? Math.max(0, remaining - time) : 0;
        if (remaining < 1e-10) remaining = 0;
      } else movePlayer(p, input, yaw, dt);
      if (cooldown < 1e-10) cooldown = 0;
    },
  };
}
