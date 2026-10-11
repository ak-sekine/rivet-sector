import { describe, expect, it } from 'vitest';
import { createDodge, dodgeDirection, DODGE_DISTANCE } from '../src/game/dodge';
import { canStand } from '../src/game/collision';
const input = { x: 0, forward: 0, lookX: 0, lookY: 0, dodge: false };
const player = () => ({ x: 0, z: -5, yaw: .3 });
describe('eight-direction dodge', () => {
  it.each([[0,1],[1,1],[1,0],[1,-1],[0,-1],[-1,-1],[-1,0],[-1,1]])('steps in %s,%s with fixed facing', (x, forward) => {
    const p = { ...player(), z: -6 }, d = createDodge();
    for (let i = 0; i < 12; i++) d.update(p, { ...input, x, forward, dodge: i === 0 }, 0, 1/60);
    const length = Math.hypot(x, forward);
    expect(p.x).toBeCloseTo(x / length * 2.5); expect(p.z + 6).toBeCloseTo(forward / length * 2.5);
    expect(p.yaw).toBe(.3); expect(d.active).toBe(false); expect(d.stamina).toBe(75);
  });
  it('quantizes analog input and uses camera-relative backward below threshold', () => {
    expect(dodgeDirection(.25, .9, 0).x).toBeCloseTo(0);
    expect(dodgeDirection(.6, .8, 0).x).toBeCloseTo(Math.SQRT1_2);
    expect(dodgeDirection(0, 0, 0).z).toBe(-1);
    expect(dodgeDirection(.1, .1, Math.PI/2).x).toBeCloseTo(-1);
    expect(dodgeDirection(0, 1, Math.PI/2).x).toBeCloseTo(1);
    expect(dodgeDirection(.2, 0, 0).x).toBeCloseTo(1);
  });
  it.each([30,60])('travels exact distance at %s FPS and clips final time', fps => {
    const p = player(), d = createDodge();
    for (let i = 0; i < fps * .2; i++) d.update(p, { ...input, dodge: i === 0 }, 0, 1/fps);
    expect(-p.z - 5).toBeCloseTo(DODGE_DISTANCE);
    const q = player(), e = createDodge();
    for (const [i, dt] of [.05,.05,.05,.04,.05].entries()) e.update(q, { ...input, dodge: i === 0 }, 0, dt);
    expect(-q.z - 5).toBeCloseTo(2.5);
  });
  it('locks direction despite changed input and camera, then resumes movement', () => {
    const p = player(), d = createDodge();
    d.update(p, { ...input, forward: 1, dodge: true }, 0, .05);
    for (let i=0;i<3;i++) d.update(p, { ...input, x: 1 }, Math.PI/2, .05);
    expect(p.x).toBe(0); expect(p.z).toBeCloseTo(-2.5); expect(p.yaw).toBe(.3);
    d.update(p, { ...input, forward: 1 }, 0, .05); expect(p.z).toBeCloseTo(-2.2);
  });
  it('discards active one-shot requests and accepts a later fresh request', () => {
    const p = player(), d = createDodge();
    for(let i=0;i<25;i++) d.update(p, { ...input, dodge: i === 0 }, 0, .05);
    expect(p.z).toBeCloseTo(-7.5);
    d.update(p, input, 0, 0); d.update(p, { ...input, forward: 1, dodge: true }, 0, .05);
    expect(d.active).toBe(true);
    d.update(p, input, 0, .05); d.update(p, { ...input, dodge: true }, 0, .05);
    for(let i=0;i<20;i++) d.update(p, input, 0, .05);
    expect(p.z).toBeCloseTo(-5);
  });
  it.each([[0,7.6,1,1],[-4,-.1,0,1],[10.4,-5,1,0],[0,-8.4,0,-1]])('stops at collision without slide or jitter (%s,%s)', (x,z,ix,forward) => {
    const p = { x,z,yaw: 0 }, d = createDodge();
    d.update(p, { ...input, x: ix, forward, dodge: true }, 0, 10);
    expect(canStand(p.x,p.z)).toBe(true); expect(d.active).toBe(false); expect(d.stamina).toBe(75);
    const position = { ...p }; d.update(p, input, 0, .05); expect(p).toEqual(position);
    expect(Math.hypot(p.x-x,p.z-z)).toBeLessThan(.625);
    d.update(p, { ...input, dodge: true }, 0, 0); expect(d.stamina).toBe(50);
  });
  it('cancels on interruption, preserves stamina and waiting time and refuses airborne steps', () => {
    const p = player(), d = createDodge();
    d.update(p, { ...input, dodge: true }, 0, .05); d.reset();
    expect(d.active).toBe(false); expect(d.phase).toBe('ready'); expect(d.recoveryDelay).toBeCloseTo(.45); expect(d.stamina).toBe(75);
    const z=p.z; d.update(p,input,0,0); expect(p.z).toBe(z);
    expect(d.recoveryDelay).toBeCloseTo(.45); expect(d.stamina).toBe(75);
    for(let i=0;i<13;i++) d.update(p,input,0,.05);
    expect(d.stamina).toBeCloseTo(83);
    expect(d.phase).toBe('ready');
    d.update(p,{ ...input,dodge:true },0,.05,false); expect(p.z).toBe(z);
  });
});

