import { fill, model } from "../voxel/grid";

export function fox() {
  const m = model(27, 19, 13);
  fill(m, (x, y, z) => {
    const az = Math.abs(z), tail = x + 8;
    if (x < -4 && (tail / 6) ** 2 + ((y - 11 + tail * 0.72) / 3.4) ** 2 + ((z + 1) / 3.3) ** 2 < 1.2) return x + Math.floor(z / 2) < -10 ? 21 : y < 9 ? 4 : 16;
    if (x >= 4 && x <= 9 && y >= 10 && y <= 12 && az <= 4 - Number(y === 10)) return 21;
    if (Math.abs(x) >= 4 && Math.abs(x) <= 6 && az >= 2 && az <= 3 && y < 7) return y < 4 ? 2 : 16;
    if (((x + 0.5) / 8) ** 2 + ((y - 8) / 4.6) ** 2 + (z / 4) ** 2 < 1) return y < 7 || x > 4 && y < 9 ? 21 : 16;
    if (x >= 4 && x <= 10 && y >= 10 && y <= 15 && az <= 3) return x >= 8 && y === 13 && az === 3 ? 2 : y < 12 ? 21 : 16;
    if (x > 9 && x <= 13 && y >= 10 && y <= 12 && az < (14 - x) * 0.7) return x > 11 ? 2 : 21;
    if (x >= 4 && x <= 7 && y >= 15 && y <= 18 && Math.abs(az - 3) <= (18 - y) * 0.65) return y >= 17 ? 2 : x >= 6 ? 20 : 16;
    return 0;
  });
  return m;
}

export function rabbit() {
  const m = model(13, 22, 15);
  fill(m, (x, y, z) => {
    const ax = Math.abs(x);
    if (z < -4 && x*x + (y-6)**2 + (z+6)**2 < 8) return 21;
    if (ax >= 3 && ((ax - 3) / 2.3) ** 2 + ((y - 5) / 4.3) ** 2 + ((z + 2) / 3.5) ** 2 < 1) return y < 4 ? 11 : 21;
    if (y < 3 && ax >= 2 && ax <= 4 && z >= -3 && z < 5) return 11;
    if ((x / 5) ** 2 + ((y - 6) / 6) ** 2 + ((z + 1) / 5.5) ** 2 < 1) return y < 4 || z < -2 ? 11 : 21;
    if (ax < 3 && y >= 9 && y <= 11 && z === 6) return ax === 0 && y === 11 ? 20 : 21;
    if (ax < 4 && y > 8 && y < 15 && z > 0 && z < 6) return y === 12 && ax >= 2 && z > 3 ? 2 : 21;
    const earZ = z - (x < 0 ? 2 - Math.floor((y-14) / 3) : 2);
    if (y >= 14 && y <= (x < 0 ? 20 : 21) && Math.abs(ax - 2.5) <= 1 && Math.abs(earZ) <= 1) return earZ === 1 && y < 20 ? 20 : 21;
    return 0;
  });
  return m;
}

export function owl(head: boolean, blink = false) {
  const m = head ? model(15, 12, 13) : model(13, 15, 11);
  fill(m, (x, y, z) => {
    if (head && Math.abs(x) >= 4 && y > 8 && y < 12 && Math.abs(z) < 2 && Math.abs(x) + 7 >= y) return 3;
    if ((x / (head ? 7 : 6)) ** 2 + ((y - 6) / 7) ** 2 + (z / 5) ** 2 > 1) return 0;
    if (head && z >= 2 && ((Math.abs(x) - 3) / 3) ** 2 + ((y - 6) / 3.2) ** 2 < 1) {
      if (blink) return y === 6 ? 3 : 21;
      return Math.abs(x) === 3 && (y === 6 || y === 7) ? 2 : y >= 5 && y <= 7 ? 17 : 21;
    }
    if (head && z > 3 && Math.abs(x) < 2 && y < 6) return 16;
    if (!head && Math.abs(x) >= 3 && y < 10) return (y - z) % 5 === 0 ? 4 : 3;
    return z > 1 && Math.abs(x) < 4 ? !head && y % 4 === 0 ? 11 : 21 : 4;
  });
  return m;
}

export function fish() {
  const m = model(17, 7, 7);
  fill(m, (x, y, z) => {
    if ((x / 6) ** 2 + ((y - 3) / 3) ** 2 + (z / 3) ** 2 < 1) return x === 4 && y === 4 && Math.abs(z) >= 1 ? 2 : x === 2 && y > 2 ? 16 : y > 3 ? 17 : 21;
    if (Math.abs(z) === 2 && x >= -2 && x <= 0 && y === 2) return 16;
    if (z === 0 && x >= -3 && x <= 0 && y >= 4 && y <= 6) return 16;
    return x < -4 && z === 0 && Math.abs(y - 3) <= (-x - 4) * 0.85 && !(x === -8 && y === 3) ? 16 : 0;
  });
  return m;
}
