import type { StackMesh } from "../voxel/batch";
import type { AnimationSystem, Frame } from "./types";

export function createClouds(ground: StackMesh): AnimationSystem {
  const clock = { value: 0 };
  ground.material.onBeforeCompile = (shader) => {
    shader.uniforms.cloudTime = clock;
    shader.vertexShader = `varying vec2 cloudPosition;\n${shader.vertexShader}`.replace("#include <begin_vertex>", `#include <begin_vertex>
      cloudPosition = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xz;
    `);
    shader.fragmentShader = `uniform float cloudTime; varying vec2 cloudPosition;\n${shader.fragmentShader}`.replace("#include <tonemapping_fragment>", `
      float cloud = sin(cloudPosition.x * 0.18 + cloudTime * 0.035) * 0.5 + cos(cloudPosition.y * 0.24 - cloudTime * 0.025) * 0.5;
      gl_FragColor.rgb *= 1.0 - smoothstep(0.22, 0.85, cloud) * 0.12;
      #include <tonemapping_fragment>
    `);
  };
  ground.material.customProgramCacheKey = () => "island-cloud-shade";
  return { update({ time }: Frame) { clock.value = time; } };
}
