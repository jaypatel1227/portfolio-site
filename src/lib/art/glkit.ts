/**
 * Shared harness for the shader-based ambient studies: a single
 * fullscreen triangle, half-resolution rendering (CSS-upscaled), a
 * gently-eased pointer stir, IntersectionObserver / visibility pause,
 * and a single still frame for prefers-reduced-motion.
 *
 * Shader contract: uniforms u_res (vec2, buffer pixels), u_time (float
 * seconds), u_mouse (vec2, centered / aspect-corrected / y-up, same space
 * as the usual `p = (gl_FragCoord.xy - 0.5*u_res)/u_res.y*1.7`), and
 * u_stir (float 0..1, eased toward 1 while the pointer is over the page).
 * Shaders that don't declare a uniform simply get a null location, which
 * WebGL silently ignores.
 *
 * Optional gateQuery: the study only renders on viewports matching the
 * media query (e.g. "(max-width: 63.99rem)" for mobile-only ambient art).
 * On larger viewports the canvas stays hidden and the shader is never
 * compiled; it boots/unboots live as the viewport crosses the boundary.
 */

const VERT = `
attribute vec2 a_pos;
void main() {
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export interface ShaderSpec {
  frag: string;
  /** render-buffer scale relative to viewport; default 0.5 */
  resolutionScale?: number;
  /** time value used for the reduced-motion still frame; default 90 */
  stillTime?: number;
  /** media query the study renders in; e.g. "(max-width: 63.99rem)" */
  gateQuery?: string;
}

export function bootShader(canvas: HTMLCanvasElement, spec: ShaderSpec): void {
  const resolutionScale = spec.resolutionScale ?? 0.5;
  const stillTime = spec.stillTime ?? 90;
  const gate = spec.gateQuery ? window.matchMedia(spec.gateQuery) : null;

  let gl: WebGLRenderingContext | null = null;
  let uRes: WebGLUniformLocation | null = null;
  let uTime: WebGLUniformLocation | null = null;
  let uMouse: WebGLUniformLocation | null = null;
  let uStir: WebGLUniformLocation | null = null;

  let width = 0;
  let height = 0;
  let raf = 0;
  let running = false;
  let visible = true;
  let enabled = false;
  let reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // pointer in shader space (centered, aspect-corrected, y up)
  const pointer = { mx: 99, my: 99, tx: 99, ty: 99, stir: 0, active: false };

  function build(): boolean {
    if (gl) return true;
    const context = canvas.getContext("webgl", {
      antialias: false,
      depth: false,
      stencil: false,
      alpha: false,
      powerPreference: "high-performance",
    });
    if (!context) return false;

    const vs = compile(context, context.VERTEX_SHADER, VERT);
    const fs = compile(context, context.FRAGMENT_SHADER, spec.frag);
    if (!vs || !fs) return false;
    const program = context.createProgram();
    context.attachShader(program, vs);
    context.attachShader(program, fs);
    context.linkProgram(program);
    if (!context.getProgramParameter(program, context.LINK_STATUS)) return false;
    context.useProgram(program);

    const buffer = context.createBuffer();
    context.bindBuffer(context.ARRAY_BUFFER, buffer);
    context.bufferData(
      context.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      context.STATIC_DRAW
    );
    const aPos = context.getAttribLocation(program, "a_pos");
    context.enableVertexAttribArray(aPos);
    context.vertexAttribPointer(aPos, 2, context.FLOAT, false, 0, 0);

    uRes = context.getUniformLocation(program, "u_res");
    uTime = context.getUniformLocation(program, "u_time");
    uMouse = context.getUniformLocation(program, "u_mouse");
    uStir = context.getUniformLocation(program, "u_stir");
    gl = context;
    return true;
  }

  function resize(): void {
    if (!gl) return;
    width = Math.max(2, Math.round(window.innerWidth * resolutionScale));
    height = Math.max(2, Math.round(window.innerHeight * resolutionScale));
    canvas.width = width;
    canvas.height = height;
    gl.viewport(0, 0, width, height);
    if (reduced) drawFrame(stillTime);
  }

  function drawFrame(time: number): void {
    if (!gl) return;
    pointer.mx += (pointer.tx - pointer.mx) * 0.08;
    pointer.my += (pointer.ty - pointer.my) * 0.08;
    pointer.stir += ((pointer.active ? 1 : 0) - pointer.stir) * 0.045;

    gl.uniform2f(uRes, width, height);
    gl.uniform1f(uTime, time);
    gl.uniform2f(uMouse, pointer.mx, pointer.my);
    gl.uniform1f(uStir, pointer.stir);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  function frame(nowMs: number): void {
    drawFrame(nowMs / 1000);
    if (running && !reduced) raf = requestAnimationFrame(frame);
  }

  function start(): void {
    if (running) return;
    running = true;
    raf = requestAnimationFrame(frame);
  }
  function stop(): void {
    running = false;
    cancelAnimationFrame(raf);
  }

  function enable(): void {
    if (enabled) return;
    if (!build()) {
      // no WebGL — leave the canvas hidden and move on
      canvas.style.display = "none";
      return;
    }
    enabled = true;
    canvas.style.display = "";
    resize();
    if (reduced) drawFrame(stillTime);
    else if (visible) start();
  }

  function disable(): void {
    if (!enabled) return;
    enabled = false;
    stop();
    canvas.style.display = "none";
  }

  const onMove = (e: PointerEvent): void => {
    const aspect = window.innerWidth / window.innerHeight;
    pointer.tx = ((e.clientX / window.innerWidth) - 0.5) * 1.7 * aspect;
    pointer.ty = (0.5 - e.clientY / window.innerHeight) * 1.7;
    pointer.active = true;
  };
  const onLeave = (): void => {
    pointer.active = false;
  };
  window.addEventListener("pointermove", onMove, { passive: true });
  document.documentElement.addEventListener("pointerleave", onLeave);

  const io = new IntersectionObserver(
    (entries) => {
      visible = entries[0]?.isIntersecting ?? true;
      if (visible && enabled && !reduced) start();
      else stop();
    },
    { threshold: 0 }
  );
  io.observe(canvas);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
    else if (visible && enabled && !reduced) start();
  });

  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  const onReduced = (): void => {
    reduced = mq.matches;
    if (!enabled) return;
    if (reduced) {
      stop();
      drawFrame(stillTime);
    } else {
      start();
    }
  };
  mq.addEventListener?.("change", onReduced);

  let resizeTimer = 0;
  window.addEventListener("resize", () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(resize, 150);
  });

  if (gate) {
    gate.addEventListener?.("change", () => (gate.matches ? enable() : disable()));
    if (gate.matches) enable();
    else canvas.style.display = "none";
  } else {
    enable();
  }
}
