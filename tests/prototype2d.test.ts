import { describe, expect, it } from 'vitest';
import { createGame, eightWay, idleInput, PLAYER_RADIUS, segmentRect, SPEED, STEP_DISTANCE, type Input } from '../src/prototype2d/logic';
import { createControls } from '../src/prototype2d/input';
import { obstacles, solids, SPAWN, TARGET, walls } from '../src/prototype2d/stage';

const farTarget = { x: 5000, y: 5000, radius: 13 };
const emptyGame = () => createGame([], farTarget);
const input = (x = 0, y = 0): Input => ({ ...idleInput(), move: { x, y } });
describe('2D training simulation', () => {
  it.each([[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]])('moves direction (%i, %i) at the same speed', (x, y) => {
    const g = emptyGame(); g.step(input(x, y), 1);
    expect(Math.hypot(g.state.player.x - SPAWN.x, g.state.player.y - SPAWN.y)).toBeCloseTo(SPEED, 6);
    expect(Math.sign(g.state.player.x - SPAWN.x)).toBe(Math.sign(x));
    expect(Math.sign(g.state.player.y - SPAWN.y)).toBe(Math.sign(y));
  });
  it('stops on release and agrees at 30, 60 and 144 fps', () => {
    const positions = [30, 60, 144].map(fps => {
      const g = emptyGame(); for (let i = 0; i < fps; i++) g.step(input(1, 1), 1 / fps);
      const position = { ...g.state.player }; g.step(idleInput(), 1); expect(g.state.player).toEqual(position); return position;
    });
    for (const p of positions) { expect(p.x).toBeCloseTo(positions[0].x, 6); expect(p.y).toBeCloseTo(positions[0].y, 6); }
  });
  it.each([...walls, ...obstacles])('blocks geometry at $x,$y', rect => {
    const g = createGame([rect], farTarget); Object.assign(g.state.player, { x: rect.x - PLAYER_RADIUS - 12, y: rect.y + rect.height / 2 });
    g.step(input(1, 0), .5); expect(g.state.player.x).toBeLessThanOrEqual(rect.x - PLAYER_RADIUS + 1e-6);
  });
  it('slides along a wall without penetrating', () => {
    const g = createGame([{ x: 700, y: 0, width: 32, height: 1000 }], farTarget);
    Object.assign(g.state.player, { x: 690, y: 350 }); g.step(input(1, 1), .4);
    expect(g.state.player.x).toBe(690); expect(g.state.player.y).toBeGreaterThan(380);
  });
  it('holds fire at .25s intervals, stops on release, and expires projectiles', () => {
    const g = emptyGame(), i = { ...idleInput(), aim: { x: 1, y: 0 }, fire: true };
    g.step(i, 1 / 120); expect(g.state.shots).toBe(1);
    g.step(i, 29 / 120); expect(g.state.shots).toBe(1);
    g.step(i, 1 / 120); expect(g.state.shots).toBe(2);
    g.step(i, 89 / 120); expect(g.state.shots).toBe(4);
    const b = g.state.bullets[0], x = b.x; g.step(idleInput(), .1);
    expect(b.x - x).toBeCloseTo(48, 5); expect(g.state.shots).toBe(4);
    g.step(idleInput(), 2); expect(g.state.bullets).toHaveLength(0);
  });
  it('collides with the target and flashes without HP or destruction', () => {
    const g = createGame([], { x: 720, y: SPAWN.y, radius: 13 });
    const events = g.step({ ...idleInput(), aim: { x: 1, y: 0 }, fire: true }, .15);
    expect(events).toContain('hit'); expect(events).toContain('explosion'); expect(g.state.hits).toBe(1);
    expect(g.state.targetFlash).toBeGreaterThan(0); expect(g.state.effects.some(e => e.kind === 'hit')).toBe(true);
    g.step(idleInput(), .3); expect(g.state.targetFlash).toBe(0); expect(g.state.effects).toHaveLength(0);
  });
  it('wall or obstacle blocks the nearest contact before the enemy, including muzzle clipping', () => {
    for (const x of [SPAWN.x + 1, SPAWN.x + 35]) {
      const g = createGame([{ x, y: SPAWN.y - 25, width: 2, height: 50 }], { x: 720, y: SPAWN.y, radius: 13 });
      g.step({ ...idleInput(), aim: { x: 1, y: 0 }, fire: true }, .2);
      expect(g.state.hits).toBe(0); expect(g.state.bullets).toHaveLength(0); expect(g.state.effects.some(e => e.kind === 'wall')).toBe(true);
    }
    expect(segmentRect({ x: 0, y: 0 }, { x: 1000, y: 0 }, { x: 55, y: -1, width: 1, height: 2 })).toBeCloseTo(.055);
  });
  it('steps 80px in .2s with normalized diagonals and TPS stamina constants', () => {
    const g = emptyGame(); g.step({ ...input(1, 1), dodge: true }, .2);
    expect(Math.hypot(g.state.player.x - SPAWN.x, g.state.player.y - SPAWN.y)).toBeCloseTo(STEP_DISTANCE, 6);
    expect(g.state.dodgeRemaining).toBe(0); expect(g.state.stamina).toBe(75); expect(g.state.recoveryDelay).toBeCloseTo(.3);
    g.step(idleInput(), .4); expect(g.state.stamina).toBeCloseTo(79, 6);
    g.step(idleInput(), 2); expect(g.state.stamina).toBe(100);
  });
  it('uses the reverse of the last facing with no movement, then ends safely at a wall', () => {
    const g = emptyGame(); g.step(input(1, 0), .01); const start = { ...g.state.player };
    g.step({ ...idleInput(), dodge: true }, .2); expect(g.state.player.x).toBeCloseTo(start.x - 80);
    const blocked = createGame([{ x: 670, y: 350, width: 32, height: 100 }], farTarget);
    blocked.step({ ...input(1, 0), dodge: true }, .2);
    expect(blocked.state.player.x).toBeLessThanOrEqual(660); expect(blocked.state.dodgeRemaining).toBe(0); expect(blocked.state.stamina).toBe(75);
  });
  it('allows four fresh steps then rejects insufficient stamina without buffering', () => {
    const g = emptyGame();
    for (const x of [1, -1, 1, -1]) g.step({ ...input(x, 0), dodge: true }, .2);
    expect(g.state.stamina).toBe(0); expect(g.state.dodges).toBe(4);
    g.step({ ...input(1, 0), dodge: true }, .1); expect(g.state.dodges).toBe(4);
    g.step(idleInput(), 2); expect(g.state.dodges).toBe(4); expect(g.state.stamina).toBeGreaterThan(25);
  });
  it('processes movement, fire and dodge together and retains timers on suspension', () => {
    const g = emptyGame();
    const events = g.step({ ...input(1, 0), aim: { x: 0, y: -1 }, fire: true, dodge: true }, .05);
    expect(events).toContain('shot'); expect(events).toContain('dodge'); expect(g.state.player.x).toBeGreaterThan(SPAWN.x);
    expect(g.state.bullets[0].direction).toEqual({ x: 0, y: -1 }); expect(g.state.stamina).toBe(75);
    const delay = g.state.recoveryDelay, cooldown = g.state.cooldown; g.suspend();
    expect(g.state.dodgeRemaining).toBe(0); expect(g.state.recoveryDelay).toBe(delay); expect(g.state.cooldown).toBe(cooldown);
    expect(g.step(idleInput(), NaN)).toEqual([]);
  });
  it('has a clear spawn, visible stationary target, and stable 8-way quantization', () => {
    expect(solids.some(r => SPAWN.x >= r.x && SPAWN.x <= r.x + r.width && SPAWN.y >= r.y && SPAWN.y <= r.y + r.height)).toBe(false);
    expect(TARGET.radius).toBe(13); expect(eightWay({ x: .8, y: .02 }).x).toBeCloseTo(1);
    expect(eightWay({ x: .1, y: .1 })).toEqual({ x: 0, y: 0 });
  });
});
describe('independent PC / touch control state', () => {
  it('owns three pointers, preserves remaining fingers, and emits one dodge per press', () => {
    const c = createControls(); expect(c.begin('move', 1)).toBe(true); c.drag('move', 1, { x: 1, y: 1 });
    expect(c.begin('move', 99)).toBe(false); c.drag('move', 99, { x: -1, y: 0 });
    c.begin('aim', 2); c.drag('aim', 2, { x: .3, y: -.8 }); c.begin('dodge', 3);
    const i = c.read(); expect(Math.hypot(i.move.x, i.move.y)).toBeCloseTo(1); expect(i.fire).toBe(true); expect(i.dodge).toBe(true);
    expect(i.aim.x).toBeCloseTo(.3 / Math.hypot(.3, .8)); expect(c.read().dodge).toBe(false);
    c.end('dodge', 3); expect(c.read().fire).toBe(true); c.end('move', 99); expect(c.read().move.x).toBeGreaterThan(0);
    c.end('move', 1); expect(c.read().move).toEqual({ x: 0, y: 0 }); expect(c.read().fire).toBe(true);
    c.end('aim', 2); expect(c.read().fire).toBe(false);
  });
  it('captures short taps, discards cancelled taps, clears blur state and keyboard repeat', () => {
    const c = createControls(); c.begin('dodge', 1); c.end('dodge', 1); expect(c.read().dodge).toBe(true);
    c.begin('dodge', 2); c.end('dodge', 2, true); expect(c.read().dodge).toBe(false);
    c.key('Space', true); expect(c.read().dodge).toBe(true); c.key('Space', true); expect(c.read().dodge).toBe(false);
    c.key('Space', false); c.key('Space', true); expect(c.read().dodge).toBe(true);
    c.key('KeyW', true); c.mouse({ x: 1, y: 0 }, true); expect(c.read().fire).toBe(true);
    c.reset(); expect(c.read()).toEqual(idleInput());
  });
});
