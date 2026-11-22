import type * as THREE from "three";
import { random, type Obstacle } from "../math";
import type { Batch } from "../voxel/batch";
import type { AnimationSystem, Frame, Plants } from "./types";
import { createWind } from "./wind";
import { createFalling } from "./falling";
import { createPond } from "./pond";
import { createWildlife } from "./wildlife";
import { createFootsteps } from "./footsteps";
import { createShooting } from "./shooting";
import { createLighting } from "./lighting";
import { createBirds } from "./birds";
import { createInsects } from "./insects";

export function createLife(seed: number, batch: Batch, sky: THREE.Group, obstacles: Obstacle[], plants: Plants) {
  const rng = random(seed + 741);
  const systems: AnimationSystem[] = [createWind(plants), createFalling(batch, rng), createPond(batch), createWildlife(batch, rng, obstacles), createFootsteps(batch, rng), createShooting(seed, sky), createLighting(plants), createBirds(seed, batch), createInsects(batch, plants.lamps)];
  return {
    setView(camera: THREE.OrthographicCamera) { for (const system of systems) system.setView?.(camera); },
    update(frame: Frame) { for (const system of systems) system.update(frame); },
  };
}
