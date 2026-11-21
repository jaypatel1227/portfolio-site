import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

export interface VoxelModel {
  width: number;
  height: number;
  depth: number;
  cells: Uint8Array;
}

export function model(width: number, height: number, depth: number): VoxelModel {
  if (![width, height, depth].every((n) => Number.isInteger(n) && n > 0)) {
    throw new RangeError("Voxel dimensions must be positive integers");
  }
  return { width, height, depth, cells: new Uint8Array(width * height * depth) };
}

export function voxel(m: VoxelModel, x: number, y: number, z: number): number {
  if (x < 0 || y < 0 || z < 0 || x >= m.width || y >= m.height || z >= m.depth) return 0;
  return m.cells[(y * m.depth + z) * m.width + x];
}

export function fill(m: VoxelModel, sample: (x: number, y: number, z: number) => number): void {
  for (let y = 0; y < m.height; y++)
    for (let z = 0; z < m.depth; z++)
      for (let x = 0; x < m.width; x++)
        m.cells[(y * m.depth + z) * m.width + x] = sample(x - (m.width - 1) / 2, y, z - (m.depth - 1) / 2);
}

export function pixelTexture(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** One atlas and one merged mesh per model, shared by every instance. */
export function bakeStack(m: VoxelModel, palette: readonly string[]): {
  geometry: THREE.BufferGeometry;
  material: THREE.MeshBasicMaterial;
} {
  const columns = Math.ceil(Math.sqrt(m.height));
  const canvas = document.createElement("canvas");
  canvas.width = columns * m.width;
  canvas.height = Math.ceil(m.height / columns) * m.depth;
  const ctx = canvas.getContext("2d")!;
  const shade = new THREE.Color();
  for (let y = 0; y < m.height; y++) {
    for (let z = 0; z < m.depth; z++) {
      for (let x = 0; x < m.width; x++) {
        const index = voxel(m, x, y, z);
        if (!index) continue;
        if (!palette[index]) throw new RangeError(`Missing voxel palette index ${index}`);
        const edge = !voxel(m, x - 1, y, z) || !voxel(m, x + 1, y, z) ||
          !voxel(m, x, y, z - 1) || !voxel(m, x, y, z + 1);
        shade.set(palette[index]);
        shade.multiplyScalar(edge ? (y % 3 === 0 ? 0.30 : 0.46) : 0.72 + 0.36 * y / m.height);
        if (!edge && !voxel(m, x, y + 1, z)) shade.lerp(new THREE.Color("#98b6c5"), 0.18);
        ctx.fillStyle = `#${shade.getHexString()}`;
        ctx.fillRect((y % columns) * m.width + x, Math.floor(y / columns) * m.depth + z, 1, 1);
      }
    }
  }
  const parts: THREE.BufferGeometry[] = [];
  for (let y = 0; y < m.height; y++) {
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
    if (!voxel(m, x, y, z)) continue;
    for (const [dx, dz] of directions) {
      if (voxel(m, x + dx, y, z + dz)) continue;
      const cx = x - m.width / 2 + 0.5 + dx * 0.5;
      const cz = z - m.depth / 2 + 0.5 + dz * 0.5;
      const points = [[cx - dz * 0.5, y - 0.5, cz + dx * 0.5], [cx + dz * 0.5, y - 0.5, cz - dx * 0.5],
        [cx + dz * 0.5, y + 0.5, cz - dx * 0.5], [cx - dz * 0.5, y + 0.5, cz + dx * 0.5]];
      const u = ((y % columns) * m.width + x + 0.5) / canvas.width;
      const v = 1 - (Math.floor(y / columns) * m.depth + z + 0.5) / canvas.height;
      for (const i of [0, 1, 2, 0, 2, 3]) { positions.push(...points[i]); uvs.push(u, v); }
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
