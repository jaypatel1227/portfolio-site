import { fill, model, type VoxelModel } from "../voxel/grid";

export function cabin(): VoxelModel {
  const m = model(35, 34, 31);
  fill(m, (x, y, z) => {
    const ax = Math.abs(x), az = Math.abs(z);
    if (x >= 7 && x <= 11 && z >= -7 && z <= -3 && y >= 23)
      return y === 33 ? (x === 7 || x === 11 || z === -7 || z === -3 ? 14 : 2) : (y % 4 === 0 ? 13 : 4);
    if (az <= 14 && y >= 18 && Math.abs(ax + y - 35) < 2)
      return az === 14 || y === 18 ? 3 : (y + Math.floor(z / 4)) % 6 === 0 ? 14 : 13;
    if (y < 3 && ax <= 13 && az <= 11) return (x + z + y) % 5 === 0 ? 12 : 13;
    if (z >= 11 && z <= 14 && x >= -9 && x <= -2 && y <= 14 - z) return 12;
    if (z === 11 && (y === 6 && x > 1 && x < 11 || y === 15 && x >= -9 && x <= -2)) return 4;
    if (ax <= 12 && az <= 10 && y < 35 - ax) {
      if (z === 10 && x > -9 && x < -2 && y < 15) return x === -4 && y === 8 ? 17 : x === -8 || y === 14 ? 4 : x % 3 === 0 ? 2 : 3;
      if ((z === 10 && x >= 3 && x <= 9 || x === 12 && Math.abs(z) <= 4) && y > 6 && y < 14)
        return y === 10 || (z === 10 ? x === 6 : z === 0) ? 3 : y > 10 ? 17 : 18;
      if (y >= 18) return x === 0 || ax === y - 18 || y === 18 ? 4 : 3;
      return ax >= 11 && az >= 9 || y % 5 === 0 ? 4 : 3;
    }
    return 0;
  });
  return m;
}
