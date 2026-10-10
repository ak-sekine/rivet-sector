import type { Engine } from '@babylonjs/core/Engines/engine';
import type { Scene } from '@babylonjs/core/scene';
import { hardwareScalingLevel } from './settings';

export function startRendering(engine: Engine, scene: Scene, canvas: HTMLCanvasElement): () => void {
  const resize = () => {
    engine.setHardwareScalingLevel(hardwareScalingLevel(window.devicePixelRatio));
    engine.resize();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  window.addEventListener('resize', resize);
  resize();
  engine.runRenderLoop(() => scene.render());
  return () => {
    observer.disconnect();
    window.removeEventListener('resize', resize);
    engine.stopRenderLoop();
    scene.dispose();
    engine.dispose();
  };
}
