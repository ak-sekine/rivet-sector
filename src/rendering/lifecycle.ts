import type { Engine } from '@babylonjs/core/Engines/engine';
import type { Scene } from '@babylonjs/core/scene';
import { hardwareScalingLevel } from './settings';

export function startRendering(engine: Engine, scene: Scene, canvas: HTMLCanvasElement, update?: (seconds: number) => void): () => void {
  const resize = () => {
    engine.setHardwareScalingLevel(hardwareScalingLevel(window.devicePixelRatio));
    engine.resize();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  window.addEventListener('resize', resize);
  resize();
  let previous = performance.now();
  let focused = true;
  const resetTime = () => { previous = performance.now(); };
  const blur = () => { focused = false; resetTime(); };
  const focus = () => { focused = true; resetTime(); };
  window.addEventListener('blur', blur);
  window.addEventListener('focus', focus);
  document.addEventListener('visibilitychange', resetTime);
  engine.runRenderLoop(() => {
    const now = performance.now();
    if (!document.hidden) { if (focused) update?.((now - previous) / 1000); scene.render(); }
    previous = now;
  });
  return () => {
    observer.disconnect();
    window.removeEventListener('blur', blur); window.removeEventListener('focus', focus);
    document.removeEventListener('visibilitychange', resetTime);
    window.removeEventListener('resize', resize);
    engine.stopRenderLoop();
    scene.dispose();
    engine.dispose();
  };
}
