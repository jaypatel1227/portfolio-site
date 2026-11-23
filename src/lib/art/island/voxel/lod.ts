import * as THREE from "three";

export function normalizeLodGeometry(geometry: THREE.BufferGeometry, density: number): void {
  if (density <= 0) throw new RangeError("LOD density must be positive");
  geometry.scale(1 / density, 1 / density, 1 / density).translate(0, (1 / density - 1) / 2, 0);
}

export function createLodSwap(low: THREE.InstancedMesh, high: THREE.InstancedMesh | null, originals: readonly THREE.Matrix4[]) {
  if (originals.length > low.instanceMatrix.count || (high && originals.length > high.instanceMatrix.count)) throw new RangeError("LOD capacity is too small");
  const previous = new Uint8Array(originals.length);
  let initial = true;
  return (selected: readonly boolean[], visible?: readonly boolean[]): void => {
    if (selected.length !== originals.length) throw new RangeError("LOD selection must match instances");
    const level = (i: number) => visible && !visible[i] ? 0 : high && selected[i] ? 2 : 1;
    if (!initial && !selected.some((_, i) => level(i) !== previous[i])) return;
    let lowCount = 0, highCount = 0;
    for (let i = 0; i < originals.length; i++) {
      const lod = level(i);
      if (lod === 2) high!.setMatrixAt(highCount++, originals[i]);
      if (lod === 1) low.setMatrixAt(lowCount++, originals[i]);
      previous[i] = lod;
    }
    low.count = lowCount; low.visible = lowCount > 0; low.instanceMatrix.needsUpdate = true;
    if (high) {
      high.count = highCount; high.visible = highCount > 0; high.instanceMatrix.needsUpdate = true;
    }
    initial = false;
  };
}
