import { frameSeconds, movementDirection, movePlayer, moveWithCollision, type Controls, type PlayerState } from './movement';
export const DODGE_DISTANCE = 2.5, DODGE_SECONDS = .20, DODGE_INPUT_THRESHOLD = .2;
export const STAMINA_MAX = 100, STAMINA_INITIAL = 100, DODGE_STAMINA_COST = 25;
export const STAMINA_RECOVERY_RATE = 40, STAMINA_RECOVERY_DELAY = .5;
export function dodgeDirection(x: number, forward: number, yaw: number) {
  if (Math.hypot(x, forward) < DODGE_INPUT_THRESHOLD) return movementDirection(0, -1, yaw);
  const angle = Math.round(Math.atan2(x, forward) / (Math.PI / 4)) * Math.PI / 4;
  return movementDirection(Math.sin(angle), Math.cos(angle), yaw);
}
/** Flat stage is grounded. Reset cancels motion while preserving stamina and recovery time. */
export function createDodge() {
  let remaining = 0, recoveryDelay = 0, stamina = Math.min(STAMINA_MAX, Math.max(0, STAMINA_INITIAL));
  let direction = { x: 0, z: 0 };
  return {
    get active() { return remaining > 0; },
    get stamina() { return stamina; },
    get maxStamina() { return STAMINA_MAX; },
    get recoveryDelay() { return recoveryDelay; },
    get recoveringWait() { return recoveryDelay > 0; },
    get canDodge() { return remaining === 0 && stamina >= DODGE_STAMINA_COST; },
    get phase() { return remaining > 0 ? 'dodging' : stamina < DODGE_STAMINA_COST ? 'exhausted' : 'ready'; },
    reset() { remaining = 0; },
    update(p: PlayerState, input: Controls, yaw: number, seconds: number, grounded = true) {
      const dt = frameSeconds(seconds);
      // Decide before advancing time: rejected inputs are never buffered.
      // Input owns the press edge; consecutive fresh requests must not be mistaken for a hold.
      if (input.dodge && remaining === 0 && stamina >= DODGE_STAMINA_COST && grounded) {
        direction = dodgeDirection(input.x, input.forward, yaw);
        remaining = DODGE_SECONDS;
        stamina = Math.max(0, stamina - DODGE_STAMINA_COST); recoveryDelay = STAMINA_RECOVERY_DELAY;
      }
      const waitTime = recoveryDelay;
      let dodgeTime = 0;
      recoveryDelay = Math.max(0, recoveryDelay - dt);
      if (remaining > 0) {
        const time = Math.min(dt, remaining), speed = DODGE_DISTANCE / DODGE_SECONDS;
        dodgeTime = time;
        const clear = moveWithCollision(p, direction.x * speed * time, direction.z * speed * time, false);
        remaining = clear ? Math.max(0, remaining - time) : 0;
        if (remaining < 1e-10) remaining = 0;
      } else movePlayer(p, input, yaw, dt);
      // Recovery can only use the frame portion after both waiting and motion end.
      stamina = Math.min(STAMINA_MAX, stamina + STAMINA_RECOVERY_RATE * Math.max(0, dt - Math.max(waitTime, dodgeTime)));
      if (recoveryDelay < 1e-10) recoveryDelay = 0;
    },
  };
}
