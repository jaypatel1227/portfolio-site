import * as THREE from "three";

export function createLodSwap(low: THREE.InstancedMesh, high: THREE.InstancedMesh, originals: readonly THREE.Matrix4[]) {
  if (originals.length > low.count || originals.length > high.count) throw new RangeError("LOD capacity is too small");
  const previous = new Uint8Array(originals.length), zero = new THREE.Matrix4().makeScale(0, 0, 0);
  let initial = true;
  return (selected: readonly boolean[]): void => {
    if (selected.length !== originals.length) throw new RangeError("LOD selection must match instances");
    let anyLow = false, anyHigh = false, dirty = initial;
    for (let i = 0; i < originals.length; i++) {
      const close = selected[i];
      anyHigh ||= close; anyLow ||= !close;
      if (initial || previous[i] !== Number(close)) {
        low.setMatrixAt(i, close ? zero : originals[i]);
        high.setMatrixAt(i, close ? originals[i] : zero);
        previous[i] = Number(close); dirty = true;
      }
    }
    low.visible = anyLow; high.visible = anyHigh;
    if (dirty) { low.instanceMatrix.needsUpdate = true; high.instanceMatrix.needsUpdate = true; }
    initial = false;
  };
}
