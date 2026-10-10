import { afterEach, describe, expect, it, vi } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { createInput } from '../src/input';
import { createTpsCamera } from '../src/rendering/camera';
import { CAMERA, MOUSE_SENSITIVITY, TOUCH_SENSITIVITY } from '../src/game/view';

function setup() {
  const windowTarget = new EventTarget();
  const documentTarget = Object.assign(new EventTarget(), {
    pointerLockElement: null as EventTarget | null,
    documentElement: { dataset: {} },
    exitPointerLock() { this.pointerLockElement = null; },
  });
  vi.stubGlobal('window', windowTarget); vi.stubGlobal('document', documentTarget);
  const element = () => Object.assign(new EventTarget(), {
    style: { setProperty: vi.fn() }, setPointerCapture: vi.fn(),
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 }),
  });
  const canvas = element(), stick = element();
  const input = createInput(canvas as unknown as HTMLCanvasElement, stick as unknown as HTMLElement);
  const send = (target: EventTarget, type: string, fields: object) =>
    target.dispatchEvent(Object.assign(new Event(type), { pointerType: 'mouse', pointerId: 1, button: 0, clientX: 0, clientY: 0, ...fields }));
  return { canvas, stick, input, send, documentTarget, windowTarget };
}
afterEach(() => vi.unstubAllGlobals());
describe('input sensitivity and camera angle contract', () => {
  it.each([['mouse', .004], ['touch', .010]])('converts %s drag pixels once and clamps camera pitch', (pointerType, sensitivity) => {
    expect(MOUSE_SENSITIVITY).toBe(.004); expect(TOUCH_SENSITIVITY).toBe(.010);
    const { canvas, input, send } = setup();
    const engine = new NullEngine(), scene = new Scene(engine);
    try {
      send(canvas, 'pointerdown', { pointerType });
      send(canvas, 'pointermove', { pointerType, clientX: 100, clientY: 20 });
      const state = input.read();
      expect(state.lookX).toBeCloseTo(100 * sensitivity);
      expect(state.lookY).toBeCloseTo(20 * sensitivity);
      const camera = createTpsCamera(scene);
      camera.look(state.lookX, state.lookY); camera.update({ x: 0, z: 0, yaw: 0 }, 0);
      expect(camera.yaw).toBeCloseTo(100 * sensitivity);
      expect(camera.camera.position.y).toBeCloseTo(CAMERA.height + Math.sin(.25 + 20 * sensitivity) * CAMERA.distance);
      camera.look(0, 100);
      for (let i = 0; i < 120; i++) camera.update({ x: 0, z: 0, yaw: 0 }, 1 / 60);
      expect(camera.camera.position.y).toBeCloseTo(CAMERA.height + Math.sin(CAMERA.maxPitch) * CAMERA.distance);
      camera.look(0, -200);
      for (let i = 0; i < 120; i++) camera.update({ x: 0, z: 0, yaw: 0 }, 1 / 60);
      expect(camera.camera.position.y).toBeCloseTo(CAMERA.height + Math.sin(CAMERA.minPitch) * CAMERA.distance);
      input.consumeLook(); expect(input.read().lookX).toBe(0);
    } finally { input.dispose(); scene.dispose(); engine.dispose(); }
  });
  it('uses relative mouse pixels under Pointer Lock and releases on Escape', () => {
    const { canvas, input, send, documentTarget, windowTarget } = setup();
    documentTarget.pointerLockElement = canvas;
    send(canvas, 'pointermove', { movementX: 100, movementY: -20, clientX: 999 });
    expect(input.read().lookX).toBeCloseTo(.4); expect(input.read().lookY).toBeCloseTo(-.08);
    send(windowTarget, 'keydown', { code: 'Escape' });
    expect(documentTarget.pointerLockElement).toBeNull(); expect(input.read().lookX).toBe(0);
    input.dispose();
  });
  it('keeps the two touch pointers independent and releases both', () => {
    const { canvas, stick, input, send } = setup();
    send(stick, 'pointerdown', { pointerType: 'touch', pointerId: 1, clientX: 50, clientY: 15 });
    send(canvas, 'pointerdown', { pointerType: 'touch', pointerId: 2 });
    send(canvas, 'pointermove', { pointerType: 'touch', pointerId: 2, clientX: 100 });
    expect(input.read()).toMatchObject({ forward: 1, x: 0, lookX: 1 });
    send(canvas, 'pointerup', { pointerId: 2 }); input.consumeLook();
    expect(input.read().forward).toBe(1);
    send(stick, 'pointercancel', { pointerId: 1 });
    expect(input.read()).toMatchObject({ forward: 0, lookX: 0 }); input.dispose();
  });
});
