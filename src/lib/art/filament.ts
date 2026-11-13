/**
 * "Kiln Filament" — the site's ambient study, trimmed to essentials:
 * one domain warp feeding one ridged field, whose zero-crossings become
 * a single thread scale of kiln-light on deep umber. No interaction
 * response at all. Mobile-sized viewports only (gated in glkit); hidden
 * and uncompiled on larger screens until they come back to phone width.
 */
import { bootShader } from "./glkit";

const FRAG = `
precision highp float;
uniform vec2 u_res;
uniform float u_time;

float hash(vec2 p) {
  p = fract(p * vec2(234.34, 435.345));
  p += dot(p, p + 34.23);
  return fract(p.x * p.y);
}

float noise(in vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

const mat2 ROT = mat2(0.8, 0.6, -0.6, 0.8);

float fbm(vec2 p) {
  float v = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 4; i++) {
    v += amp * noise(p);
    p = ROT * p * 2.02 + vec2(11.3, 7.7);
    amp *= 0.5;
  }
  return v;
}

void main() {
  vec2 p = (gl_FragCoord.xy - 0.5 * u_res) / u_res.y * 1.7;
  float t = u_time * 0.045;

  // one warp, one field, one thread scale
  vec2 q = vec2(fbm(p + t), fbm(p + vec2(5.2, 1.3) - t * 0.7));
  float f = fbm(p + 2.0 * q + vec2(1.7, 9.2) + t * 0.3);

  float thread = pow(1.0 - abs(2.0 * f - 1.0), 8.0);

  vec3 col = vec3(0.078, 0.066, 0.055);
  col = mix(col, vec3(0.205, 0.095, 0.075), smoothstep(0.22, 0.88, f) * 0.72);
  col += vec3(0.88, 0.55, 0.25) * thread * 0.42;

  // vignette
  col *= 1.0 - 0.38 * smoothstep(0.55, 1.42, length(p));

  // dither to kill banding
  col += (hash(gl_FragCoord.xy + fract(u_time) * 100.0) - 0.5) * 0.014;

  gl_FragColor = vec4(col, 1.0);
}
`;

export function bootFilament(canvas: HTMLCanvasElement): void {
  bootShader(canvas, { frag: FRAG, gateQuery: "(max-width: 63.99rem)" });
}
