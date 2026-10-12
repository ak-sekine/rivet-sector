import { afterEach, expect, it, vi } from 'vitest';
import { bindInput } from '../src/prototype2d/input';

class Element extends EventTarget {
  hidden = true;
  clientWidth = 320;
  clientHeight = 568;
  captured = new Set<number>();
  classList = { add() {}, remove() {} };
  style = { setProperty() {}, removeProperty() {} };
  getBoundingClientRect() { return { x: 0, y: 0, width: 98 }; }
  hasPointerCapture(id: number) { return this.captured.has(id); }
  setPointerCapture(id: number) { this.captured.add(id); }
  releasePointerCapture(id: number) { this.captured.delete(id); send(this, 'lostpointercapture', { pointerId: id }); }
}
const send = (target: EventTarget, type: string, data: object = {}) => target.dispatchEvent(Object.assign(new Event(type, { cancelable: true }), data));
function setup() {
  const w = new EventTarget(), doc = new EventTarget(), canvas = new Element();
  const elements = Object.fromEntries(['lab','game','move-stick','aim-stick','dodge2d','mute','size-hint'].map(id => [id,new Element()]));
  vi.stubGlobal('window', w); vi.stubGlobal('document', Object.assign(doc, { hidden: false, getElementById: (id: string) => elements[id] }));
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  const suspend = vi.fn();
  const input = bindInput(canvas as unknown as HTMLCanvasElement, (x,y) => ({x,y}), () => {}, () => {}, suspend);
  const pointer = (id: string, type: string, n: number, x=49, y=49) => send(elements[id],type,{pointerId:n,clientX:x,clientY:y,pointerType:'touch'});
  return { w, doc, canvas, elements, input, pointer, suspend };
}
afterEach(() => vi.unstubAllGlobals());
it('enables portrait, captures outside sticks, and releases each owner independently', () => {
  const {input,pointer}=setup(); expect(input.active()).toBe(true);
  pointer('move-stick','pointerdown',1); pointer('aim-stick','pointerdown',2);
  pointer('move-stick','pointermove',1,49,500); pointer('aim-stick','pointermove',2,200,49);
  const value = input.read(true); expect(value.move.x).toBeCloseTo(0); expect(value.move.y).toBe(1); expect(value.fire).toBe(true);
  pointer('move-stick','pointerup',1); expect(input.read(true)).toMatchObject({move:{x:0,y:0},fire:true});
  pointer('aim-stick','lostpointercapture',2); expect(input.read(true).fire).toBe(false); input.dispose();
});
it('retains a short dodge press after normal capture loss and ignores another pointer', () => {
  const {input,pointer}=setup(); pointer('dodge2d','pointerdown',3);
  pointer('dodge2d','pointerup',99); pointer('dodge2d','pointerup',3);
  expect(input.read(false).dodge).toBe(true); expect(input.read(true).dodge).toBe(true);
  expect(input.read(true).dodge).toBe(false);
  pointer('dodge2d','pointerdown',4); pointer('dodge2d','pointercancel',4);
  expect(input.read(true).dodge).toBe(false); input.dispose();
});
it.each(['blur','pagehide','resize'])('clears all three fingers on %s', event => {
  const {input,pointer,w}=setup(); pointer('move-stick','pointerdown',1,100); pointer('aim-stick','pointerdown',2,100); pointer('dodge2d','pointerdown',3);
  send(w,event); if(event==='blur') send(w,'focus');
  expect(input.read(true)).toEqual({move:{x:0,y:0},aim:{x:0,y:0},fire:false,dodge:false}); input.dispose();
});
it('allows mouse and keyboard on a touch capable PC, then clears hidden input', () => {
  const {input,w,doc,canvas}=setup(); send(w,'keydown',{code:'KeyW'});
  send(canvas,'pointerdown',{pointerId:5,pointerType:'mouse',button:0,clientX:4,clientY:3});
  expect(input.read(true)).toMatchObject({move:{x:0,y:-1},fire:true,aim:{x:.8,y:.6}});
  send(doc,'visibilitychange'); expect(input.read(true).fire).toBe(false); input.dispose();
});
