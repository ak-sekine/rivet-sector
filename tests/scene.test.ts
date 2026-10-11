import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { describe, expect, it } from 'vitest';
import { createScene } from '../src/rendering/scene';

describe('TPS scene', () => {
  it('keeps dodge direction and facing while looking, and resets its visual on interruption', () => {
    const engine = new NullEngine(), scene = createScene(engine, {} as HTMLCanvasElement);
    try {
      const m = scene.metadata, p = m.player;
      m.update({ x:0,forward:1,lookX:0,lookY:0,dodge:true }, .05);
      m.update({ x:1,forward:-1,lookX:Math.PI/2,lookY:.5,dodge:false }, .05);
      expect(p.x).toBe(0); expect(p.z).toBeCloseTo(-3.75); expect(p.yaw).toBe(0);
      expect(m.camera.yaw).toBeCloseTo(Math.PI/2);
      expect(scene.getTransformNodeByName('torso-joint')!.rotation.x).toBe(.16);
      m.reset(); expect(m.dodge.active).toBe(false); expect(m.dodge.recoveryDelay).toBeCloseTo(.4); expect(m.dodge.stamina).toBe(75);
      expect(scene.getTransformNodeByName('torso-joint')!.rotation.x).toBe(0);
    } finally { scene.dispose(); engine.dispose(); }
  });
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
