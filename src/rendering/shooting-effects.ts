import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import type { LinesMesh } from '@babylonjs/core/Meshes/linesMesh';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import type { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { Scene } from '@babylonjs/core/scene';
import type { ShotResult } from '../game/hitscan';
import { SHOT_EFFECT_SECONDS } from '../game/shooting';

export function createShootingEffects(scene: Scene) {
  let line: LinesMesh | undefined, remaining = 0;
  const spark = MeshBuilder.CreateSphere('shot-impact', { diameter:.09, segments:4 }, scene);
  const material = new StandardMaterial('shot-impact-material', scene);
  material.emissiveColor = new Color3(.3,1,.85); material.disableLighting = true;
  spark.material = material; spark.isPickable = false; spark.setEnabled(false);
  const reset = () => { line?.dispose(); line = undefined; spark.setEnabled(false); remaining = 0; };
  return { reset,
    show(muzzle: Vector3, result: ShotResult) {
      reset(); remaining = SHOT_EFFECT_SECONDS;
      line = MeshBuilder.CreateLines('shot-tracer', { points:[muzzle.clone(),result.point.clone()] }, scene);
      line.color = new Color3(.3,1,.85); line.isPickable = false;
      spark.position.copyFrom(result.point); spark.setEnabled(result.kind !== 'miss');
    },
    update(dt: number) { if (remaining > 0) { remaining -= dt; if (remaining <= 1e-10) reset(); } },
  };
}
