import { random, trailX } from "./math";
import { fill, model, type VoxelModel } from "./slices";

export const PALETTE = ["#000000", "#152330", "#3f374c", "#71586a", "#ab887e", "#193b48", "#285969", "#43808a", "#8cb9aa", "#365959", "#527567", "#ada99a", "#808b8c", "#52627b", "#8195a8", "#b7c9cc", "#d18f58", "#ffd58a", "#ffe9b2", "#a95d69", "#d38483", "#eee1c1", "#557594", "#84a6b4"];

export function pine(seed: number): VoxelModel {
  const m = model(23, 47, 23);
  const phase = random(seed)() * 7;
  fill(m, (x, y, z) => {
    const radius = Math.hypot(x, z);
    const tier = (y - 7) % 8;
    const width = (1 - (y - 6) / 42) * 11 - tier * 0.42;
    if (y > 6 && radius < width + Math.sin(Math.atan2(z, x) * 6 + phase) * 0.6) {
      return y % 8 > 5 ? 8 : 6 + ((Math.floor(x / 3) + Math.floor(z / 3) + Math.floor(y / 3) & 3) === 0 ? 1 : 0);
    }
    return y < 24 && radius < 1.6 ? (x < 0 ? 4 : 3) : 0;
  });
  return m;
}

export function greatTree(seed: number): VoxelModel {
  const m = model(87, 83, 75);
  const rng = random(seed);
  const limbs = Array.from({ length: 8 }, (_, i) => {
    const angle = i * Math.PI / 4 + rng() * 0.25;
    return { x: Math.cos(angle) * (21 + rng() * 12), z: Math.sin(angle) * (17 + rng() * 10), y: 46 + rng() * 13 };
  });
  fill(m, (x, y, z) => {
    const bend = Math.sin(y * 0.06) * 3;
    const roots = y < 8 ? (8 - y) * (0.6 + Math.cos(Math.atan2(z, x) * 7) * 0.5) : 0;
    if (y < 64 && Math.hypot(x - bend, z) < 6 - y * 0.04 + roots) return (Math.floor(x + z * 0.5) % 4 === 0) ? 4 : 3;
    for (const limb of limbs) {
      const t = (y - 23) / (limb.y - 23);
      if (t > 0 && t < 1 && Math.hypot(x - limb.x * t, z - limb.z * t) < 3.5 - t * 1.6) return 3;
      const d = ((x - limb.x) / 17) ** 2 + ((z - limb.z) / 15) ** 2 + ((y - limb.y - 5) / 12) ** 2;
      if (d < 1 + Math.sin(x * 0.7 + z * 0.8) * 0.06) {
        return y % 5 === 0 ? 8 : ((Math.floor(x / 4) + Math.floor(z / 4) + Math.floor(y / 3)) & 3) === 0 ? 7 : 6;
      }
    }
    return 0;
  });
  return m;
}

export function rock(seed: number): VoxelModel {
  const m = model(15, 12, 13);
  const phase = random(seed)() * 4;
  fill(m, (x, y, z) => (x / 7) ** 2 + (z / 6) ** 2 + (y / 10) ** 2 < 1 + Math.sin(x + z + phase) * 0.12 ? (y > 7 ? 15 : x < -2 ? 14 : 13) : 0);
  return m;
}

export function island(seed: number): VoxelModel {
  const m = model(97, 7, 89);
  const rng = random(seed);
  fill(m, (x, y, z) => {
    if ((x / (46 - (6 - y) * 0.7)) ** 2 + (z / (42 - (6 - y) * 0.7)) ** 2 > 1 + Math.sin(x * 0.4 + z * 0.3) * 0.035) return 0;
    if (y < 6) return y % 3 === 0 ? 2 : 3;
    const wx = x * 0.44, wz = z * 0.44;
    if (Math.abs(wx - trailX(wz)) < 1.2 && wz > -4) return rng() < 0.3 ? 12 : 11;
    return rng() < 0.2 ? 10 : 9;
  });
  return m;
}

export function cabin(): VoxelModel {
  const m = model(35, 34, 31);
  fill(m, (x, y, z) => {
    if (y < 19 && Math.abs(x) < 13 && Math.abs(z) < 11) {
      if (z > 9 && x < -2 && x > -8 && y < 14) return 2;
      if (z > 9 && x > 3 && x < 9 && y > 6 && y < 13) return y === 9 || x === 6 ? 3 : 17;
      return y % 4 === 0 ? 4 : 3;
    }
    if (y >= 19 && Math.abs(x) < 18 - (y - 19) && Math.abs(z) < 15) return y % 3 === 0 ? 14 : 13;
    if (x > 7 && x < 11 && z < -2 && z > -7 && y > 22) return y % 3 === 0 ? 15 : 13;
    return 0;
  });
  return m;
}

export function lantern(): VoxelModel {
  const m = model(9, 24, 9);
  fill(m, (x, y, z) => {
    if (y < 13) return Math.abs(x) < 0.7 && Math.abs(z) < 0.7 ? 4 : 0;
    if (y < 16 || y > 21) return Math.abs(x) + Math.abs(z) < 6 - Math.abs(y - 19) * 0.4 ? 3 : 0;
    if (Math.abs(x) < 3 && Math.abs(z) < 3) return (Math.abs(x) > 1 && Math.abs(z) > 1) ? 3 : y > 19 ? 18 : 17;
    return 0;
  });
  return m;
}

export function mushroom(): VoxelModel {
  const m = model(11, 11, 11);
  fill(m, (x, y, z) => {
    if (y < 7 && Math.hypot(x, z) < 1.2) return 21;
    if (y > 5 && (x / 5) ** 2 + (z / 5) ** 2 + ((y - 6) / 4) ** 2 < 1) return (x * 2 + z * 3 & 7) === 0 ? 18 : 20;
    return 0;
  });
  return m;
}

export function grass(): VoxelModel {
  const m = model(9, 11, 9);
  fill(m, (x, y, z) => {
    if (Math.abs(z) < 0.6 && (Math.abs(x) < 0.6 || y < 8 && Math.abs(x - y * 0.4) < 0.6 || y < 7 && Math.abs(x + y * 0.4) < 0.6)) return y > 7 ? 8 : 10;
    return 0;
  });
  return m;
}

export function sign(): VoxelModel {
  const m = model(21, 25, 7);
  fill(m, (x, y, z) => {
    if (y < 14 && Math.abs(x) < 1 && Math.abs(z) < 1) return 4;
    if (y >= 14 && y < 23 && Math.abs(x) < 10 && Math.abs(z) < 2) return y === 14 || y === 22 ? 3 : 16;
    return 0;
  });
  return m;
}

export function character(): VoxelModel {
  const m = model(15, 27, 13);
  fill(m, (x, y, z) => {
    if (y < 5) return Math.abs(z) < 3 && Math.abs(x) > 1 && Math.abs(x) < 5 ? (y < 2 ? 2 : 22) : 0;
    if (y < 15 && Math.abs(x) < 5 && Math.abs(z) < 3) return y > 12 ? 19 : 22;
    if (y > 6 && y < 15 && Math.abs(x) < 7 && Math.abs(z) < 2) return y < 9 ? 21 : 22;
    if (y >= 15 && y < 25 && Math.abs(x) < 5 && Math.abs(z) < 5) {
      if (z > 1 && y < 22) return y === 19 && Math.abs(x) > 1 && Math.abs(x) < 4 ? 2 : 21;
      return y > 22 ? 17 : 16;
    }
    if (y > 7 && y < 15 && z < -2 && z > -5 && Math.abs(x) < 4) return 16;
    return 0;
  });
  return m;
}
