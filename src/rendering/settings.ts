/** Limit backing-buffer resolution on high-density mobile displays. */
export function hardwareScalingLevel(devicePixelRatio: number): number {
  const ratio = Number.isFinite(devicePixelRatio) && devicePixelRatio > 0 ? devicePixelRatio : 1;
  return 1 / Math.min(ratio, 2);
}
