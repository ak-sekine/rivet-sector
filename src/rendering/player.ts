import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import type { Scene } from '@babylonjs/core/scene';
export function createPlayer(scene: Scene): TransformNode {
  const root = new TransformNode('player', scene);
  const materials = ['#526578', '#32a89d', '#152633'].map((color, i) => {
    const m = new StandardMaterial(`robot-${i}`, scene); m.diffuseColor = Color3.FromHexString(color); return m;
  });
  const part = (name: string, w: number, h: number, d: number, x: number, y: number, z: number, color = 0) => {
    const pivot = new TransformNode(`${name}-joint`, scene); pivot.parent = root; pivot.position.set(x, y, z);
    const mesh = MeshBuilder.CreateBox(`player-${name}`, { width: w, height: h, depth: d }, scene);
    mesh.parent = pivot; mesh.material = materials[color]; mesh.isPickable = false;
  };
  part('head', .55, .45, .5, 0, 1.775, 0);
  part('torso', .72, .75, .45, 0, 1.175, 0);
  part('visor', .4, .13, .04, 0, 1.82, .27, 1);
  part('backpack', .45, .4, .18, 0, 1.25, -.31, 2);
  part('back-light', .25, .08, .04, 0, 1.35, -.42, 1);
  for (const s of [-1, 1]) {
    part(`arm-${s}`, .22, .65, .25, s * .49, 1.17, 0, 1);
    part(`leg-${s}`, .25, .65, .28, s * .21, .475, 0);
    part(`foot-${s}`, .3, .15, .45, s * .21, .075, .08, 2);
  }
  return root;
}
