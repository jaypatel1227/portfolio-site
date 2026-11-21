/** Far hills behind the treeline. */
import * as THREE from "three";
import { TAU, makeNoise } from "../math";

/**
 * Two rings of far hills that fill the gaps between trunks with hazy
 * silhouettes, so the treeline reads as depth instead of a black wall.
 */
export function buildRidge(scene: THREE.Scene, seed: number): void {
  const layers = [
    { radius: 150, height: 24, base: 0x0a0e15, top: 0x131a25, haze: 0.9 },
    { radius: 96, height: 13, base: 0x0b0f16, top: 0x111823, haze: 0.55 },
  ];
  const noise = makeNoise(seed ^ 0x51dd);
  const noise2 = makeNoise(seed ^ 0x77c1);

  layers.forEach((layer, li) => {
    const segs = 220;
    const positions: number[] = [];
    const colors: number[] = [];
    const baseCol = new THREE.Color(layer.base);
    const topCol = new THREE.Color(layer.top);
    const c = new THREE.Color();
    for (let i = 0; i < segs; i++) {
      const a0 = (i / segs) * TAU;
      const a1 = ((i + 1) / segs) * TAU;
      const h0 =
        layer.height *
        (0.34 +
          0.4 * noise(Math.cos(a0) * 1.8 + li * 4, Math.sin(a0) * 1.8) +
          0.24 * noise2(Math.cos(a0) * 5.1 + 9, Math.sin(a0) * 5.1));
      const h1 =
        layer.height *
        (0.34 +
          0.4 * noise(Math.cos(a1) * 1.8 + li * 4, Math.sin(a1) * 1.8) +
          0.24 * noise2(Math.cos(a1) * 5.1 + 9, Math.sin(a1) * 5.1));
      const r0x = Math.cos(a0) * layer.radius;
      const r0z = Math.sin(a0) * layer.radius;
      const r1x = Math.cos(a1) * layer.radius;
      const r1z = Math.sin(a1) * layer.radius;
      // a quad: base at y=-4, ridge line at y=h
      positions.push(r0x, -6, r0z, r1x, -6, r1z, r1x, h1, r1z);
      positions.push(r0x, -6, r0z, r1x, h1, r1z, r0x, h0, r0z);
      c.copy(baseCol);
      const b = [c.r, c.g, c.b];
      const t = topCol.clone().lerp(baseCol, (1 - layer.haze) * 0.35);
      colors.push(...b, ...b, t.r, t.g, t.b);
      colors.push(...b, t.r, t.g, t.b, ...b);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    const mesh = new THREE.Mesh(
      geo,
      new THREE.MeshBasicMaterial({
        vertexColors: true,
        fog: false,
        side: THREE.DoubleSide,
        depthWrite: true,
      })
    );
    mesh.renderOrder = -6;
    mesh.frustumCulled = false;
    scene.add(mesh);
  });
}
