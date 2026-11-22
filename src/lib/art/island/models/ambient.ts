import { fill, model } from "../voxel/grid";

export function bird(wings = false) {
  const m = wings ? model(23, 7, 7) : model(11, 12, 17);
  fill(m, (x, y, z) => {
    if (wings) return Math.abs(y - Math.abs(x) * 0.35) < 1.1 && Math.abs(z + Math.floor(Math.abs(x) / 6)) < 3 - Math.abs(x) * 0.13 ? Math.abs(x) > 7 ? 13 : Math.abs(x) === 6 ? 21 : 4 : 0;
    if (y < 3) return Math.abs(x) > 1 && Math.abs(x) < 3 && Math.abs(z) < 1 ? 18 : 0;
    if (z < -4 && Math.abs(x) < 2.5 && y === 6 + Math.floor((-z - 4) / 2)) return 13;
    if ((x / 4) ** 2 + ((y - 6) / 4) ** 2 + ((z + 1) / 6) ** 2 < 1) return z > 0 && y < 8 ? y < 5 ? 21 : 16 : 4;
    if (Math.abs(x) < 3 && y > 6 && y < 11 && z > 2 && z < 7) return Math.abs(x) > 1 && y === 9 && z > 4 ? 2 : 4;
    return Math.abs(x) < 1.5 && y === 8 && z > 5 ? 18 : 0;
  });
  return m;
}

export function insect(long = false) {
  const m = model(17, 3, long ? 23 : 13);
  fill(m, (x, y, z) => {
    const ax = Math.abs(x);
    if (ax < 1.2 && Math.abs(z) < (long ? 11 : 5)) return long ? z % 4 === 0 ? 8 : 23 : 4;
    if (long) return y === 1 && ax < 8 && Math.abs(Math.abs(z) - 2 - ax * 0.2) < 1.5 ? ax > 5 ? 15 : 23 : 0;
    const lobe = ((ax - 4) / 4) ** 2 + ((z - 2) / 3) ** 2 < 1 || ((ax - 3) / 3) ** 2 + ((z + 2) / 3) ** 2 < 1;
    return y === 1 && lobe ? ax === 5 && z > 0 ? 16 : 21 : 0;
  });
  return m;
}
