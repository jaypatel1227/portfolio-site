import * as THREE from "three";
import type { AnimationSystem, Frame, Plants } from "./types";

export function createWind(plants: Plants): AnimationSystem {
  const clock = { value: 0 };
  function wind(mesh: THREE.InstancedMesh, height: number, amplitude: number): void {
    const material = mesh.material as THREE.MeshBasicMaterial;
    material.onBeforeCompile = (shader) => {
      shader.uniforms.stackTime = clock;
      shader.vertexShader = `uniform float stackTime;\n${shader.vertexShader}`.replace("#include <begin_vertex>", `#include <begin_vertex>
        float layer = floor(max(position.y, 0.0) + 0.5) / ${height.toFixed(1)};
        float gust = sin(stackTime * 1.4 + instanceMatrix[3].x * 0.2 + instanceMatrix[3].z * 0.3);
        transformed.x += gust * layer * layer * ${amplitude.toFixed(1)};
        transformed.z += cos(stackTime + instanceMatrix[3].z * 0.2) * layer * layer * ${amplitude.toFixed(1)} * 0.4;
      `);
    };
    material.customProgramCacheKey = () => `stack-wind-${height}-${amplitude}`;
    mesh.frustumCulled = false;
  }
  wind(plants.pines, 47, 2.2); wind(plants.oak, 83, 1.1); wind(plants.grass, 11, 2.4);

  return {
    update({ time }: Frame) {
      clock.value = time;
    },
  };
}
