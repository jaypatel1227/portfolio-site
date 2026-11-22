import * as THREE from "three";
import { TRACK, trackPoint } from "./circuit";

export function addConveyor(scene: THREE.Scene) {
  const positions: number[] = [], colors: number[] = [];
  const shade = new THREE.Color(), w = TRACK.halfWidth, h = TRACK.height;
  type Vertex = [number, number, number];
  function vertex(s: number, offset: number, y: number): Vertex {
    const p = trackPoint(s, offset); return [p.x, y, p.z];
  }
  function quad(a: Vertex, b: Vertex, c: Vertex, d: Vertex, ink: string) {
    shade.set(ink);
    for (const p of [a, b, c, a, c, d]) { positions.push(...p); colors.push(shade.r, shade.g, shade.b); }
  }
  const segments = 64;
  for (let i = 0; i < segments; i++) {
    const a = TRACK.length * i / segments, b = TRACK.length * (i + 1) / segments;
    for (const edge of [-w, w]) {
      const inset = edge * 0.78;
      quad(vertex(a, edge, 0.01), vertex(b, edge, 0.01), vertex(b, edge, h), vertex(a, edge, h), "#374746");
      quad(vertex(a, edge, h), vertex(b, edge, h), vertex(b, inset, h), vertex(a, inset, h),
        i % 4 === 0 ? "#9ba58a" : i % 4 === 3 ? "#385c50" : "#61916c");
    }
    quad(vertex(a, -w * 0.78, h), vertex(b, -w * 0.78, h), vertex(b, w * 0.78, h), vertex(a, w * 0.78, h),
      i % 2 ? "#444b4c" : "#555d59");
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  scene.add(new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide })));

  // Paired green turbo chevrons travel at the rider's speed, including through bends.
  const marker = new THREE.BufferGeometry(), outline: number[] = [];
  for (const lane of [-0.15, 0.15]) {
    for (const [x, z] of [[-0.11,-0.09], [0,0.02], [0,0.11], [-0.11,-0.09], [0,0.11], [-0.11,0],
      [0,0.02], [0.11,-0.09], [0.11,0], [0,0.02], [0.11,0], [0,0.11]]) outline.push(lane + x, 0, z);
  }
  marker.setAttribute("position", new THREE.Float32BufferAttribute(outline, 3));
  const marks = new THREE.InstancedMesh(marker, new THREE.MeshBasicMaterial({ color: "#86b77a", side: THREE.DoubleSide }), 20);
  marks.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(marks);
  const pose = new THREE.Object3D();
  function paint(s: number) {
    for (let i = 0; i < marks.count; i++) {
      const along = s + i * TRACK.length / marks.count, at = trackPoint(along), next = trackPoint(along + 0.001);
      pose.position.set(at.x, h + 0.003, at.z); pose.rotation.y = Math.atan2(next.x - at.x, next.z - at.z);
      pose.updateMatrix(); marks.setMatrixAt(i, pose.matrix);
    }
    marks.instanceMatrix.needsUpdate = true;
  }
  paint(0); marks.computeBoundingSphere();
  marks.boundingSphere!.radius += TRACK.length / marks.count;
  let travel = 0;
  return (dt: number) => {
    if (!dt) return;
    travel = (travel + TRACK.speed * dt) % TRACK.length; paint(travel);
  };
}
