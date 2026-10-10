import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { describe, expect, it } from 'vitest';
import { createScene } from '../src/rendering/scene';
describe('TPS camera obstruction', () => {
  it('shortens against the back wall and recovers after leaving it', () => {
    const engine = new NullEngine();
    const scene = createScene(engine, {} as HTMLCanvasElement);
    try {
      scene.meshes.forEach(m => m.computeWorldMatrix(true));
      const camera = scene.metadata.camera;
      camera.look(Math.PI, 0);
      const p = { x: 0, z: 7.6, yaw: 0 };
      for (let i = 0; i < 60; i++) camera.update(p, 1 / 60);
      expect(camera.camera.position.z).toBeLessThan(8.2);
      expect(camera.camera.position.z).toBeGreaterThan(p.z);
      p.z = 0;
      for (let i = 0; i < 120; i++) camera.update(p, 1 / 60);
      expect(camera.camera.position.z).toBeGreaterThan(4);
      expect(camera.camera.position.z).toBeLessThan(5.1);
    } finally { scene.dispose(); engine.dispose(); }
  });
});
