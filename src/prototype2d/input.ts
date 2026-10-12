import { eightWay, idleInput, unit, type Input, type Vector } from './logic';

/** Each touch owns one control until release. Cancellation only clears its owner. */
export function createControls() {
  const keys = new Set<string>(), pointers = new Map<'move' | 'aim' | 'dodge', number>();
  let movement = { x: 0, y: 0 }, aim = { x: 0, y: 0 }, mouseAim = { x: 0, y: 0 };
  let mouseFire = false, dodge = false;
  return {
    begin(control: 'move' | 'aim' | 'dodge', id: number) {
      if (pointers.has(control)) return false;
      pointers.set(control, id); if (control === 'dodge') dodge = true; return true;
    },
    drag(control: 'move' | 'aim', id: number, value: Vector) {
      if (pointers.get(control) !== id) return;
      const v = Math.hypot(value.x, value.y) < .2 ? { x: 0, y: 0 } : control === 'move' ? eightWay(value) : unit(value);
      if (control === 'move') movement = v; else aim = v;
    },
    end(control: 'move' | 'aim' | 'dodge', id: number, cancelled = false) {
      if (pointers.get(control) !== id) return false;
      pointers.delete(control);
      if (control === 'move') movement = { x: 0, y: 0 };
      if (control === 'aim') aim = { x: 0, y: 0 };
      if (control === 'dodge' && cancelled) dodge = false;
      return true;
    },
    key(code: string, down: boolean) {
      if (down) { if (code === 'Space' && !keys.has(code)) dodge = true; keys.add(code); }
      else keys.delete(code);
    },
    mouse(direction: Vector, fire?: boolean) { mouseAim = unit(direction); if (fire !== undefined) mouseFire = fire; },
    read(): Input {
      const keyboard = { x: Number(keys.has('KeyD')) - Number(keys.has('KeyA')), y: Number(keys.has('KeyS')) - Number(keys.has('KeyW')) };
      const touchFire = pointers.has('aim') && Math.hypot(aim.x, aim.y) > 0;
      const value = { move: pointers.has('move') ? movement : unit(keyboard), aim: touchFire ? aim : mouseAim, fire: touchFire || mouseFire, dodge };
      dodge = false; return value;
    },
    reset() { keys.clear(); pointers.clear(); movement = { x: 0, y: 0 }; aim = { x: 0, y: 0 }; mouseAim = { x: 0, y: 0 }; mouseFire = false; dodge = false; },
  };
}
export function bindInput(canvas: HTMLCanvasElement, screenAim: (x: number, y: number) => Vector, unlock: () => void, toggleMute: () => void, suspend: () => void) {
  const controls = createControls(), cleanup: (() => void)[] = [];
  let focused = true, pendingDodge = false;
  let mousePosition: { x: number; y: number } | undefined;
  const listen = (target: EventTarget, type: string, handler: (event: Event) => void, options?: AddEventListenerOptions) => {
    target.addEventListener(type, handler, options); cleanup.push(() => target.removeEventListener(type, handler, options));
  };
  const releaseUi = () => {
    for (const id of ['move-stick', 'aim-stick', 'dodge2d']) {
      const el = document.getElementById(id)!; el.classList.remove('active', 'pressed'); el.style.removeProperty('--x'); el.style.removeProperty('--y');
    }
  };
  const reset = () => { controls.reset(); pendingDodge = false; mousePosition = undefined; releaseUi(); suspend(); };
  const updateSize = () => {
    const region = document.getElementById('lab')!;
    const touch = matchMedia('(any-pointer: coarse)').matches;
    document.getElementById('size-hint')!.hidden = !(touch && (region.clientWidth < 280 || region.clientHeight < 440));
  };
  updateSize();
  const active = () => focused && !document.hidden && document.getElementById('size-hint')!.hidden;
  for (const [id, kind] of [['move-stick', 'move'], ['aim-stick', 'aim']] as const) {
    const element = document.getElementById(id)!;
    const drag = (e: PointerEvent) => {
      const rect = element.getBoundingClientRect(), radius = rect.width / 2;
      const dx = e.clientX - rect.x - radius, dy = e.clientY - rect.y - radius;
      const length = Math.hypot(dx, dy), max = radius - 22, scale = length > max ? max / length : 1;
      controls.drag(kind, e.pointerId, { x: dx / max, y: dy / max });
      if (element.hasPointerCapture(e.pointerId)) { element.style.setProperty('--x', `${dx * scale}px`); element.style.setProperty('--y', `${dy * scale}px`); }
    };
    listen(element, 'pointerdown', event => {
      const e = event as PointerEvent; e.preventDefault();
      if (!active() || !controls.begin(kind, e.pointerId)) return;
      element.setPointerCapture(e.pointerId); element.classList.add('active'); drag(e); unlock();
    });
    listen(element, 'pointermove', event => { const e = event as PointerEvent; if (element.hasPointerCapture(e.pointerId)) { e.preventDefault(); drag(e); } });
    const end = (event: Event) => {
      const e = event as PointerEvent;
      if (!element.hasPointerCapture(e.pointerId) && event.type !== 'lostpointercapture') return;
      if (!controls.end(kind, e.pointerId)) return;
      element.classList.remove('active'); element.style.removeProperty('--x'); element.style.removeProperty('--y');
      if (element.hasPointerCapture(e.pointerId)) element.releasePointerCapture(e.pointerId);
    };
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) listen(element, type, end);
  }
  const button = document.getElementById('dodge2d')!;
  listen(button, 'pointerdown', event => {
    const e = event as PointerEvent; e.preventDefault();
    if (!active() || !controls.begin('dodge', e.pointerId)) return;
    button.setPointerCapture(e.pointerId); button.classList.add('pressed'); unlock();
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) listen(button, type, event => {
    const e = event as PointerEvent; if (!controls.end('dodge', e.pointerId, type !== 'pointerup')) return;
    button.classList.remove('pressed');
    if (button.hasPointerCapture(e.pointerId)) button.releasePointerCapture(e.pointerId);
  });
  const mouse = (event: Event, fire?: boolean) => {
    const e = event as PointerEvent;
    if (e.pointerType !== 'mouse' || !active()) return;
    mousePosition = { x: e.clientX, y: e.clientY };
    controls.mouse(screenAim(e.clientX, e.clientY), fire);
  };
  listen(canvas, 'pointermove', e => mouse(e));
  listen(canvas, 'pointerdown', event => {
    const e = event as PointerEvent;
    if (e.pointerType !== 'mouse' || e.button !== 0 || !active()) return;
    e.preventDefault(); canvas.setPointerCapture(e.pointerId); mouse(e, true); unlock();
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) listen(canvas, type, e => mouse(e, false));
  listen(window, 'keydown', event => {
    const e = event as KeyboardEvent;
    if (['Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(e.code)) e.preventDefault();
    if (!active()) return;
    controls.key(e.code, true); unlock(); if (e.code === 'KeyM' && !e.repeat) toggleMute();
  });
  listen(window, 'keyup', e => controls.key((e as KeyboardEvent).code, false));
  listen(window, 'blur', () => { focused = false; reset(); });
  listen(window, 'focus', () => { focused = true; });
  listen(window, 'pagehide', reset);
  listen(document, 'visibilitychange', reset);
  listen(window, 'resize', () => { updateSize(); reset(); });
  listen(document, 'contextmenu', e => e.preventDefault());
  listen(document, 'touchmove', e => e.preventDefault(), { passive: false });
  const mute = document.getElementById('mute')!;
  listen(mute, 'click', () => { unlock(); toggleMute(); });
  return {
    active,
    // Preserve a press edge when a drawing frame has no fixed simulation step.
    read(step: boolean): Input {
      if (mousePosition && active()) controls.mouse(screenAim(mousePosition.x, mousePosition.y));
      const input = controls.read(); pendingDodge ||= input.dodge;
      if (!active()) return idleInput();
      input.dodge = pendingDodge; if (step) pendingDodge = false; return input;
    },
    dispose() { reset(); cleanup.forEach(fn => fn()); },
  };
}
