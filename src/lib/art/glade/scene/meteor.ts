/** Sky accents: a rare meteor. */
import * as THREE from "three";
import { TAU, mulberry32 } from "../math";
import { makeDotTexture } from "./textures";

export interface SkyAccentField {
  update: (dt: number, time: number, playerPos: THREE.Vector3, moveAuthority: number) => void;
}

export function buildSkyAccents(scene: THREE.Scene, seed: number): SkyAccentField {
  const rng = mulberry32(seed + 101);
  const dot = makeDotTexture();

  /* a rare meteor, so the sky feels alive without pulling focus */
  const meteor = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: dot,
      color: 0xdfe8ff,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
      fog: false,
    })
  );
  meteor.visible = false;
  meteor.renderOrder = 5;
  scene.add(meteor);
  const meteorDir = new THREE.Vector3();
  let meteorWait = 7 + rng() * 9;
  let meteorAge = -1;
  let meteorLen = 5;

  const updateAll = (
    dt: number,
    time: number,
    playerPos: THREE.Vector3,
    moveAuthority: number
  ): void => {
    // meteors only when the visitor has settled into the scene
    const mm = meteor.material as THREE.SpriteMaterial;
    if (meteorAge < 0) {
      meteorWait -= dt;
      if (meteorWait <= 0 && moveAuthority < 0.25) {
        meteorAge = 0;
        const a = rng() * TAU;
        meteor.position.set(
          playerPos.x + Math.cos(a) * 90,
          28 + rng() * 26,
          playerPos.z + Math.sin(a) * 90
        );
        meteorDir.set((rng() - 0.5) * 2, -(0.35 + rng() * 0.5), (rng() - 0.5) * 2).normalize();
        meteorLen = 4 + rng() * 5;
        mm.rotation = Math.atan2(meteorDir.y, meteorDir.x) + Math.PI;
      }
    } else {
      meteorAge += dt;
      const life = 0.85;
      if (meteorAge > life) {
        meteorAge = -1;
        meteorWait = 18 + rng() * 26;
        meteor.visible = false;
      } else {
        const k = meteorAge / life;
        meteor.position.addScaledVector(meteorDir, dt * 58);
        const fade = Math.sin(Math.min(1, k) * Math.PI);
        meteor.visible = true;
        mm.opacity = fade * 0.45;
        meteor.scale.set(meteorLen * (0.5 + fade * 0.9), 0.16 + fade * 0.1, 1);
      }
    }
  };

  return { update: updateAll };
}
