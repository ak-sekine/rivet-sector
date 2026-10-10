export const CAMERA = { distance: 5, shoulder: .75, height: 1.5, followSpeed: 14,
  minPitch: -.35, maxPitch: 1.1, clearance: .25 };
/** Provisional input sensitivity in radians per CSS pixel. */
export const MOUSE_SENSITIVITY = .004, TOUCH_SENSITIVITY = .010;
export const clampPitch = (p: number) => Math.max(CAMERA.minPitch, Math.min(CAMERA.maxPitch, p));
