/** Monochrome phosphor palette shared by PNG generation and Phaser drawing.
 * CSS exposes the same six values as custom properties for the terminal UI. */
export const PHOSPHOR = {
  background: 0x020b04,
  floor: 0x0b1e10,
  surface: 0x174b24,
  edge: 0x2f9f48,
  bright: 0x79ff91,
  core: 0xcaffcf,
} as const;