describe('stamina', () => {
  it('accepts consecutive fresh input pulses after collision without requiring an empty frame', () => {
    const d = createDodge(), p = { x: 0, z: -8.4, yaw: 0 };
    d.update(p, { ...input, dodge: true }, 0, .05);
    expect(d.active).toBe(false); expect(d.stamina).toBe(75);
    d.update(p, { ...input, forward: 1, dodge: true }, 0, .05);
    expect(d.active).toBe(true); expect(d.stamina).toBe(50);
  });
  const tick = (d: ReturnType<typeof createDodge>, p: ReturnType<typeof player>, seconds: number, fps = 60) => {
    for (let i = 0; i < Math.round(seconds * fps); i++) d.update(p, input, 0, 1 / fps);
  };
  it('spends four steps, changes direction immediately, discards insufficient requests and resumes on fresh input', () => {
    const d = createDodge(), p = player();
    expect(d.stamina).toBe(100); expect(d.maxStamina).toBe(100);
    for (const [x, forward, expected] of [[0,-1,75],[1,0,50],[0,1,25],[-1,0,0]]) {
      d.update(p, { ...input, x, forward, dodge: true }, 0, 0);
      expect(d.stamina).toBe(expected); expect(d.active).toBe(true);
      tick(d, p, .2);
      expect(d.active).toBe(false);
    }
    expect(p.x).toBeCloseTo(0); expect(p.z).toBeCloseTo(-5);
    d.update(p, { ...input, x: 1, dodge: true }, 0, .05);
    expect(d.stamina).toBe(0); expect(d.active).toBe(false); expect(p.x).toBeCloseTo(.3);
    for (let i = 0; i < 30; i++) d.update(p, input, 0, .05);
    expect(d.active).toBe(false); expect(d.stamina).toBeGreaterThan(25);
    d.update(p, input, 0, 0); const before = d.stamina;
    d.update(p, { ...input, dodge: true }, 0, 0);
    expect(d.active).toBe(true); expect(d.stamina).toBeCloseTo(before - 25);
  });
  it('does not spend again or buffer fresh presses during a step', () => {
    const d = createDodge(), p = player();
    d.update(p, { ...input, dodge: true }, 0, .05);
    d.update(p, input, 0, .05);
    d.update(p, { ...input, dodge: true }, 0, .05);
    tick(d, p, .3);
    expect(d.stamina).toBe(75); expect(d.active).toBe(false);
  });
  it('waits from consumption, recovers only the frame remainder, caps at max and resets delay on reuse', () => {
    const d = createDodge(), p = player();
    d.update(p, { ...input, dodge: true }, 0, 0);
    tick(d, p, .45, 60); d.update(p, input, 0, .04);
    expect(d.stamina).toBe(75); expect(d.recoveryDelay).toBeCloseTo(.01);
    d.update(p, input, 0, .05); expect(d.stamina).toBeCloseTo(76.6);
    tick(d, p, .5); expect(d.stamina).toBeCloseTo(96.6);
    tick(d, p, .2); expect(d.stamina).toBe(100);
    d.update(p, { ...input, dodge: true }, 0, 0); tick(d, p, .2);
    expect(d.recoveringWait).toBe(true); expect(d.canDodge).toBe(true);
    d.update(p, { ...input, dodge: true }, 0, 0);
    expect(d.stamina).toBe(50); expect(d.recoveryDelay).toBe(.5);
  });
  it.each([30,60])('recovers at 40 per second at %s FPS', fps => {
    const d = createDodge(), p = player();
    d.update(p, { ...input, dodge: true }, 0, 0);
    tick(d, p, .2, fps); expect(d.stamina).toBe(75);
    tick(d, p, .3, fps); expect(d.stamina).toBeCloseTo(75);
    tick(d, p, .5, fps); expect(d.stamina).toBeCloseTo(95);
  });
});
