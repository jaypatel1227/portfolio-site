import * as THREE from "three";
import { cycle } from "./math";
import type { AnimationSystem, Frame } from "./types";

export function createShooting(seed: number, sky: THREE.Group): AnimationSystem {
  const shootingGeometry = new THREE.BufferGeometry();
  const shootingPositions = new Float32Array(12 * 3);
  shootingGeometry.setAttribute("position", new THREE.BufferAttribute(shootingPositions, 3));
  const shootingStar = new THREE.Points(shootingGeometry, new THREE.PointsMaterial({ color: 0xc0e8db, size: 1.7, sizeAttenuation: false, depthWrite: false }));
  shootingStar.frustumCulled = false; sky.add(shootingStar);
  let skyLeft = -20, skyTop = 16, skyWidth = 40, skyHeight = 32;

  return {
    setView(camera: THREE.OrthographicCamera) {
      skyLeft = camera.left; skyTop = camera.top; skyWidth = camera.right - camera.left; skyHeight = camera.top - camera.bottom;
    },
    update({ time }: Frame) {
      const streak = cycle(time + seed % 11, 19) * 19;
      shootingStar.visible = streak < 1.1;
      for (let i = 0; i < 12; i++) {
        const t = streak - i * 0.012;
        shootingPositions.set([skyLeft + skyWidth * (0.85 - t * 0.5), skyTop - skyHeight * (0.045 + t * 0.27), -149], i * 3);
      }
      shootingGeometry.attributes.position.needsUpdate = true;
    },
  };
}
