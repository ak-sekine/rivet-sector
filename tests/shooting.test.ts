import { describe, expect, it } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Ray } from '@babylonjs/core/Culling/ray';
import { centerRay, traceShot } from '../src/game/hitscan';
import { createShooting } from '../src/game/shooting';
import { createScene } from '../src/rendering/scene';
import { createTarget } from '../src/rendering/target';
import { createShootingEffects } from '../src/rendering/shooting-effects';

describe('hitscan and game clock', () => {
  it.each([30,60,120])('enforces interval without buffering at %s FPS', fps => {
    const gun = createShooting(); expect(gun.update(true,0)).toBe(true);
    expect(gun.update(true,.1)).toBe(false);
    for (let i=0;i<fps;i++) expect(gun.update(false,1/fps)).toBe(false);
    expect(gun.update(true,0)).toBe(true);
    expect(gun.update(true,0)).toBe(false);
  });
  it('uses actual camera center and the current view matrix', () => {
    const e = new NullEngine(), s = new Scene(e);
    try {
      const c = new FreeCamera('camera',new Vector3(2,3,-5),s);
      for (const goal of [new Vector3(0,1,5),new Vector3(6,4,0)]) {
        c.setTarget(goal); const ray = centerRay(c);
        expect(Vector3.Distance(ray.origin,c.position)).toBeLessThan(1e-6);
        expect(Vector3.Distance(ray.direction,goal.subtract(c.position).normalize())).toBeLessThan(1e-6);
        expect(ray.length).toBe(60);
      }
    } finally { s.dispose(); e.dispose(); }
  });
  it('selects target, walls, floor, range and muzzle occlusion independently of camera metadata', () => {
    const e = new NullEngine(), s = new Scene(e);
    try {
      const target = MeshBuilder.CreateBox('target',{size:1},s);
      target.position.set(0,1,10); target.metadata = { targetId:'robot' };
      const ray = new Ray(new Vector3(0,1,0),new Vector3(0,0,1),60);
      const muzzle = new Vector3(1,1,0);
      const self = MeshBuilder.CreateBox('self',{size:1},s); self.position.set(0,1,2);
      self.metadata = { cameraObstacle:true }; // Not a shooting collider.
      const trace = () => { s.meshes.forEach(m=>m.computeWorldMatrix(true)); return traceShot(s,ray,muzzle); };
      expect(trace()).toMatchObject({kind:'target',targetId:'robot'});
      ray.direction = new Vector3(-1,0,0); expect(trace().kind).toBe('miss');
      ray.direction = new Vector3(0,0,1);
      const wall = MeshBuilder.CreateBox('wall',{width:2,height:3,depth:.2},s);
      wall.position.set(0,1,5); wall.metadata = {shotSurface:true};
      expect(trace().kind).toBe('surface');
      // Camera can see the robot, but the shoulder-offset muzzle is blocked.
      wall.scaling.x=.2; wall.position.set(.9,1,1);
      expect(trace().kind).toBe('surface');
      wall.setEnabled(false); target.position.z=61;
      expect(trace().kind).toBe('miss');
      // Camera range admits it but the muzzle is more than 60 units away.
      target.position.z=59; muzzle.x=30; expect(trace().kind).toBe('miss');
      muzzle.set(1,1,0); target.position.z=10;
      const floor = MeshBuilder.CreateGround('floor',{width:30,height:30},s); floor.metadata={shotSurface:true};
      ray.direction=new Vector3(0,-1,1).normalize(); expect(trace().kind).toBe('surface');
      // An unrelated target in the muzzle path cannot become an accidental target hit.
      ray.direction=new Vector3(0,0,1); muzzle.x=3;
      const other=MeshBuilder.CreateBox('other',{size:.5},s); other.position.set(2.68,1,1); other.metadata={targetId:'other'};
      expect(trace().kind).toBe('miss');
    } finally { s.dispose(); e.dispose(); }
  });
  it('refreshes flash, expires effects, and bounds effect mesh count', () => {
    const e = new NullEngine(), s = new Scene(e);
    try {
      const target=createTarget(s), effects=createShootingEffects(s), count=s.meshes.length;
      target.hit(); expect(target.flashing).toBe(true); target.update(.1); target.hit();
      target.update(.149); expect(target.flashing).toBe(true); target.update(.001); expect(target.flashing).toBe(false);
      for(let i=0;i<100;i++) effects.show(Vector3.Zero(),{kind:'surface',point:new Vector3(0,0,3)});
      expect(s.meshes.length).toBe(count+1); expect(target.flashing).toBe(false);
      effects.update(.06); expect(s.meshes.length).toBe(count);
      target.hit(); effects.show(Vector3.Zero(),{kind:'target',point:Vector3.One()});
      effects.reset(); target.reset(); expect(target.flashing).toBe(false); expect(s.meshes.length).toBe(count);
    } finally { s.dispose(); e.dispose(); }
  });
  it('shoots during dodge after camera update without extra stamina, and clears effects on pause', () => {
    const e=new NullEngine(), s=createScene(e,{} as HTMLCanvasElement);
    try {
      const m=s.metadata;
      m.update({x:0,forward:1,lookX:.2,lookY:-.1,dodge:true,shoot:true},.02);
      expect(m.shots).toBe(1); expect(m.dodge.active).toBe(true); expect(m.dodge.stamina).toBe(75);
      expect(m.camera.yaw).toBe(.2); expect(m.lastShot).toBeDefined();
      const remaining=m.shooting.remaining;
      m.reset(); expect(m.shooting.remaining).toBe(remaining); expect(m.target.flashing).toBe(false);
      expect(s.getMeshByName('shot-tracer')).toBeNull();
      m.update({x:0,forward:0,lookX:0,lookY:0},0); expect(m.shots).toBe(1);
    } finally { s.dispose(); e.dispose(); }
  });
});
