import * as THREE from "three";
import type { AnimationSystem, Frame } from "./types";

export function createFireflies(scene: THREE.Scene, rng: () => number): AnimationSystem {
  const points = new Float32Array(65 * 3);
  const origins = Array.from({ length: 65 }, () => ({ x: (rng() - 0.5) * 26, z: (rng() - 0.5) * 23, y: 0.4 + rng() * 2.5 }));
  const flies = new THREE.BufferGeometry();
  flies.setAttribute("position", new THREE.BufferAttribute(points, 3));
  scene.add(new THREE.Points(flies, new THREE.PointsMaterial({ color: 0xffdda2, size: 1.6, sizeAttenuation: false })));
  let idle = 0;
  return { update({ time, player, motion, dt }: Frame) {
      idle = motion > 0.1 ? 0 : idle + dt;
      const gather = THREE.MathUtils.clamp((idle - 2) / 5, 0, 0.85);
      origins.forEach((o, i) => {
        const blend = i < 24 ? gather : 0;
        points.set([THREE.MathUtils.lerp(o.x, player.x + Math.sin(i * 2 + time * 0.6) * 1.6, blend) + Math.sin(time * 0.4 + i) * 0.35,
          o.y + Math.sin(time * 0.7 + i) * 0.2, THREE.MathUtils.lerp(o.z, player.z + Math.cos(i * 2 + time * 0.5) * 1.6, blend) + Math.cos(time * 0.3 + i) * 0.35], i * 3);
      });
      flies.attributes.position.needsUpdate = true;
      flies.computeBoundingSphere();
  } };
}
