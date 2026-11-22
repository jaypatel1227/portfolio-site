import { fill, model } from "../voxel/grid";

export function bird(wings = false) {
  const m = wings ? model(23, 7, 7) : model(11, 12, 17);
  fill(m, (x, y, z) => {
    if (wings) return Math.abs(y - Math.abs(x) * 0.35) < 1.1 && Math.abs(z) < 3 - Math.abs(x) * 0.13 ? 4 : 0;
    if (y < 3) return Math.abs(x) > 1 && Math.abs(x) < 3 && Math.abs(z) < 1 ? 18 : 0;
    if ((x / 4) ** 2 + ((y - 6) / 4) ** 2 + ((z + 1) / 6) ** 2 < 1) return z > 0 && y < 7 ? 21 : 4;
    if (Math.abs(x) < 3 && y > 6 && y < 11 && z > 2 && z < 7) return Math.abs(x) > 1 && y === 9 && z > 4 ? 2 : 4;
    return Math.abs(x) < 1.5 && y === 8 && z > 5 ? 18 : 0;
  });
  return m;
}

export function insect(long = false) {
  const m = model(17, 3, long ? 23 : 13);
  fill(m, (x, y, z) => {
    if (Math.abs(x) < 1.2 && Math.abs(z) < (long ? 11 : 5)) return long ? 23 : 4;
    const wing = long ? Math.abs(Math.abs(z) - 3) < 1.7 : Math.abs(z) < 5 - Math.abs(x) * 0.35;
    return y === 1 && wing && Math.abs(x) < 8 ? 21 : 0;
  });
  return m;
}
