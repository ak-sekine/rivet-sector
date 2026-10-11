import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import type { Scene } from '@babylonjs/core/scene';
import { HIT_FLASH_SECONDS } from '../game/shooting';
import { stage } from '../stage';

export function createTarget(scene: Scene) {
  const root = new TransformNode('target', scene);
  root.position.set(stage.target.x, 0, stage.target.z);
  const materials = ['#bc724b', '#edc26b', '#493c48'].map((color, i) => {
    const m = new StandardMaterial(`target-material-${i}`, scene);
    m.diffuseColor = Color3.FromHexString(color); return m;
  });
  const part = (name: string, w: number, h: number, d: number, x: number, y: number, z: number, color = 0) => {
    const mesh = MeshBuilder.CreateBox(`target-${name}`, { width:w, height:h, depth:d }, scene);
    mesh.parent = root; mesh.position.set(x,y,z); mesh.material = materials[color];
    mesh.metadata = { targetId: 'training-robot' };
  };
  part('head', .55,.45,.5,0,1.775,0);
  part('torso', .72,.75,.45,0,1.175,0);
  part('visor', .4,.13,.04,0,1.82,-.27,1);
  for (const s of [-1,1]) {
    part(`arm-${s}`,.22,.65,.25,s*.49,1.17,0,1);
    part(`leg-${s}`,.25,.65,.28,s*.21,.475,0);
    part(`foot-${s}`,.3,.15,.45,s*.21,.075,-.08,2);
  }
  let remaining = 0;
  const paint = () => materials.forEach(m => m.emissiveColor.set(remaining > 0 ? .8 : 0, remaining > 0 ? .65 : 0, remaining > 0 ? .35 : 0));
  return { root, get flashing() { return remaining > 0; },
    hit() { remaining = HIT_FLASH_SECONDS; paint(); },
    update(dt: number) { remaining = Math.max(0, remaining - dt); if (remaining < 1e-10) remaining = 0; paint(); },
    reset() { remaining = 0; paint(); },
  };
}
