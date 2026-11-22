import * as THREE from "three";
import type { Obstacle, Point } from "../math";
import { bonfire, fieldKit, obol, placeSetting, plasmaBlade, stool, teleporter } from "../models/relics";
import { cardFan, jokerCard } from "../models/cards";
import { orrery } from "../models/orrery";
import type { Sculpture } from "../models/sculpt";
import { solidLayers } from "../voxel/solid";
import { approachReveal } from "../voxel/reveal-math";
import { advance } from "./work";

interface Exhibit extends Obstacle {
  make: () => Sculpture; accent?: () => Sculpture; scale: number; angle?: number; y?: number;
}
const exhibits: Exhibit[] = [
  { make: orrery, r: 1.86, x: -4.6, z: 13.6, scale: 0.038 },
  { make: bonfire, r: 0.56, x: 8.1, z: -6, scale: 0.043 },
  { make: plasmaBlade, r: 0.72, x: 8.4, z: 6.4, scale: 0.034, angle: 0.35 },
  { make: teleporter, r: 0.94, x: -11.3, z: -4.5, scale: 0.041 },
  { make: cardFan, accent: jokerCard, r: 1.3, x: -5.2, z: 7.6, scale: 0.036, angle: 0.4 },
  { make: obol, r: 0.22, x: -10.1, z: 3.1, scale: 0.03, y: 0.066 },
  { make: fieldKit, r: 0.48, x: 11.65, z: 2.0, scale: 0.033, angle: 0.45 },
  { make: placeSetting, r: 1.2, x: 9.45, z: 1.62, scale: 0.043, angle: -0.1 },
  { make: stool, r: 0.34, x: 9.2, z: 2.65, scale: 0.042, angle: -0.22 },
];

export const exhibitFootprints: readonly Obstacle[] = exhibits;

function* buildParts(e: Exhibit) {
  const bake = function* (make: () => Sculpture) {
    const { voxels, palette } = make();
    return yield* solidLayers(voxels, palette);
  };
  const base = yield* bake(e.make);
  return { base, accent: e.accent ? yield* bake(e.accent) : null };
}

export function createCollection(scene: THREE.Scene) {
  const entries = exhibits.map((e) => ({ ...e, mesh: null as THREE.Mesh | null, moving: null as THREE.Mesh | null, work: null as ReturnType<typeof buildParts> | null, amount: 0 }));
  const near = (p: Point, e: Exhibit) => Math.hypot(p.x - e.x, p.z - e.z) < 9;
  let material: THREE.MeshBasicMaterial | undefined;
  return {
    pending(p: Point) { return entries.some((e) => !e.mesh && near(p, e)); },
    build(p: Point, end: number) {
      const e = entries.find((item) => !item.mesh && near(p, item));
      if (!e) return;
      e.work ??= buildParts(e);
      const step = advance(e.work, end);
      if (!step.done) return;
      e.work = null;
      material ??= new THREE.MeshBasicMaterial({ vertexColors: true });
      e.mesh = new THREE.Mesh(step.value.base, material);
      if (step.value.accent) {
        e.moving = new THREE.Mesh(step.value.accent, material);
        e.mesh.add(e.moving);
      }
      e.mesh.position.set(e.x, e.y ?? e.scale / 2, e.z);
      e.mesh.rotation.y = e.angle ?? 0; e.mesh.visible = false;
      scene.add(e.mesh);
    },
    update(amount: number, p: Point, dt: number, time: number) {
      for (const e of entries) if (e.mesh) {
        e.amount = approachReveal(e.amount, near(p, e) ? amount : 0, dt, 0.38);
        e.mesh.visible = e.amount > 0;
        e.mesh.scale.setScalar(e.amount * e.scale);
        if (e.moving && e.mesh.visible) {
          const pop = Math.max(0, Math.sin(time * 1.9)) ** 6;
          e.moving.position.y = 4 * pop;
          e.moving.rotation.z = -0.085 * pop;
          e.moving.rotation.y = 0.055 * Math.sin(time * 1.9);
        }
      }
    },
  };
}
