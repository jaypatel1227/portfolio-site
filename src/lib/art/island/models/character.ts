import { fill, model, voxel, type VoxelModel } from "../voxel/grid";

export const CHARACTER_HEAD = 24;
export const CHARACTER_SCALE = 1.575 / 32;

// Front of the eight-pixel head, brow to chin.
const FACE = [
  "hhhhHHhh", "hHHhhhHh", "hssssssh", "ssSsssSs",
  "swpsspws", "sssnnsss", "ssbNNbss", "ssbbbbss",
];
const INK: Record<string, number> = { h: 26, H: 25, s: 24, S: 38, w: 27, p: 28, n: 32, N: 32, b: 39 };

export function character(): VoxelModel {
  const m = model(16, 32, 8);
  fill(m, (x, y, z) => {
    if (y < 12) {
      if (Math.abs(x) >= 4 || Math.abs(z) >= 2) return 0;
      if (y < 2 || z < -0.5 && y === 2) return 31;
      if (Math.abs(x) > 2.5 || Math.abs(x) < 1 || z < -0.5 || y === 2) return 36;
      return z > 0.5 && (y === 5 || y === 6) ? 37 : 30;
    }
    if (y < CHARACTER_HEAD && Math.abs(z) < 2) {
      const body = Math.abs(x) < 4, side = body ? Math.abs(x) > 2.5 : Math.abs(x) > 6.5;
      if (!body && y < 20) return side || z < -0.5 || y === 12 ? 38 : 24;
      if (body && z > 0.5 && (y === 23 && Math.abs(x) < 2 || y === 22 && Math.abs(x) < 1)) return 24;
      if (body && z > 0.5 && y === 12 && x >= 1.5) return 29;
      if (!body && y === 20 && z < 0) return 34;
      if (body && z < -0.5 && y > 12 && y < 23) return Math.abs(x) > 2 || y === 21 ? 34 : 29;
      if (!body && z > 0.5 && y === 23 && !side) return 35;
      if (side || z < -0.5 || y === 12) return 34;
      return (Math.floor(x + 8) + y * 3) % 11 === 0 ? 35 : 29;
    }
    if (y >= CHARACTER_HEAD && Math.abs(x) < 4) {
      if (z > 3) return INK[FACE[31 - y][x + 3.5]];
      if (y >= 30 || z < -2 || Math.abs(x) > 2.5 && (y >= 28 || z < -0.5 && y > 25))
        return x < -1 && z > -2 && z < 2 || x > 0 && x < 3 && z < 0 && y > 28 ? 25 : 26;
      if (Math.abs(x) > 2.5 && z < -0.5 && y === 25) return 26;
      return Math.abs(x) > 2.5 && Math.abs(z) < 1 && (y === 27 || y === 26 && z < 0) ? 38 : 24;
    }
    return 0;
  });
  return m;
}

export type CharacterPart = "head" | "body" | "leftArm" | "rightArm" | "leftLeg" | "rightLeg";

export function characterParts(): { name: CharacterPart; voxels: VoxelModel; position: [number, number, number]; offset: number }[] {
  const source = character();
  const crop = (x: number, y: number, z: number, width: number, height: number, depth: number): VoxelModel => {
    const part = model(width, height, depth);
    fill(part, (px, py, pz) => voxel(source, x + px + (width - 1) / 2, y + py, z + pz + (depth - 1) / 2));
    return part;
  };
  return [
    { name: "head", voxels: crop(4, 24, 0, 8, 8, 8), position: [0, 23.5, 0], offset: 0.5 },
    { name: "body", voxels: crop(4, 12, 2, 8, 12, 4), position: [0, 12, 0], offset: 0 },
    { name: "leftArm", voxels: crop(0, 12, 2, 4, 12, 4), position: [-6, 23.5, 0], offset: -11.5 },
    { name: "rightArm", voxels: crop(12, 12, 2, 4, 12, 4), position: [6, 23.5, 0], offset: -11.5 },
    { name: "leftLeg", voxels: crop(4, 0, 2, 4, 12, 4), position: [-2, 11.5, 0], offset: -11.5 },
    { name: "rightLeg", voxels: crop(8, 0, 2, 4, 12, 4), position: [2, 11.5, 0], offset: -11.5 },
  ];
}
