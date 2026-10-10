import { Engine } from '@babylonjs/core/Engines/engine';
import { hardwareScalingLevel } from './settings';

export function createEngine(canvas: HTMLCanvasElement): Engine {
  if (!Engine.IsSupported) throw new Error('このブラウザではWebGLを利用できません。');
  const engine = new Engine(canvas, true, { stencil: true }, false);
  engine.setHardwareScalingLevel(hardwareScalingLevel(window.devicePixelRatio));
  return engine;
}
