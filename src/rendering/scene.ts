import { Scene } from '@babylonjs/core/scene';
import type { Engine } from '@babylonjs/core/Engines/engine';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { createInspectionCamera } from './camera';

export function createScene(engine: Engine, canvas: HTMLCanvasElement): Scene {
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.06, 0.1, 0.14, 1);
  createInspectionCamera(scene, canvas);
  new HemisphericLight('ambient', new Vector3(0, 1, 0), scene).intensity = 0.7;
  new DirectionalLight('key', new Vector3(-1, -2, 1), scene).intensity = 0.8;
  const material = (name: string, color: string) => {
    const result = new StandardMaterial(name, scene);
    result.diffuseColor = Color3.FromHexString(color);
    result.specularColor = new Color3(0.1, 0.1, 0.1);
    return result;
  };
  const steel = material('steel', '#526578');
  const teal = material('teal', '#32a89d');
  const floor = MeshBuilder.CreateGround('floor', { width: 22, height: 18 }, scene);
  floor.material = material('floor-material', '#293b4b');
  const box = (name: string, width: number, height: number, depth: number, x: number, z: number, surface: StandardMaterial) => {
    const mesh = MeshBuilder.CreateBox(name, { width, height, depth }, scene);
    mesh.position.set(x, height / 2, z);
    mesh.material = surface;
  };
  box('back-wall', 22, 4, 0.6, 0, 8.5, steel);
  box('side-wall', 0.6, 4, 18, -10.5, 0, steel);
  box('crate-a', 3, 3, 3, -4, 2, teal);
  box('crate-b', 4, 1.5, 2, 3, -2, steel);
  box('tower', 2, 5, 2, 5, 5, teal);
  return scene;
}
