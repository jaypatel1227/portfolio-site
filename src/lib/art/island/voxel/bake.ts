import { voxel, type VoxelModel } from "./grid";
import { finish } from "./steps";
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

export function pixelTexture(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** One atlas and one merged mesh per model, shared by every instance. */
export function bakeStack(m: VoxelModel, palette: readonly string[], options?: { topTint?: number }) {
  return finish(bakeLayers(m, palette, options));
}

export function* bakeLayers(m: VoxelModel, palette: readonly string[], { topTint = 0.18 }: { topTint?: number } = {}) {
  if (!Number.isFinite(topTint) || topTint < 0 || topTint > 1) throw new RangeError("Top tint must be between zero and one");
  const columns = Math.ceil(Math.sqrt(m.height));
  const canvas = document.createElement("canvas");
  canvas.width = columns * m.width;
  canvas.height = Math.ceil(m.height / columns) * m.depth;
  const ctx = canvas.getContext("2d")!;
  const image = ctx.createImageData(canvas.width, canvas.height);
  const sky = new THREE.Color("#98b6c5"), shade = new THREE.Color();
  for (let y = 0; y < m.height; y++) {
    const colors = palette.map((color) => {
      const edge = shade.set(color).multiplyScalar(y % 3 === 0 ? 0.30 : 0.46).getHex();
      const inside = shade.set(color).multiplyScalar(0.72 + 0.36 * y / m.height).getHex();
      return [edge, inside, shade.lerp(sky, topTint).getHex()];
    });
    for (let z = 0; z < m.depth; z++) {
      if (z % 16 === 0) yield;
      for (let x = 0; x < m.width; x++) {
        const index = voxel(m, x, y, z);
        if (!index) continue;
        if (!palette[index]) throw new RangeError(`Missing voxel palette index ${index}`);
        const edge = !voxel(m, x - 1, y, z) || !voxel(m, x + 1, y, z) ||
          !voxel(m, x, y, z - 1) || !voxel(m, x, y, z + 1);
        const rgb = colors[index][edge ? 0 : voxel(m, x, y + 1, z) ? 1 : 2];
        const p = ((Math.floor(y / columns) * m.depth + z) * canvas.width + (y % columns) * m.width + x) * 4;
        image.data[p] = rgb >> 16; image.data[p + 1] = rgb >> 8 & 255;
        image.data[p + 2] = rgb & 255; image.data[p + 3] = 255;
      }
    }
  }
  ctx.putImageData(image, 0, 0);
  const parts: THREE.BufferGeometry[] = [];
  // Our camera is always above the island. Let the top slices write depth first.
  for (let y = m.height - 1; y >= 0; y--) {
    const plane = new THREE.PlaneGeometry(m.width, m.depth);
    plane.rotateX(-Math.PI / 2);
    plane.translate(0, y + 0.5, 0);
    const uv = plane.attributes.uv;
    for (let i = 0; i < uv.count; i++) {
      uv.setXY(i, ((y % columns) * m.width + uv.getX(i) * m.width) / canvas.width,
        1 - (Math.floor(y / columns) * m.depth + (1 - uv.getY(i)) * m.depth) / canvas.height);
    }
    parts.push(plane);
  }
  // Side faces keep tiny stacks solid while the camera orbits.
  const positions: number[] = [];
  const uvs: number[] = [];
  const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (let y = 0; y < m.height; y++) for (let z = 0; z < m.depth; z++) for (let x = 0; x < m.width; x++) {
    if (!x && z % 16 === 0) yield;
    if (!voxel(m, x, y, z)) continue;
    for (const [dx, dz] of directions) {
      if (voxel(m, x + dx, y, z + dz)) continue;
      // A straight run shares a quad, but samples each original texel along it.
      const sx = Math.abs(dz), sz = Math.abs(dx);
      const exposed = (n: number) => voxel(m, x + n * sx, y, z + n * sz) && !voxel(m, x + n * sx + dx, y, z + n * sz + dz);
      if (exposed(-1)) continue;
      let length = 1;
      while (exposed(length)) length++;
      for (const [along, up] of [[0, 0], [length, 0], [length, 1], [0, 0], [length, 1], [0, 1]]) {
        const u = x + 0.5 + (along - 0.5) * sx, v = z + 0.5 + (along - 0.5) * sz;
        positions.push(u - m.width / 2 + dx * 0.5, y - 0.5 + up, v - m.depth / 2 + dz * 0.5);
        uvs.push(((y % columns) * m.width + u) / canvas.width, 1 - (Math.floor(y / columns) * m.depth + v) / canvas.height);
      }
    }
  }
  const walls = new THREE.BufferGeometry();
  walls.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  walls.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  const surfaces = parts.map((p) => { const g = p.toNonIndexed(); g.deleteAttribute("normal"); return g; });
  const geometry = mergeGeometries([...surfaces, walls]);
  for (const p of [...parts, ...surfaces, walls]) p.dispose();
  return { geometry, material: new THREE.MeshBasicMaterial({ map: pixelTexture(canvas), alphaTest: 0.5, side: THREE.DoubleSide }) };
}
