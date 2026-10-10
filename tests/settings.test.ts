import { describe, expect, it } from 'vitest';
import { hardwareScalingLevel } from '../src/rendering/settings';

describe('render resolution scaling', () => {
  it('preserves standard resolution and supports retina', () => {
    expect(hardwareScalingLevel(1)).toBe(1);
    expect(hardwareScalingLevel(1.5)).toBeCloseTo(2 / 3);
    expect(hardwareScalingLevel(2)).toBe(0.5);
  });
  it('caps high-density displays to avoid excessive GPU work', () => {
    expect(hardwareScalingLevel(3)).toBe(0.5);
  });
  it.each([0, -1, NaN, Infinity])('falls back for invalid ratio %s', (ratio) => {
    expect(hardwareScalingLevel(ratio)).toBe(1);
  });
});
