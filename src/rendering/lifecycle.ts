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
  const resetTime = () => { previous = performance.now(); };
  document.addEventListener('visibilitychange', resetTime);
  engine.runRenderLoop(() => {
    const now = performance.now();
    if (!document.hidden) { update?.((now - previous) / 1000); scene.render(); }
    previous = now;
  });
  return () => {
    observer.disconnect();
    document.removeEventListener('visibilitychange', resetTime);
    window.removeEventListener('resize', resize);
    engine.stopRenderLoop();
    scene.dispose();
    engine.dispose();
  };
}
