import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { describe, expect, it } from 'vitest';
import { createScene } from '../src/rendering/scene';

describe('inspection scene', () => {
  it('creates the floor, walls, objects, lights and temporary camera', () => {
    const engine = new NullEngine();
    // NullEngine has no input element; camera attachment is skipped by Babylon.
    const scene = createScene(engine, {} as HTMLCanvasElement);
    try {
      expect(scene.meshes.map((mesh) => mesh.name)).toEqual([
        'floor', 'back-wall', 'side-wall', 'crate-a', 'crate-b', 'tower',
      ]);
      expect(scene.lights).toHaveLength(2);
      expect(scene.activeCamera?.name).toBe('inspection');
      expect(scene.meshes.every((mesh) => mesh.material !== null)).toBe(true);
    } finally {
      scene.dispose();
      engine.dispose();
    }
  });
});
