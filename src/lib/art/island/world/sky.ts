import * as THREE from "three";
import { pixelTexture } from "../voxel/bake";

export function createSky(rng: () => number) {
  const sky = new THREE.Group();
  const moonArt = document.createElement("canvas"); moonArt.width = moonArt.height = 32;
  const moonCtx = moonArt.getContext("2d")!;
  for (let y = -15; y <= 15; y++) for (let x = -15; x <= 15; x++) {
    if (x * x + y * y > 225) continue;
    moonCtx.fillStyle = x * x + y * y > 185 ? "#789795" : (x - 5) ** 2 + (y + 3) ** 2 < 22 || (x + 7) ** 2 + (y - 5) ** 2 < 9 ? "#a5bcb1" : "#dce0b7";
    moonCtx.fillRect(16 + x, 16 + y, 1, 1);
  }
  const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: pixelTexture(moonArt), depthWrite: false }));
  sky.add(moon);
  const starSpots = Array.from({ length: 95 }, () => ({ x: rng(), y: rng() * 0.44 }));
  const starPositions = new Float32Array(starSpots.length * 3);
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
  sky.add(new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: 0x7d969e, size: 1, sizeAttenuation: false, depthWrite: false })));
  return { sky, setView(this: void, camera: THREE.OrthographicCamera) {
      const width = camera.right - camera.left, height = camera.top - camera.bottom;
      moon.position.set(camera.left + width * 0.8, camera.top - height * 0.13, -150);
      moon.scale.setScalar(height * 0.08);
      starSpots.forEach((star, i) => starPositions.set([camera.left + star.x * width, camera.top - star.y * height, -155], i * 3));
      starGeometry.attributes.position.needsUpdate = true;
      starGeometry.computeBoundingSphere();
  } };
}
