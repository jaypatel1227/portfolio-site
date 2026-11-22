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
  const colors = Array.from({ length: m.height }, (_, layer) => palette.map((color) => {
    const edge = shade.set(color).multiplyScalar(layer % 3 === 0 ? 0.30 : 0.46).getHex();
    const inside = shade.set(color).multiplyScalar(0.72 + 0.36 * layer / m.height).getHex();
    return [edge, inside, shade.lerp(sky, topTint).getHex()];
  }));
  const mesh = surfaceMesh(m), uv: number[] = [], p = [0, 0, 0];
  for (let n = 0; n < faces.length; n++) {
    if (n % 128 === 0) yield;
    const f = faces[n], u = (f.d + 1) % 3, v = (f.d + 2) % 3;
    place(f);
    const left = x - f.w;
    for (let j = 0; j < f.h; j++) for (let i = 0; i < f.w; i++) {
      p[f.d] = f.layer; p[u] = f.i + i; p[v] = f.j + j;
      const [vx, vy, vz] = p, index = voxel(m, vx, vy, vz);
      if (!colors[vy][index]) throw new RangeError(`Missing voxel palette index ${index}`);
      const edge = f.d !== 1 || !voxel(m, vx - 1, vy, vz) || !voxel(m, vx + 1, vy, vz) ||
        !voxel(m, vx, vy, vz - 1) || !voxel(m, vx, vy, vz + 1);
      const c = colors[vy][index][edge ? 0 : voxel(m, vx, vy + 1, vz) ? 1 : 2];
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
