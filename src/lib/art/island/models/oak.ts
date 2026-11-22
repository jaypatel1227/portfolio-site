import { random } from "../math";
import { fill, model, type VoxelModel } from "../voxel/grid";

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
      const dy = (y - limb.y - 5) / 13, dx = (x - limb.x) / 16, dz = (z - limb.z) / 14;
      const d = dx * dx + dz * dz + dy * dy;
      if (d < 1.13 && d < 1 + 0.11 * Math.cos(dx * 7 + dz * 3) + 0.07 * Math.sin(dz * 8 - dy * 4)) {
        const tuft = (Math.floor((x + 2 * y) / 7) + Math.floor(z / 5)) & 3;
        return dy > 0.35 && tuft === 0 ? 8 : dy > 0 && tuft !== 1 || tuft === 3 ? 7 : 6;
      }
    }
    return 0;
  });
  return m;
}
