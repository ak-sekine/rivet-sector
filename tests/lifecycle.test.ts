import { afterEach, expect, it, vi } from 'vitest';
import type { Engine } from '@babylonjs/core/Engines/engine';
import type { Scene } from '@babylonjs/core/scene';
import { startRendering } from '../src/rendering/lifecycle';
import { createDodge } from '../src/game/dodge';

afterEach(() => vi.unstubAllGlobals());
it('freezes recovery when hidden or blurred and resumes without background time or queued motion', () => {
  const w = Object.assign(new EventTarget(), { devicePixelRatio: 1 });
  const doc = Object.assign(new EventTarget(), { hidden: false });
  vi.stubGlobal('window', w); vi.stubGlobal('document', doc);
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  let now = 0, frame = () => {};
  vi.stubGlobal('performance', { now: () => now });
  const engine = { setHardwareScalingLevel() {}, resize() {}, runRenderLoop(callback: () => void) { frame = callback; }, stopRenderLoop() {}, dispose() {} };
  const scene = { render() {}, dispose() {} };
  const d = createDodge(), p = { x: 0, z: -5, yaw: 0 };
  const input = { x: 0, forward: 0, lookX: 0, lookY: 0 };
  const reset = () => d.reset();
  w.addEventListener('blur', reset); doc.addEventListener('visibilitychange', reset);
  const dispose = startRendering(engine as unknown as Engine, scene as unknown as Scene, {} as HTMLCanvasElement, dt => d.update(p, input, 0, dt));
  try {
    d.update(p, { ...input, dodge: true }, 0, .05);
    doc.hidden = true; doc.dispatchEvent(new Event('visibilitychange'));
    expect(d.active).toBe(false);
    const paused = { stamina: d.stamina, delay: d.recoveryDelay, z: p.z };
    now = 10000; frame();
    expect({ stamina: d.stamina, delay: d.recoveryDelay, z: p.z }).toEqual(paused);
    doc.hidden = false; doc.dispatchEvent(new Event('visibilitychange')); frame();
    expect(d.recoveryDelay).toBeCloseTo(paused.delay);
    w.dispatchEvent(new Event('blur')); now += 10000; frame();
    expect(d.stamina).toBe(paused.stamina); expect(d.recoveryDelay).toBeCloseTo(paused.delay);
    w.dispatchEvent(new Event('focus')); frame();
    for (let i = 0; i < 13; i++) { now += 50; frame(); }
    expect(d.stamina).toBeCloseTo(83); expect(d.active).toBe(false); expect(p.z).toBe(paused.z);
  } finally { dispose(); }
});
