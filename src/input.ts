import type { Controls } from './game/movement';
export function createInput(canvas: HTMLCanvasElement, stick: HTMLElement) {
  const state: Controls = { x: 0, forward: 0, lookX: 0, lookY: 0 };
  const keys = new Set<string>();
  let stickId: number | undefined, lookId: number | undefined, lastX = 0, lastY = 0;
  let sx = 0, sy = 0;
  const abort = new AbortController(), options = { signal: abort.signal };
  const reset = () => {
    keys.clear(); stickId = lookId = undefined; sx = sy = 0;
    Object.assign(state, { x: 0, forward: 0, lookX: 0, lookY: 0 });
    stick.style.setProperty('--stick-x', '0px'); stick.style.setProperty('--stick-y', '0px');
  };
  window.addEventListener('keydown', e => {
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(e.code)) { keys.add(e.code); e.preventDefault(); }
    if (e.code === 'Escape') { document.exitPointerLock?.(); reset(); }
  }, options);
  window.addEventListener('keyup', e => keys.delete(e.code), options);
  window.addEventListener('blur', reset, options);
  document.addEventListener('visibilitychange', reset, options);
  document.addEventListener('pointerlockchange', reset, options);
  const updateStick = (e: PointerEvent) => {
    const b = stick.getBoundingClientRect(), radius = b.width * .35;
    let x = (e.clientX - b.left - b.width / 2) / radius, y = (e.clientY - b.top - b.height / 2) / radius;
    const length = Math.max(1, Math.hypot(x, y)); x /= length; y /= length;
    sx = x; sy = -y;
    stick.style.setProperty('--stick-x', `${x * radius}px`); stick.style.setProperty('--stick-y', `${y * radius}px`);
  };
  stick.addEventListener('pointerdown', e => {
    if (stickId !== undefined) return;
    e.preventDefault(); stickId = e.pointerId; stick.setPointerCapture(e.pointerId); updateStick(e);
  }, options);
  stick.addEventListener('pointermove', e => { if (e.pointerId === stickId) updateStick(e); }, options);
  const stopStick = (e: PointerEvent) => {
    if (e.pointerId !== stickId) return;
    stickId = undefined; sx = sy = 0;
    stick.style.setProperty('--stick-x', '0px'); stick.style.setProperty('--stick-y', '0px');
  };
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) stick.addEventListener(name, stopStick, options);
  canvas.addEventListener('pointerdown', e => {
    if (e.pointerType === 'touch') document.documentElement.dataset.input = 'touch';
    else document.documentElement.dataset.input = 'mouse';
    if (lookId !== undefined || (e.pointerType === 'mouse' && e.button !== 0)) return;
    e.preventDefault(); lookId = e.pointerId; lastX = e.clientX; lastY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
    if (e.pointerType === 'mouse' && canvas.requestPointerLock) {
      try { const result = canvas.requestPointerLock(); (result as unknown as Promise<void>)?.catch?.(() => {}); } catch { /* Drag remains available. */ }
    }
  }, options);
  canvas.addEventListener('pointermove', e => {
    if (document.pointerLockElement === canvas) { state.lookX += e.movementX; state.lookY += e.movementY; }
    else if (e.pointerId === lookId) {
      state.lookX += e.clientX - lastX; state.lookY += e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY;
    }
  }, options);
  const stopLook = (e: PointerEvent) => { if (e.pointerId === lookId) lookId = undefined; };
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) canvas.addEventListener(name, stopLook, options);
  return { read() {
    state.x = Number(keys.has('KeyD')) - Number(keys.has('KeyA')) + sx;
    state.forward = Number(keys.has('KeyW')) - Number(keys.has('KeyS')) + sy;
    return state;
  }, consumeLook() { state.lookX = state.lookY = 0; }, reset,
  dispose() { reset(); abort.abort(); if (document.pointerLockElement === canvas) document.exitPointerLock(); } };
}
