import { fill, model } from "../voxel/grid";

export function fox() {
  const m = model(27, 19, 13);
  fill(m, (x, y, z) => {
    if (x < -7 && y > 5 && y < 11 && Math.abs(z) < 3) return x < -10 ? 21 : 16;
    if (Math.abs(x) < 8 && Math.abs(z) < 4 && y > 4 && y < 12) return y < 7 ? 21 : 16;
    if (Math.abs(x) > 4 && Math.abs(x) < 8 && Math.abs(z) > 1 && Math.abs(z) < 4 && y < 6) return y < 2 ? 2 : 16;
    if (x > 3 && x < 11 && y > 9 && y < 16 && Math.abs(z) < 4) return y === 13 && Math.abs(z) > 2 ? 2 : y < 12 ? 21 : 16;
    if (x > 9 && y > 9 && y < 12 && Math.abs(z) < 2) return x > 11 ? 2 : 21;
    if (x > 3 && x < 7 && y > 14 && Math.abs(z) > 1 && Math.abs(z) < 4) return y > 16 ? 2 : 16;
    return 0;
  });
  return m;
}

export function rabbit() {
  const m = model(13, 22, 15);
  fill(m, (x, y, z) => {
    if ((x / 5) ** 2 + ((y - 6) / 6) ** 2 + ((z + 1) / 6) ** 2 < 1) return 21;
    if (Math.abs(x) < 4 && y > 8 && y < 15 && z > 0 && z < 6) return y === 12 && Math.abs(x) > 2 && z > 3 ? 2 : 21;
    if (Math.abs(x) > 1 && Math.abs(x) < 4 && y > 13 && z > 0 && z < 3) return y < 20 ? 19 : 21;
    return 0;
  });
  return m;
}

export function owl(head: boolean, blink = false) {
  const m = head ? model(15, 12, 13) : model(13, 15, 11);
  fill(m, (x, y, z) => {
    if ((x / (head ? 7 : 6)) ** 2 + ((y - 6) / 7) ** 2 + (z / 5) ** 2 > 1) return 0;
    if (head && z > 2 && y > 3 && y < 9 && Math.abs(x) > 1 && Math.abs(x) < 6) return !blink && y > 4 && y < 8 ? Math.abs(x) < 4 && y === 6 ? 2 : 18 : 4;
    if (head && z > 3 && Math.abs(x) < 2 && y < 6) return 16;
    return z > 1 && Math.abs(x) < 4 ? 21 : 4;
  });
  return m;
}

export function fish() {
  const m = model(17, 7, 7);
  fill(m, (x, y, z) => {
    if ((x / 6) ** 2 + ((y - 3) / 3) ** 2 + (z / 3) ** 2 < 1) return x > 3 && y === 4 && Math.abs(z) > 1 ? 2 : y > 3 ? 17 : 21;
    return x < -4 && Math.abs(z) < 1 && Math.abs(y - 3) < (-x - 3) * 0.6 ? 16 : 0;
  });
  return m;
}
