import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { describe, expect, it } from 'vitest';
import { createScene } from '../src/rendering/scene';

describe('TPS scene', () => {
  it('creates the floor, walls, objects, robot, lights and TPS camera', () => {
    const engine = new NullEngine();
    // Camera and movement do not require DOM input in NullEngine.
    const scene = createScene(engine, {} as HTMLCanvasElement);
    try {
      expect(scene.meshes.filter(mesh => !mesh.name.startsWith('player-')).map((mesh) => mesh.name)).toEqual([
        'floor', 'back-wall', 'side-wall', 'crate-a', 'crate-b', 'tower',
      ]);
      expect(scene.lights).toHaveLength(2);
      expect(scene.activeCamera?.name).toBe('tps');
      expect(scene.getTransformNodeByName('player')?.position.z).toBe(-5);
      expect(scene.getMeshByName('player-head')).not.toBeNull();
      expect(scene.meshes.filter(mesh => mesh.name.startsWith('player-')).every(mesh => !mesh.isPickable)).toBe(true);
      expect(scene.meshes.every((mesh) => mesh.material !== null)).toBe(true);
    } finally {
      scene.dispose();
      engine.dispose();
    }
  });
});
