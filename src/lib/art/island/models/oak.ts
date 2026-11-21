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
      const d = ((x - limb.x) / 17) ** 2 + ((z - limb.z) / 15) ** 2 + ((y - limb.y - 5) / 12) ** 2;
      if (d < 1 + Math.sin(x * 0.7 + z * 0.8) * 0.06) {
        return y % 5 === 0 ? 8 : ((Math.floor(x / 4) + Math.floor(z / 4) + Math.floor(y / 3)) & 3) === 0 ? 7 : 6;
      }
    }
    return 0;
  });
  return m;
}
