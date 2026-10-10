import { Scene } from '@babylonjs/core/scene';
import type { Engine } from '@babylonjs/core/Engines/engine';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { createTpsCamera } from './camera';
import { createPlayer } from './player';
import { stage } from '../stage';
import { movePlayer, type Controls } from '../game/movement';

export function createScene(engine: Engine, canvas: HTMLCanvasElement): Scene {
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.06, 0.1, 0.14, 1);
  const player = createPlayer(scene);
  const state = { x: 0, z: -5, yaw: 0 };
  const camera = createTpsCamera(scene);
  scene.metadata = { player: state, camera, update(input: Controls, seconds: number) {
    camera.look(input.lookX, input.lookY);
    movePlayer(state, input, camera.yaw, seconds);
    player.position.set(state.x, 0, state.z); player.rotation.y = state.yaw;
    camera.update(state, seconds);
  } };
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
  const floor = MeshBuilder.CreateGround('floor', { width: stage.width, height: stage.depth }, scene);
  floor.metadata = { cameraObstacle: true };
  floor.material = material('floor-material', '#293b4b');
  const box = (name: string, width: number, height: number, depth: number, x: number, z: number, surface: StandardMaterial) => {
    const mesh = MeshBuilder.CreateBox(name, { width, height, depth }, scene);
    mesh.position.set(x, height / 2, z);
    mesh.material = surface;
    mesh.metadata = { cameraObstacle: true };
  };
  for (const b of stage.boxes) box(b.name, b.width, b.height, b.depth, b.x, b.z, b.teal ? teal : steel);
  scene.metadata.update({ x: 0, forward: 0, lookX: 0, lookY: 0 }, 0);
  return scene;
}
