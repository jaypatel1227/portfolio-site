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
