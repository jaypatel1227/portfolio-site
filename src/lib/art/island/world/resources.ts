import * as THREE from "three";

export function disposeScene(scene: THREE.Scene): void {
  const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>(), textures = new Set<THREE.Texture>();
  scene.traverse((object) => {
    if (object instanceof THREE.Mesh || object instanceof THREE.Points) geometries.add(object.geometry);
    if (object instanceof THREE.Mesh || object instanceof THREE.Points || object instanceof THREE.Sprite) {
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        materials.add(material);
        for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value);
      }
    }
  });
  for (const resource of [...geometries, ...materials, ...textures]) resource.dispose();
  scene.clear();
}
