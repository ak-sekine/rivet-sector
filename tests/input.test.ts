import { afterEach, describe, expect, it, vi } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { createInput } from '../src/input';
import { createTpsCamera } from '../src/rendering/camera';
import { CAMERA, MOUSE_SENSITIVITY, TOUCH_SENSITIVITY } from '../src/game/view';
import { createDodge } from '../src/game/dodge';

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
  const button = Object.assign(element(), { classList: { add: vi.fn(), remove: vi.fn() } });
  const reset = vi.fn();
  const shoot = Object.assign(element(), { classList: { add: vi.fn(), remove: vi.fn() } });
  const input = createInput(canvas as unknown as HTMLCanvasElement, stick as unknown as HTMLElement, button as unknown as HTMLElement, reset, shoot as unknown as HTMLElement);
  const send = (target: EventTarget, type: string, fields: object) =>
    target.dispatchEvent(Object.assign(new Event(type), { pointerType: 'mouse', pointerId: 1, button: 0, clientX: 0, clientY: 0, ...fields }));
  return { canvas, stick, button, shoot, reset, input, send, documentTarget, windowTarget };
}
afterEach(() => vi.unstubAllGlobals());
describe('input sensitivity and camera angle contract', () => {
  it('shoots once with locked left mouse or F, never on lock acquisition or drag', () => {
    const {canvas,input,send,documentTarget,windowTarget}=setup();
    send(canvas,'pointerdown',{}); expect(input.read().shoot).toBe(false);
    send(canvas,'pointerup',{}); documentTarget.pointerLockElement=canvas;
    send(canvas,'pointerdown',{}); expect(input.read().shoot).toBe(true);
    send(canvas,'pointerdown',{}); expect(input.read().shoot).toBe(false);
    send(canvas,'pointerup',{}); send(canvas,'pointerdown',{}); expect(input.read().shoot).toBe(true);
    send(windowTarget,'keydown',{code:'Escape'}); expect(input.read().shoot).toBe(false);
    send(windowTarget,'keydown',{code:'KeyF'}); expect(input.read().shoot).toBe(true);
    send(windowTarget,'keydown',{code:'KeyF',repeat:true}); expect(input.read().shoot).toBe(false);
    send(windowTarget,'keyup',{code:'KeyF'}); send(windowTarget,'keydown',{code:'KeyF'});
    send(windowTarget,'blur',{}); expect(input.read().shoot).toBe(false); input.dispose();
  });
  it('does not accept shooting while suspended or fire on focus resumption', () => {
    const {input,send,windowTarget}=setup();
    send(windowTarget,'blur',{}); send(windowTarget,'keydown',{code:'KeyF'});
    send(windowTarget,'focus',{}); expect(input.read().shoot).toBe(false);
    send(windowTarget,'keydown',{code:'KeyF',repeat:true}); expect(input.read().shoot).toBe(false);
    send(windowTarget,'keyup',{code:'KeyF'}); send(windowTarget,'keydown',{code:'KeyF'});
    expect(input.read().shoot).toBe(true); input.dispose();
  });
  it('keeps four pointers independent, ignores holds, and clears cancellation and lifecycle requests', () => {
    const {canvas,stick,button,shoot,input,send,windowTarget,documentTarget}=setup();
    send(stick,'pointerdown',{pointerType:'touch',pointerId:1,clientX:50,clientY:15});
    send(canvas,'pointerdown',{pointerType:'touch',pointerId:2});
    send(button,'pointerdown',{pointerType:'touch',pointerId:3});
    send(shoot,'pointerdown',{pointerType:'touch',pointerId:4});
    send(canvas,'pointermove',{pointerType:'touch',pointerId:2,clientX:20});
    expect(input.read()).toMatchObject({forward:1,lookX:.2,dodge:true,shoot:true});
    send(shoot,'pointerdown',{pointerId:4}); expect(input.read().shoot).toBe(false);
    send(shoot,'pointerup',{pointerId:4}); send(shoot,'pointerdown',{pointerId:5});
    send(shoot,'pointercancel',{pointerId:5}); expect(input.read().shoot).toBe(false);
    expect(input.read().forward).toBe(1);
    for(const [target,event] of [[shoot,'lostpointercapture'],[windowTarget,'pagehide'],[documentTarget,'visibilitychange'],[documentTarget,'pointerlockchange']] as const) {
      send(shoot,'pointerdown',{pointerId:6}); send(target,event,{pointerId:6}); expect(input.read().shoot).toBe(false);
    }
    input.dispose();
  });
  it('Shift and touch holds produce only one step, including repeated events', () => {
    const { input, send, windowTarget, button } = setup();
    const d = createDodge(), p = { x: 0, z: -5, yaw: 0 };
    send(windowTarget, 'keydown', { code: 'ShiftLeft' });
    for (let i = 0; i < 20; i++) {
      if (i > 0) send(windowTarget, 'keydown', { code: 'ShiftLeft', repeat: true });
      d.update(p, input.read(), 0, .05);
    }
    expect(p.z).toBeCloseTo(-7.5);
    send(windowTarget, 'keyup', { code: 'ShiftLeft' });
    send(button, 'pointerdown', { pointerId: 3 });
    d.update(p, { ...input.read(), forward: 1 }, 0, .05);
    for (let i = 0; i < 20; i++) {
      send(button, 'pointerdown', { pointerId: 3 }); d.update(p, input.read(), 0, .05);
    }
    expect(p.z).toBeCloseTo(-5); input.dispose();
  });
  it('does not queue insufficient Shift or touch input and accepts a fresh press after recovery', () => {
    const { input, send, windowTarget, button } = setup();
    const dodge = createDodge(), p = { x: 0, z: -5, yaw: 0 };
    // Cancel each step to isolate input/consumption from collisions and clock progress.
    for (let i = 0; i < 4; i++) {
      send(windowTarget, 'keydown', { code: 'ShiftLeft' }); dodge.update(p, input.read(), 0, 0);
      send(windowTarget, 'keyup', { code: 'ShiftLeft' }); dodge.reset(); dodge.update(p, input.read(), 0, 0);
    }
    expect(dodge.stamina).toBe(0);
    send(windowTarget, 'keydown', { code: 'ShiftLeft' }); dodge.update(p, input.read(), 0, 0);
    send(button, 'pointerdown', { pointerId: 3, pointerType: 'touch' }); dodge.update(p, input.read(), 0, 0);
    for (let i = 0; i < 25; i++) dodge.update(p, input.read(), 0, .05);
    expect(dodge.stamina).toBeCloseTo(30); expect(dodge.active).toBe(false);
    send(button, 'pointerup', { pointerId: 3 });
    send(button, 'pointerdown', { pointerId: 4, pointerType: 'touch' }); dodge.update(p, input.read(), 0, 0);
    expect(dodge.active).toBe(true); expect(dodge.stamina).toBeCloseTo(5);
    input.dispose();
  });
  it('ignores Shift repeat, requires release and clears interruption requests', () => {
    const { input, send, windowTarget, reset } = setup();
    send(windowTarget,'keydown',{ code:'ShiftLeft' }); expect(input.read().dodge).toBe(true);
    send(windowTarget,'keydown',{ code:'ShiftLeft', repeat:true }); expect(input.read().dodge).toBe(false);
    send(windowTarget,'keyup',{ code:'ShiftLeft' }); send(windowTarget,'keydown',{ code:'ShiftLeft' });
    send(windowTarget,'blur',{}); expect(input.read().dodge).toBe(false); expect(reset).toHaveBeenCalled(); input.dispose();
  });
  it('keeps three pointers independent and clears canceled dodge', () => {
    const { input, send, stick, canvas, button } = setup();
    send(stick,'pointerdown',{ pointerId:1, clientX:50, clientY:15 });
    send(canvas,'pointerdown',{ pointerType:'touch',pointerId:2 });
    send(button,'pointerdown',{ pointerType:'touch',pointerId:3 });
    send(canvas,'pointermove',{ pointerType:'touch',pointerId:2,clientX:20 });
    expect(input.read()).toMatchObject({ forward:1,lookX:.2,dodge:true }); expect(input.read().dodge).toBe(false);
    send(button,'pointercancel',{ pointerId:3 });
    send(button,'pointerdown',{ pointerId:4 }); send(button,'lostpointercapture',{ pointerId:4 });
    expect(input.read().dodge).toBe(false); expect(input.read().forward).toBe(1); input.dispose();
  });
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
