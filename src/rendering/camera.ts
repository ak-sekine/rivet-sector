import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
import { Ray } from '@babylonjs/core/Culling/ray';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { Scene } from '@babylonjs/core/scene';

import { CAMERA, clampPitch } from '../game/view';
import { frameSeconds, type PlayerState } from '../game/movement';
export function createTpsCamera(scene: Scene) {
  const camera = new FreeCamera('tps', Vector3.Zero(), scene);
  camera.minZ = .05; camera.fov = .9;
  let yaw = 0, pitch = .25, initialized = false;
  const target = Vector3.Zero(), desired = Vector3.Zero(), direction = Vector3.Zero();
  const ray = new Ray(Vector3.Zero(), direction, 6);
  const offsets = [-CAMERA.clearance, 0, CAMERA.clearance];
  return { camera, get yaw() { return yaw; },
    look(x: number, y: number) { yaw += x * CAMERA.sensitivity; pitch = clampPitch(pitch + y * CAMERA.sensitivity); },
    update(p: PlayerState, seconds: number) {
      target.set(p.x, CAMERA.height, p.z);
      desired.set(p.x - Math.sin(yaw) * Math.cos(pitch) * CAMERA.distance + Math.cos(yaw) * CAMERA.shoulder,
        CAMERA.height + Math.sin(pitch) * CAMERA.distance,
        p.z - Math.cos(yaw) * Math.cos(pitch) * CAMERA.distance - Math.sin(yaw) * CAMERA.shoulder);
      if (initialized) Vector3.LerpToRef(camera.position, desired, 1 - Math.exp(-CAMERA.followSpeed * frameSeconds(seconds)), desired);
      desired.subtractToRef(target, direction); ray.length = direction.length(); direction.normalize();
      let distance = ray.length;
      for (const offset of offsets) {
        ray.origin.set(target.x + Math.cos(yaw) * offset, target.y, target.z - Math.sin(yaw) * offset);
        const hit = scene.pickWithRay(ray, mesh => mesh.metadata?.cameraObstacle === true);
        if (hit?.hit) distance = Math.min(distance, Math.max(.05, hit.distance - CAMERA.clearance));
      }
      camera.position.set(target.x + direction.x * distance, target.y + direction.y * distance, target.z + direction.z * distance);
      camera.setTarget(target); initialized = true;
    },
  };
}
