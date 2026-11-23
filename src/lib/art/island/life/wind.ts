import * as THREE from "three";
import type { AnimationSystem, Frame, Plants } from "./types";

export function createWind(plants: Plants): AnimationSystem {
  const clock = { value: 0 };
  const actor = { value: new THREE.Vector3() };
  function wind(mesh: THREE.InstancedMesh, height: number, amplitude: number): void {
    const material = mesh.material as THREE.MeshBasicMaterial;
    material.onBeforeCompile = (shader) => {
      shader.uniforms.stackTime = clock;
      shader.uniforms.stackActor = actor;
      // Linear shear keeps neighboring merged faces joined, even at T-junctions.
      shader.vertexShader = `uniform float stackTime; uniform vec3 stackActor;\n${shader.vertexShader}`.replace("#include <begin_vertex>", `#include <begin_vertex>
        float layer = (position.y + 0.5) / ${height.toFixed(1)};
        float gust = sin(stackTime * 1.4 + instanceMatrix[3].x * 0.2 + instanceMatrix[3].z * 0.3);
        transformed.x += gust * layer * ${amplitude.toFixed(1)};
        transformed.z += cos(stackTime + instanceMatrix[3].z * 0.2) * layer * ${amplitude.toFixed(1)} * 0.4;
        vec2 away = instanceMatrix[3].xz - stackActor.xy;
        float brush = (1.0 - smoothstep(0.0, ${height === 11 ? "1.6" : "3.2"}, length(away))) * stackActor.z;
        transformed.xz += away / max(length(away), 0.1) * brush * layer * ${height === 11 ? "9.0" : "2.5"};
      `);
    };
    material.customProgramCacheKey = () => `stack-wind-${height}-${amplitude}`;
    mesh.frustumCulled = false;
  }
  wind(plants.pines, 47, 2.2); wind(plants.oak, 83, 1.1); wind(plants.grass, 11, 2.4);

  return {
    update({ time, player, motion, dt }: Frame) {
      clock.value = time;
      const strength = dt === 0 ? 0 : actor.value.z + (Math.min(1, motion) - actor.value.z) * (1 - Math.exp(-dt * 9));
      actor.value.set(player.x, player.z, strength);
    },
  };
}
