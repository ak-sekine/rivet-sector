export const TILE = 32;
export const WORLD = { width: 1280, height: 768 };
export interface Rect { x: number; y: number; width: number; height: number }
export const walls: Rect[] = [
  { x: 0, y: 0, width: WORLD.width, height: TILE },
  { x: 0, y: WORLD.height - TILE, width: WORLD.width, height: TILE },
  { x: 0, y: TILE, width: TILE, height: WORLD.height - TILE * 2 },
  { x: WORLD.width - TILE, y: TILE, width: TILE, height: WORLD.height - TILE * 2 },
  { x: 320, y: 128, width: 640, height: TILE },
];
export const obstacles: Rect[] = [
  { x: 480, y: 352, width: 64, height: 64 },
  { x: 768, y: 512, width: 64, height: 64 },
  { x: 576, y: 224, width: 64, height: 32 },
  { x: 960, y: 288, width: 64, height: 64 },
  { x: 288, y: 544, width: 64, height: 64 },
];
export const solids = [...walls, ...obstacles];
export const SPAWN = { x: 640, y: 416 };
export const TARGET = { x: 768, y: 352, radius: 13 };
