/** The displaced ground mesh. */
import * as THREE from "three";
import { clamp, makeNoise } from "../math";
import { pathDistance } from "./layout";
import { makeGroundTextures } from "./textures";

export function buildGround(
  scene: THREE.Scene,
  seed: number,
  groundHeightAt: (x: number, z: number) => number
): void {
  const geo = new THREE.PlaneGeometry(360, 360, 220, 220);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const noise = makeNoise(seed ^ 0x44ee);
  const c = new THREE.Color();
  const moss = new THREE.Color(0x3d3828);
  const dirt = new THREE.Color(0x524032);
  const stone = new THREE.Color(0x393333);

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const y = groundHeightAt(x, z);
    pos.setY(i, y);
    const path = pathDistance(x, z);
    const pathMix = 1 - Math.min(1, path / 3.8);
    const patch = noise(x * 0.12, z * 0.12) * 0.5 + 0.5;
    const broad = noise(x * 0.031 + 5.2, z * 0.031 + 2.7) * 0.5 + 0.5;
    const stony = clamp((noise(x * 0.055 + 31, z * 0.055 + 12) - 0.42) * 3.4, 0, 1);
    c.copy(moss).lerp(dirt, pathMix * 0.9 + patch * 0.22);
    c.lerp(new THREE.Color(0x5a4830), (1 - Math.min(1, path / 1.7)) * 0.6);
    c.lerp(stone, stony * 0.5 + clamp((y - 1.2) / 6, 0, 1) * 0.35);
    const shade = (0.7 + patch * 0.5) * (0.82 + broad * 0.4);
    colors[i * 3] = c.r * shade;
    colors[i * 3 + 1] = c.g * shade;
    colors[i * 3 + 2] = c.b * shade;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();

  const { map, normalMap } = makeGroundTextures(seed);
  const mat = new THREE.MeshStandardMaterial({
    map,
    normalMap,
    normalScale: new THREE.Vector2(0.55, 0.55),
    vertexColors: true,
    roughness: 0.98,
    metalness: 0,
    color: 0xffffff,
  });
  const ground = new THREE.Mesh(geo, mat);
  ground.name = "ground";
  scene.add(ground);
}
