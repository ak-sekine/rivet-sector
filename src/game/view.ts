export const CAMERA = { distance: 5, shoulder: .75, height: 1.5, followSpeed: 14,
  minPitch: -.35, maxPitch: 1.1, sensitivity: .003, clearance: .25 };
export const clampPitch = (p: number) => Math.max(CAMERA.minPitch, Math.min(CAMERA.maxPitch, p));
