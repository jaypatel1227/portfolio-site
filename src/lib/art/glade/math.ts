/** Shared math and seeded noise. */
export const TAU = Math.PI * 2;

export const clamp = (v: number, lo: number, hi: number): number =>
  Math.min(hi, Math.max(lo, v));
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const smoothstep = (a: number, b: number, t: number): number => {
  const x = clamp((t - a) / (b - a), 0, 1);
  return x * x * (3 - 2 * x);
};

export function mulberry32(a: number): () => number {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** a second, cheaper generator; the canvas painters that use it depend on its exact sequence */
export function lcg(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a * 1664525 + 1013904223) >>> 0;
    return a / 4294967296;
  };
}

export type Noise2 = (x: number, y: number) => number;

/** gradient (perlin-style) noise in [-1, 1], seeded */
export function makeNoise(seed: number): Noise2 {
  const rng = mulberry32(seed);
  const perm = new Uint8Array(512);
  const base = new Uint8Array(256);
  for (let i = 0; i < 256; i++) base[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = base[i];
    base[i] = base[j];
    base[j] = tmp;
  }
  for (let i = 0; i < 512; i++) perm[i] = base[i & 255];

  const grads = new Float32Array(256 * 2);
  for (let i = 0; i < 256; i++) {
    const angle = rng() * Math.PI * 2;
    grads[i * 2] = Math.cos(angle);
    grads[i * 2 + 1] = Math.sin(angle);
  }

  const fade = (t: number): number => t * t * t * (t * (t * 6 - 15) + 10);

  return (x: number, y: number): number => {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const fx = x - ix;
    const fy = y - iy;
    const x0 = ix & 255;
    const y0 = iy & 255;
    const dot = (h: number, dx: number, dy: number): number =>
      grads[h * 2] * dx + grads[h * 2 + 1] * dy;

    const g00 = dot(perm[perm[x0] + y0], fx, fy);
    const g10 = dot(perm[perm[x0 + 1] + y0], fx - 1, fy);
    const g01 = dot(perm[perm[x0] + y0 + 1], fx, fy - 1);
    const g11 = dot(perm[perm[x0 + 1] + y0 + 1], fx - 1, fy - 1);
    const u = fade(fx);
    const v = fade(fy);
    return ((g00 * (1 - u) + g10 * u) * (1 - v) + (g01 * (1 - u) + g11 * u) * v) * 1.5;
  };
}

export function pointToSegmentDist2(
  px: number,
  pz: number,
  ax: number,
  az: number,
  bx: number,
  bz: number
): number {
  const abx = bx - ax;
  const abz = bz - az;
  const len2 = abx * abx + abz * abz;
  const t = len2 === 0 ? 0 : clamp(((px - ax) * abx + (pz - az) * abz) / len2, 0, 1);
  const dx = px - (ax + abx * t);
  const dz = pz - (az + abz * t);
  return dx * dx + dz * dz;
}

export const easeInOutCubic = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export const shortestAngle = (from: number, to: number): number => {
  let d = (to - from) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
};
