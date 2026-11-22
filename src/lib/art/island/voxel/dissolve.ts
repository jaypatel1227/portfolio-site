import * as THREE from "three";

export function dissolve(mesh: THREE.InstancedMesh, weights: Float32Array, inverted = false): () => void {
  const coverage = new THREE.InstancedBufferAttribute(weights, 1);
  coverage.setUsage(THREE.DynamicDrawUsage);
  mesh.geometry.setAttribute("stackCoverage", coverage);
  const material = mesh.material as THREE.MeshBasicMaterial;
  const compile = material.onBeforeCompile.bind(material), key = material.customProgramCacheKey();
  material.onBeforeCompile = (shader, renderer) => {
    compile(shader, renderer);
    shader.vertexShader = `attribute float stackCoverage; varying float stackMix;\n${shader.vertexShader}`
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nstackMix = stackCoverage;");
    shader.fragmentShader = `varying float stackMix;\n${shader.fragmentShader}`
      .replace("#include <alphatest_fragment>", `#include <alphatest_fragment>
        vec3 pixel = fract(floor(gl_FragCoord.xyx) * 0.1031);
        pixel += dot(pixel, pixel.yzx + 33.33);
        float threshold = fract((pixel.x + pixel.y) * pixel.z);
        if (${inverted ? "threshold < stackMix" : "threshold >= stackMix"}) discard;
      `);
  };
  material.customProgramCacheKey = () => `${key}-dissolve-${inverted}`;
  material.needsUpdate = true;
  return () => { coverage.needsUpdate = true; };
}
