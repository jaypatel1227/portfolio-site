/** Watchfire sparks, falling ash, ground smoke and distant circling wings. */
import * as THREE from "three";
import { mulberry32, TAU } from "../math";
import { CASTLE, CATHEDRAL } from "./layout";

function particles(scene: THREE.Scene, count: number, color: THREE.Color, size: number, additive: boolean): { positions: Float32Array; fades: Float32Array; geometry: THREE.BufferGeometry } {
  const positions = new Float32Array(count * 3), fades = new Float32Array(count);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute("fade", new THREE.BufferAttribute(fades, 1).setUsage(THREE.DynamicDrawUsage));
  const material = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: color }, uSize: { value: size } },
    vertexShader: `attribute float fade; varying float vFade; uniform float uSize;
      void main() { vec4 p = modelViewMatrix * vec4(position, 1.0);
        vFade = fade * (1.0 - smoothstep(35.0, 155.0, -p.z));
        gl_PointSize = clamp(uSize / max(1.0, -p.z), 1.0, 5.0); gl_Position = projectionMatrix * p; }`,
    fragmentShader: `uniform vec3 uColor; varying float vFade;
      void main() { float r = length(gl_PointCoord - 0.5) * 2.0;
        gl_FragColor = vec4(uColor, (1.0 - smoothstep(0.1, 1.0, r)) * vFade); }`,
    transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
  });
  const points = new THREE.Points(geometry, material); points.frustumCulled = false; scene.add(points);
  return { positions, fades, geometry };
}

export function buildAtmosphere(scene: THREE.Scene, seed: number, fires: readonly THREE.Vector3[], heightAt: (x: number, z: number) => number): { update(camera: THREE.Camera, time: number): void } {
  const rng = mulberry32(seed ^ 0xa54);
  const sources = [...fires];
  for (let i = 0; i < 4; i++) sources.push(new THREE.Vector3(CATHEDRAL.x - 4 + rng() * 8, 13 + rng() * 3, CATHEDRAL.z - i * 4));
  const sparks = particles(scene, sources.length * 22, new THREE.Color(2.2, 0.44, 0.045), 29, true);
  const sparkSeeds = Array.from({ length: sparks.fades.length }, () => ({ phase: rng(), speed: 0.13 + rng() * 0.12, angle: rng() * TAU, drift: 0.4 + rng() * 1.3 }));
  const ash = particles(scene, 420, new THREE.Color(0.38, 0.4, 0.44), 18, false);
  const ashSeeds = Array.from({ length: ash.fades.length }, () => ({ x: -66 + rng() * 132, z: -74 + rng() * 116, phase: rng(), speed: 0.02 + rng() * 0.025 }));

  const canvas = document.createElement("canvas"); canvas.width = 128; canvas.height = 32;
  const ctx = canvas.getContext("2d")!;
  for (let y = 0; y < 32; y++) for (let x = 0; x < 128; x++) {
    const edge = Math.sin(x / 127 * Math.PI) * Math.sin(y / 31 * Math.PI);
    ctx.fillStyle = `rgba(135,141,159,${edge * edge * (0.25 + rng() * 0.22)})`;
    ctx.fillRect(x, y, 1, 1);
  }
  const map = new THREE.CanvasTexture(canvas);
  const sheets = [[-5, 8], [17, 1], [-2, -15], [30, -18], [13, -25], [12, -39], [0, -43], [29, -40]].map(([x, z], i) => {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(19 + i % 3 * 5, 1.8 + i % 2), new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, opacity: 0.23, side: THREE.DoubleSide }));
    mesh.position.set(x, heightAt(x, z) + 0.6, z); scene.add(mesh);
    return { mesh, x, z, phase: rng() * TAU };
  });

  const wingGeo = new THREE.BufferGeometry();
  wingGeo.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0, 0.9, 0, -0.2, 0.46, 0, 0.22], 3)); wingGeo.computeVertexNormals();
  const feathers = new THREE.MeshBasicMaterial({ color: 0x04050a, side: THREE.DoubleSide });
  const birds = Array.from({ length: 7 }, (_, i) => {
    const group = new THREE.Group();
    const left = new THREE.Mesh(wingGeo, feathers), right = new THREE.Mesh(wingGeo, feathers); right.scale.x = -1;
    const body = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.7, 4), feathers); body.rotation.x = Math.PI / 2;
    group.add(left, right, body); group.scale.setScalar(i < 5 ? 0.85 : 1.6); scene.add(group);
    return { group, left, right, phase: rng() * TAU, radius: 10 + rng() * 11, castle: i >= 5 };
  });
  return { update(camera, time) {
    sparkSeeds.forEach((s, i) => {
      const life = (s.phase + time * s.speed) % 1, source = sources[Math.floor(i / 22)];
      sparks.positions[i * 3] = source.x + Math.sin(s.angle + life * 4 + time * 0.3) * life * s.drift;
      sparks.positions[i * 3 + 1] = source.y + life * 5.5;
      sparks.positions[i * 3 + 2] = source.z + Math.cos(s.angle + life * 3) * life * s.drift;
      sparks.fades[i] = Math.sin(life * Math.PI) * (0.5 + Math.sin(time * 13 + i) * 0.3);
    });
    ashSeeds.forEach((s, i) => {
      const life = (s.phase + time * s.speed) % 1;
      ash.positions[i * 3] = s.x + Math.sin(time * 0.12 + i) * 2.5;
      ash.positions[i * 3 + 1] = heightAt(s.x, s.z) + (1 - life) * 19;
      ash.positions[i * 3 + 2] = s.z + Math.cos(time * 0.08 + i) * 1.5;
      ash.fades[i] = Math.sin(life * Math.PI) * 0.45;
    });
    for (const system of [sparks, ash]) { system.geometry.attributes.position.needsUpdate = true; system.geometry.attributes.fade.needsUpdate = true; }
    for (const { mesh, x, z, phase } of sheets) {
      mesh.position.x = x + Math.sin(time * 0.045 + phase) * 2;
      mesh.position.z = z + Math.cos(time * 0.035 + phase);
      mesh.lookAt(camera.position.x, mesh.position.y, camera.position.z);
    }
    for (const { group, left, right, phase, radius, castle } of birds) {
      const centre = castle ? CASTLE : CATHEDRAL, angle = time * (castle ? 0.055 : 0.08) + phase;
      group.position.set(centre.x + Math.cos(angle) * radius, centre.y + (castle ? 45 : 27) + Math.sin(angle * 2) * 1.8, centre.z + Math.sin(angle) * radius);
      group.rotation.y = -angle; group.rotation.z = 0.15;
      const flap = Math.sin(time * 4.8 + phase) * 0.65;
      left.rotation.z = flap; right.rotation.z = -flap;
    }
  } };
}
