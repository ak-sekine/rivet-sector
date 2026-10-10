import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { Scene } from '@babylonjs/core/scene';

/** Temporary orbit camera for scene inspection; not the future TPS camera. */
export function createInspectionCamera(scene: Scene, canvas: HTMLCanvasElement): ArcRotateCamera {
  const camera = new ArcRotateCamera('inspection', -Math.PI / 2.6, Math.PI / 3, 23, new Vector3(0, 1, 0), scene);
  camera.lowerRadiusLimit = 6;
  camera.upperRadiusLimit = 38;
  camera.lowerBetaLimit = 0.15;
  camera.upperBetaLimit = Math.PI / 2 - 0.05;
  camera.wheelDeltaPercentage = 0.01;
  camera.pinchDeltaPercentage = 0.01;
  camera.panningSensibility = 0;
  camera.attachControl(canvas, false);
  return camera;
}
