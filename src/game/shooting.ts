export const SHOT_INTERVAL = .25, SHOT_RANGE = 60, HIT_FLASH_SECONDS = .15, SHOT_EFFECT_SECONDS = .06;
/** Game time only. Rejected press edges are discarded, never buffered. */
export function createShooting() {
  let remaining = 0;
  return {
    get remaining() { return remaining; },
    update(request: boolean, seconds: number) {
      remaining = Math.max(0, remaining - (Number.isFinite(seconds) ? Math.max(0, seconds) : 0));
      if (!request || remaining > 1e-10) return false;
      remaining = SHOT_INTERVAL;
      return true;
    },
  };
}
