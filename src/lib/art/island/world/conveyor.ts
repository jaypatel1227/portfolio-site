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
      const inset = edge * 0.78, lip = h + 0.023;
      quad(vertex(a, edge, 0.01), vertex(b, edge, 0.01), vertex(b, edge, lip), vertex(a, edge, lip), i % 4 ? "#393b3d" : "#64584a");
      quad(vertex(a, edge, lip), vertex(b, edge, lip), vertex(b, inset, lip), vertex(a, inset, lip),
        i % 4 === 0 ? "#a49a70" : i % 4 === 3 ? "#494f4d" : "#728077");
      quad(vertex(a, inset, lip), vertex(b, inset, lip), vertex(b, inset, h), vertex(a, inset, h), "#383a3f");
    }
    quad(vertex(a, -w * 0.78, h), vertex(b, -w * 0.78, h), vertex(b, w * 0.78, h), vertex(a, w * 0.78, h),
      i % 2 ? "#434746" : "#595a52");
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  scene.add(new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide })));

  // Shared articulated tread: raised shoulders catch light, with an inset
  // direction mark on every sixth link. All links travel with the rider.
  const marker = new THREE.BufferGeometry(), outline: number[] = [], tones: number[] = [];
  function ribbon(start: number, end: number, span: number, y: number, ink: string) {
    shade.set(ink);
    for (const side of [-1, 1]) {
      const outer = side * span, sweep = span * 0.52;
      for (const [x, z] of [[0,start],[outer,start-sweep],[outer,end-sweep],[0,start],[outer,end-sweep],[0,end]]) {
        outline.push(x, y, z); tones.push(shade.r, shade.g, shade.b);
      }
    }
  }
  ribbon(-0.035, 0.13, w * 0.71, 0, "#565452");
  ribbon(0.078, 0.12, w * 0.67, 0.004, "#837d70");
  ribbon(-0.005, 0.086, w * 0.31, 0.008, "#c8c2ae");
  marker.setAttribute("position", new THREE.Float32BufferAttribute(outline, 3));
  marker.setAttribute("color", new THREE.Float32BufferAttribute(tones, 3));
  const marks = new THREE.InstancedMesh(marker, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }), 36);
  for (let i = 0; i < marks.count; i++) marks.setColorAt(i, shade.set(i % 6 ? "#a49f96" : "#83c45d"));
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
