/** A loaded brush: one instanced quad, combed pigment and a raised lit edge. */
import * as THREE from "three";

export const TAU = Math.PI * 2;
export function random(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export const palette = {
  sky: ["#122958", "#163d78", "#1b4d96", "#285fb0", "#3679b5", "#568fae", "#849eac"],
  hill: ["#142f40", "#1d454c", "#285b5a", "#3d6864", "#2c5073", "#496f82"],
  wheat: ["#414d32", "#6c7139", "#9b8b42", "#c2a353", "#d6b568", "#657f57", "#386475"],
  cypress: ["#0c2026", "#142f2b", "#254633", "#36593c", "#5c693b", "#253d56"],
  gold: ["#f4d570", "#e9b840", "#fff0a6", "#c7973d", "#9eac88"],
};

export type Stroke = {
  at: THREE.Vector3;
  along: THREE.Vector3;
  normal: THREE.Vector3;
  width: number;
  length: number;
  color: string;
  motion?: number;
  relief?: number;
};

export class PaintLayer {
  private strokes: Stroke[] = [];
  add(stroke: Stroke): void { this.strokes.push(stroke); }
  get count(): number { return this.strokes.length; }

  build(sky = false): THREE.InstancedMesh {
    const geometry = new THREE.PlaneGeometry(1, 1);
    const motions = new Float32Array(this.count);
    const loads = new Float32Array(this.count);
    const material = new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 } },
      side: THREE.DoubleSide,
      alphaToCoverage: true,
      depthWrite: !sky,
      depthTest: !sky,
      vertexShader: /* glsl */ `
        uniform float time;
        attribute float motion;
        attribute float load;
        varying vec2 vUv;
        varying vec3 vColor;
        varying float vSeed;
        varying float vLoad;
        void main() {
          vUv = uv;
          vColor = instanceColor;
          vLoad = load;
          vec3 center = instanceMatrix[3].xyz;
          vSeed = fract(sin(dot(center, vec3(12.3, 45.6, 78.9))) * 4375.8);
          vec3 p = position;
          p.x += sin(time * 0.65 + vSeed * 6.28) * motion * (uv.y * uv.y) * 0.08;
          p.x += sin(uv.y * 5.0 + vSeed * 9.0) * 0.065;
          gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(p, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec2 vUv;
        varying vec3 vColor;
        varying float vSeed;
        varying float vLoad;
        void main() {
          float end = pow(max(0.0, sin(vUv.y * 3.14159)), 0.28);
          float bristles = sin(vUv.x * 93.0 + sin(vUv.y * 12.0 + vSeed * 8.0) * 1.1);
          float edge = abs(vUv.x - 0.5) * 2.0;
          float loaded = end * (0.88 + bristles * 0.055);
          float feather = max(fwidth(edge), 0.004);
          if (edge > loaded + feather || vUv.y < 0.025 || vUv.y > 0.98) discard;
          float groove = 0.5 + 0.5 * bristles;
          float relief = cos(vUv.x * 93.0 + sin(vUv.y * 12.0 + vSeed * 8.0) * 1.1);
          float ridge = smoothstep(0.6, 0.94, edge / max(loaded, 0.01));
          vec3 col = vColor * (0.88 + (groove * 0.2 + relief * 0.16 - 0.1) * vLoad);
          col += vColor * ridge * (vUv.x < 0.5 ? 0.23 : -0.23) * vLoad;
          float weave = sin(gl_FragCoord.x * 2.7) * sin(gl_FragCoord.y * 2.7);
          col *= 1.0 + weave * 0.025;
          gl_FragColor = vec4(col, 1.0 - smoothstep(loaded - feather, loaded + feather, edge));
          #include <colorspace_fragment>
        }
      `,
    });
    const mesh = new THREE.InstancedMesh(geometry, material, this.count);
    const matrix = new THREE.Matrix4();
    const right = new THREE.Vector3();
    const along = new THREE.Vector3();
    const normal = new THREE.Vector3();
    const color = new THREE.Color();
    this.strokes.forEach((stroke, i) => {
      normal.copy(stroke.normal).normalize();
      along.copy(stroke.along).normalize();
      right.crossVectors(along, normal).normalize();
      along.crossVectors(normal, right).normalize();
      matrix.makeBasis(right.multiplyScalar(stroke.width), along.multiplyScalar(stroke.length), normal);
      matrix.setPosition(stroke.at);
      mesh.setMatrixAt(i, matrix);
      mesh.setColorAt(i, color.set(stroke.color));
      motions[i] = stroke.motion ?? 0;
      loads[i] = stroke.relief ?? 1;
    });
    geometry.setAttribute("motion", new THREE.InstancedBufferAttribute(motions, 1));
    geometry.setAttribute("load", new THREE.InstancedBufferAttribute(loads, 1));
    mesh.frustumCulled = false;
    mesh.renderOrder = sky ? -10 : 0;
    this.strokes = [];
    return mesh;
  }
}

export function tickPaint(mesh: THREE.InstancedMesh, time: number): void {
  (mesh.material as THREE.ShaderMaterial).uniforms.time.value = time;
}
