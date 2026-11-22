import type * as THREE from "three";
import { createIdlePose } from "./behavior";
import type { AnimationSystem, Frame } from "./types";

interface AvatarParts {
  head: THREE.Object3D;
  arms: readonly [THREE.Object3D, THREE.Object3D];
  legs: readonly [THREE.Object3D, THREE.Object3D];
}

export function createAvatar(walker: THREE.Object3D, parts: AvatarParts): AnimationSystem {
  const idle = createIdlePose(), baseY = walker.scale.y;
  let phase = 0, walking = 0;
  return { update({ time, motion, dt }: Frame) {
    const pose = idle.update(time, motion, dt);
    const target = Math.min(1, motion / 2);
    walking += (target - walking) * (dt === 0 ? 1 : 1 - Math.exp(-dt * 12));
    phase = (phase + motion * dt * 3.1) % (Math.PI * 2);
    const swing = Math.sin(phase) * 0.65 * walking, sway = Math.sin(time * 1.5) * 0.035 * (1 - walking);
    parts.head.rotation.y = pose.turn;
    parts.arms[0].rotation.x = swing + sway; parts.arms[1].rotation.x = -swing - sway;
    parts.arms[0].rotation.z = -0.025 - sway; parts.arms[1].rotation.z = 0.025 + sway;
    parts.legs[0].rotation.x = -swing; parts.legs[1].rotation.x = swing;
    walker.scale.y = baseY * pose.breath;
    walker.rotation.z = pose.lean;
  } };
}
