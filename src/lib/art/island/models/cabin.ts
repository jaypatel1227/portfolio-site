import { fill, model, type VoxelModel } from "../voxel/grid";

export function cabin(): VoxelModel {
  const m = model(35, 34, 31);
  fill(m, (x, y, z) => {
    const ax = Math.abs(x), az = Math.abs(z);
    if (x >= 6 && x <= 12 && z >= -8 && z <= -2 && y >= 24 && y <= 33) {
      const lip = y >= 32, inset = x === 6 || x === 12 || z === -8 || z === -2;
      if (!inset || lip) return lip ? inset ? 14 : 2 : y % 3 === 0 || (x + z + 3 * Math.floor(y / 3)) % 6 === 0 ? 13 : 4;
    }
    if (az <= 14 && y >= 18 && Math.abs(ax + y - 35) < 2)
      return az === 14 || y === 18 ? 3 : y >= 32 ? 14 : (z + 4 * Math.floor(y / 4) + 24) % 9 === 0 && y % 4 !== 0 ? 12 : 13;
    // Projecting porch canopy, corbels and a deep lintel cast actual shadows at the entry.
    if (x >= -11 && x <= 0 && z >= 10 && z <= 15 && y === 19 - Math.floor((z - 9) / 2)) return z === 15 ? 4 : 13;
    if ((x === -10 || x === -1) && z >= 11 && z <= 14 && y === 12 + (z - 10)) return 4;
    if (ax >= 11 && ax <= 13 && az >= 9 && az <= 11 && y > 2 && y <= 18)
      return y % 4 === 0 ? 2 : y % 4 === 1 ? 4 : 3;
    if (x > 1 && x <= 10 && z >= 11 && z <= 12 && y === 6) return 4;
    if (y < 3 && ax <= 13 && az <= 11) return (x + z + y) % 5 === 0 ? 12 : 13;
    if (z >= 11 && z <= 14 && x >= -9 && x <= -2 && y <= 14 - z) return 12;
    if (z === 11 && (y === 6 && x > 1 && x < 11 || y === 15 && x >= -9 && x <= -2)) return 4;
    if (ax <= 12 && az <= 10 && y < 35 - ax) {
      if (z === 10 && x > -9 && x < -2 && y < 15) return x === -4 && y === 8 ? 17 : x === -8 || y === 14 ? 4 : x % 3 === 0 ? 2 : 3;
      if ((z === 10 && x >= 3 && x <= 9 || x === 12 && Math.abs(z) <= 4) && y > 6 && y < 14)
        return y === 10 || (z === 10 ? x === 6 : z === 0) ? 3 : y > 10 ? 17 : 18;
      if (y >= 18) {
        if (z === 10 && ax < 3 && y >= 23 && y <= 28) return x === 0 || y === 25 ? 3 : 17;
        return x === 0 || ax === y - 18 || y === 18 ? 4 : 3;
      }
      return ax >= 11 && az >= 9 || y % 5 === 0 ? 4 : 3;
    }
    return 0;
  });
  return m;
}
