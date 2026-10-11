import { Ray } from '@babylonjs/core/Culling/ray';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { Camera } from '@babylonjs/core/Cameras/camera';
import type { Scene } from '@babylonjs/core/scene';
import { SHOT_RANGE } from './shooting';

export interface ShotResult { kind: 'target' | 'surface' | 'miss'; point: Vector3; targetId?: string }
/** Camera forward is viewport center, including the shoulder camera's actual orientation. */
export function centerRay(camera: Camera) {
  camera.getViewMatrix(true);
  return camera.getForwardRay(SHOT_RANGE);
}
export function traceShot(scene: Scene, aim: Ray, muzzle: Vector3): ShotResult {
  const pick = (ray: Ray) => scene.pickWithRay(ray, mesh => mesh.isEnabled() && mesh.isVisible && mesh.isPickable &&
    (mesh.metadata?.shotSurface === true || typeof mesh.metadata?.targetId === 'string'));
  const cameraHit = pick(new Ray(aim.origin, aim.direction, SHOT_RANGE));
  const goal = cameraHit?.hit && cameraHit.pickedPoint ? cameraHit.pickedPoint : aim.origin.add(aim.direction.scale(SHOT_RANGE));
  const direction = goal.subtract(muzzle), distance = direction.length();
  if (distance < 1e-8) return { kind: 'miss', point: muzzle.clone() };
  // A tiny tolerance admits the aimed surface; range is measured from the muzzle too.
  const length = Math.min(SHOT_RANGE, distance + .002);
  const hit = pick(new Ray(muzzle, direction.scale(1 / distance), length));
  if (hit?.hit && hit.pickedPoint) {
    const id = hit.pickedMesh?.metadata?.targetId;
    if (id && cameraHit?.pickedMesh?.metadata?.targetId !== id)
      return { kind: 'miss', point: hit.pickedPoint.clone() };
    return { kind: id ? 'target' : 'surface', point: hit.pickedPoint.clone(), targetId: id };
  }
  return { kind: 'miss', point: muzzle.add(direction.scale(length / distance)) };
}
