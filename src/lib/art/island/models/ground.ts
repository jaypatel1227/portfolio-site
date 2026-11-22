import { random, trailX } from "../math";
import { fill, model, type VoxelModel } from "../voxel/grid";

export function island(seed: number): VoxelModel {
  const m = model(97, 7, 89);
  const rng = random(seed);
  fill(m, (x, y, z) => {
    if ((x / (46 - (6 - y) * 0.7)) ** 2 + (z / (42 - (6 - y) * 0.7)) ** 2 > 1 + Math.sin(x * 0.4 + z * 0.3) * 0.035) return 0;
    if (y < 6) {
      const seam = Math.round(1.4 * Math.sin(x * 0.12 + z * 0.08));
      if (y === 5 && Math.sin(x * 0.32 - z * 0.21) > -0.3) return 10;
      return y === 2 + seam ? 4 : y < 2 + seam ? 2 : 3;
    }
    const wx = x * 0.44, wz = z * 0.44;
    const rut = Math.abs(wx - trailX(wz)), fleck = rng();
    if (rut < 1.2 && wz > -4) return fleck < (rut > 0.9 ? 0.65 : 0.19) ? 12 : 11;
    return fleck * 0.6 + Math.sin(x * 0.23 + 0.7 * Math.cos(z * 0.33)) * Math.cos(z * 0.2) > 0.78 ? 10 : 9;
  });
  return m;
}
