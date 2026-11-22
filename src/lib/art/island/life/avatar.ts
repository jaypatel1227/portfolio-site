import type * as THREE from "three";
import { createIdlePose } from "./behavior";
import { CHARACTER_HEAD } from "../models/character";
import type { AnimationSystem, Frame } from "./types";

export function createAvatar(walker: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>): AnimationSystem {
  const idle = createIdlePose(), turn = { value: 0 }, baseY = walker.scale.y;
  walker.material.onBeforeCompile = (shader) => {
    shader.uniforms.idleTurn = turn;
    shader.vertexShader = `uniform float idleTurn;\n${shader.vertexShader}`.replace("#include <begin_vertex>", `#include <begin_vertex>
      if (position.y > ${(CHARACTER_HEAD - 0.5).toFixed(1)}) {
        vec2 head = transformed.xz;
        transformed.x = head.x * cos(idleTurn) + head.y * sin(idleTurn);
        transformed.z = head.y * cos(idleTurn) - head.x * sin(idleTurn);
      }
    `);
  };
  walker.material.customProgramCacheKey = () => "island-idle-head";
  return { update({ time, motion, dt }: Frame) {
    const pose = idle.update(time, motion, dt);
    turn.value = pose.turn;
    walker.scale.y = baseY * pose.breath;
    walker.rotation.z = pose.lean;
  } };
}
