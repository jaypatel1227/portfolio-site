import * as THREE from "three";
import { voxel, type VoxelModel } from "./grid";
import { finish } from "./steps";
import { surfaceLayers, surfaceMesh, type Face } from "./surface";

function pixelFilters(texture: THREE.Texture) {
  texture.magFilter = texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = THREE.SRGBColorSpace;
}

export function pixelTexture(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(canvas);
  pixelFilters(texture);
  return texture;
}

export function bakeStack(m: VoxelModel, palette: readonly string[], options?: { topTint?: number }) {
  return finish(bakeLayers(m, palette, options));
}

/** Paint the stack's bands onto its outer shell, not a full alpha-tested plane per slice. */
export function* bakeLayers(m: VoxelModel, palette: readonly string[], { topTint = 0.18 }: { topTint?: number } = {}) {
  if (!Number.isFinite(topTint) || topTint < 0 || topTint > 1) throw new RangeError("Top tint must be between zero and one");
  const faces: Face[] = [];
  let area = 0, widest = 1;
  yield* surfaceLayers(m, false, (f) => {
    faces.push(f); area += f.w * f.h; widest = Math.max(widest, f.w);
  });

  // Tallest shelves first; nearest filtering without mipmaps needs no gutters.
  faces.sort((a, b) => b.h - a.h);
  const width = Math.max(widest, Math.ceil(Math.sqrt(area)));
  let x = 0, y = 0, row = 0;
  function place(f: Face) {
    if (x + f.w > width) { x = 0; y += row; row = 0; }
    x += f.w; row = Math.max(row, f.h);
  }
  for (const f of faces) place(f);
  const height = Math.max(1, y + row), pixels = new Uint8Array(4 * width * height);
  x = y = row = 0;
  const sky = new THREE.Color("#98b6c5"), shade = new THREE.Color();
  // A soft key from above/front separates planes without painting dark rings
  // across faces, fur or glass. Bake the overhang shadows into the same atlas.
  const light = [0.70, 0.82, 0.58, 1, 0.64, 0.92];
  const inks = palette.map(color => new THREE.Color(color));
  // Cache only combinations present on the shell; zero means not painted yet.
  const colors = new Uint32Array(m.height * inks.length * 12);
  const mesh = surfaceMesh(m), uv: number[] = [], p = [0, 0, 0];
  for (let n = 0; n < faces.length; n++) {
    if (n % 128 === 0) yield;
    const f = faces[n], u = (f.d + 1) % 3, v = (f.d + 2) % 3;
    place(f);
    const left = x - f.w, side = f.d * 2 + Number(f.sign > 0);
    for (let j = 0; j < f.h; j++) for (let i = 0; i < f.w; i++) {
      p[f.d] = f.layer; p[u] = f.i + i; p[v] = f.j + j;
      const [vx, vy, vz] = p, index = voxel(m, vx, vy, vz);
      if (index >= inks.length) throw new RangeError(`Missing voxel palette index ${index}`);
      const overhang = f.d !== 1 && voxel(m, vx + (f.d === 0 ? f.sign : 0), vy + 1, vz + (f.d === 2 ? f.sign : 0));
      const key = ((vy * inks.length + index) * 6 + side) * 2 + Number(!!overhang);
      if (!colors[key]) {
        shade.copy(inks[index]).multiplyScalar(light[side] * (0.88 + 0.18 * vy / m.height));
        if (side === 3) shade.lerp(sky, topTint * 0.55);
        else if (vy % 3 === 0) shade.multiplyScalar(0.95);
        if (overhang) shade.multiplyScalar(0.72);
        colors[key] = shade.getHex() + 1;
      }
      const c = colors[key] - 1;
      const k = ((y + j) * width + left + i) * 4;
      pixels[k] = c >> 16; pixels[k + 1] = c >> 8; pixels[k + 2] = c; pixels[k + 3] = 255;
    }
    mesh.quad(f);
    uv.push(left / width, y / height, x / width, y / height, x / width, (y + f.h) / height, left / width, (y + f.h) / height);
  }
  const texture = new THREE.DataTexture(pixels, width, height);
  pixelFilters(texture); texture.needsUpdate = true;
  const geometry = mesh.finish();
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  return { geometry, material: new THREE.MeshBasicMaterial({ map: texture }) };
}
