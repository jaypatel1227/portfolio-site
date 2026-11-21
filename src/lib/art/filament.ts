/**
 * "Kiln Filament": the ambient shader behind the page on phone-sized
 * screens. One domain warp feeding one ridged field, whose zero-crossings
 * become a single thread scale of kiln-light on deep umber.
 *
 * Drawn as one fullscreen triangle at half resolution and upscaled by
 * css. Paused in hidden tabs; reduced motion gets a single still frame.
 * On wider screens the canvas stays hidden and the shader is never
 * compiled.
 */
const NARROW = "(max-width: 63.99rem)";
const RESOLUTION_SCALE = 0.5;
/** the moment the reduced-motion still frame is taken at */
const STILL_TIME = 90;

const VERT = `
attribute vec2 a_pos;
void main() {
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

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

interface Painter {
  draw(time: number): void;
  /** matches the render buffer to the viewport */
  fit(): void;
}

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
}

function createPainter(canvas: HTMLCanvasElement): Painter | null {
  const gl = canvas.getContext("webgl", {
    antialias: false,
    depth: false,
    stencil: false,
    alpha: false,
    powerPreference: "high-performance",
  });
  if (!gl) return null;

  const vs = compile(gl, gl.VERTEX_SHADER, VERT);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return null;
  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  gl.useProgram(program);

  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(program, "a_pos");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const uRes = gl.getUniformLocation(program, "u_res");
  const uTime = gl.getUniformLocation(program, "u_time");

  return {
    draw(time) {
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, time);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    fit() {
      canvas.width = Math.max(2, Math.round(window.innerWidth * RESOLUTION_SCALE));
      canvas.height = Math.max(2, Math.round(window.innerHeight * RESOLUTION_SCALE));
      gl.viewport(0, 0, canvas.width, canvas.height);
    },
  };
}

export function bootFilament(canvas: HTMLCanvasElement): void {
  const narrow = window.matchMedia(NARROW);
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  /** undefined until first needed; null when webgl is unavailable */
  let painter: Painter | null | undefined;
  let raf = 0;

  const frame = (nowMs: number): void => {
    painter?.draw(nowMs / 1000);
    raf = requestAnimationFrame(frame);
  };

  const sync = (): void => {
    if (narrow.matches && painter === undefined) {
      painter = createPainter(canvas);
      painter?.fit();
    }
    const shown = narrow.matches && !!painter;
    canvas.style.display = shown ? "" : "none";

    const animate = shown && !document.hidden && !reducedMotion.matches;
    if (animate && !raf) {
      raf = requestAnimationFrame(frame);
    } else if (!animate && raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
    if (shown && reducedMotion.matches) painter?.draw(STILL_TIME);
  };

  narrow.addEventListener("change", sync);
  reducedMotion.addEventListener("change", sync);
  document.addEventListener("visibilitychange", sync);

  let resizeTimer = 0;
  window.addEventListener("resize", () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      painter?.fit();
      sync();
    }, 150);
  });

  sync();
}
