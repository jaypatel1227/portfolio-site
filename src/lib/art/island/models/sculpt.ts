import { model } from "../voxel/grid";

export type XYZ = [number, number, number];

/** Local integer coordinates: X/Z centered, Y measured up from the floor. */
export function sculpture(width: number, height: number, depth: number) {
  const voxels = model(width, height, depth), palette = ["#000000"];
  const ox = Math.floor(width / 2), oz = Math.floor(depth / 2);
  const inks = new Map<string, number>();
  function dot(x: number, y: number, z: number, color: string) {
    x = Math.round(x) + ox; z = Math.round(z) + oz; y = Math.round(y);
    if (x < 0 || x >= width || y < 0 || y >= height || z < 0 || z >= depth) return;
    let ink = inks.get(color);
    if (ink === undefined) { ink = palette.push(color) - 1; inks.set(color, ink); }
    voxels.cells[(y * depth + z) * width + x] = ink;
  }
  function box(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, color: string) {
    for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) dot(x, y, z, color);
  }
  function orb([cx, cy, cz]: XYZ, [rx, ry, rz]: XYZ, ink: string | ((x: number, y: number, z: number) => string | null)) {
    for (let y = -ry; y <= ry; y++) for (let z = -rz; z <= rz; z++) for (let x = -rx; x <= rx; x++) {
      if ((x / rx) ** 2 + (y / ry) ** 2 + (z / rz) ** 2 > 1) continue;
      const color = typeof ink === "string" ? ink : ink(x, y, z);
      if (color) dot(cx + x, cy + y, cz + z, color);
    }
  }
  function rod(a: XYZ, b: XYZ, radius: number, color: string) {
    const n = Math.max(1, ...a.map((q, i) => Math.abs(b[i] - q))) * 2;
    for (let i = 0; i <= n; i++) {
      const p: XYZ = [0, 1, 2].map((j) => Math.round(a[j] + (b[j] - a[j]) * i / n)) as XYZ;
      if (radius) orb(p, [radius, radius, radius], color);
      else dot(...p, color);
    }
  }
  return { voxels, palette, dot, box, orb, rod };
}
export type Sculpture = ReturnType<typeof sculpture>;
