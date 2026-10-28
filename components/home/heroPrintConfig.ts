// Shared between the hero (status card) and the 3D scene. Kept in its own
// module ON PURPOSE: importing these values from HeroFloatingPrint.tsx would
// statically pull three.js into the main homepage bundle and defeat the
// lazy next/dynamic load of the scene.

export interface PrintStatus {
  layer: number;
  total: number;
  printing: boolean;
  filament: string;
}

export const FILAMENTS = [
  { name: "PLA · Emerald", color: 0x10b981 },
  { name: "PLA · Marble white", color: 0xe2e8f0 },
  { name: "PETG · Indigo", color: 0x6366f1 },
];
export const TOTAL_LAYERS = 1200;
