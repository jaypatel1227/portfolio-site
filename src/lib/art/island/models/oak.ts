import { random } from "../math";
import { fill, model, type VoxelModel } from "../voxel/grid";

export function greatTree(seed: number): VoxelModel {
  const m = model(87, 83, 75);
  const rng = random(seed);
  const limbs = Array.from({ length: 8 }, (_, i) => {
    const angle = i * Math.PI / 4 + rng() * 0.25;
    return { x: Math.cos(angle) * (18 + rng() * 11), z: Math.sin(angle) * (14 + rng() * 10), y: 44 + rng() * 15 };
  });
  const layers = Array.from({ length: m.height }, (_, y) => ({
    bend: Math.sin(y * 0.06) * 3,
    limbs: limbs.map(limb => {
      const t = (y - 23) / (limb.y - 23), dy = (y - limb.y - 5) / 13;
      return { ...limb, dy, branch: t > 0 && t < 1, bx: limb.x * t, bz: limb.z * t,
        offset: 2 * Math.sin(t * 4), radius: (3.8 - t * 1.9) ** 2 };
    }).filter(limb => limb.branch || limb.dy * limb.dy < 1.13),
  }));
  fill(m, (x, y, z) => {
    const { bend, limbs: active } = layers[y];
    if (y < 65 && Math.abs(x - bend) < 16 && Math.abs(z) < 16) {
      const roots = y < 8 ? (8 - y) * (0.6 + Math.cos(Math.atan2(z, x) * 7) * 0.5) : 0;
      if ((x - bend) ** 2 + z*z < (6.8 - y * 0.045 + roots) ** 2)
        return Math.sin(Math.atan2(z, x - bend) * 11 + y * 0.09) > 0.65 ? 4 : 3;
    }
    if (!active.length && y < 51) return 0;
    const crown = ((x + 4) / 21) ** 2 + ((y - 63) / 15.5) ** 2 + ((z + 2) / 17) ** 2;
    if (crown < 1 && y >= 51) {
      const sun = Math.sin(x * 0.24 + z * 0.11) + Math.cos(z * 0.31 - y * 0.12);
      return y > 69 && sun > 0.6 ? 8 : y >= 61 || sun > 1.1 ? 7 : 6;
    }
    for (const limb of active) {
      if (limb.branch && (x - limb.bx + limb.offset) ** 2 + (z - limb.bz) ** 2 < limb.radius) return x > limb.bx ? 4 : 3;
      const dy = limb.dy, dx = (x - limb.x) / 16, dz = (z - limb.z) / 14;
      const d = dx * dx + dz * dz + dy * dy;
      if (d < 1.13 && d < 1 + 0.11 * Math.cos(dx * 7 + dz * 3) + 0.07 * Math.sin(dz * 8 - dy * 4)) {
        const tuft = Math.cos(x * 0.30 + Math.sin(z * 0.25)) + Math.sin(z * 0.36 + y * 0.18);
        return dy > 0.32 && dx * 0.36 + dy - dz * 0.24 + tuft * 0.22 > 0.82 ? 8 : dy + tuft * 0.22 > -0.16 ? 7 : 6;
      }
    }
    return 0;
  });
  return m;
}
