/**
 * Procedural textures for the dark glade: pine boughs,
 * ferns, grass, soil, moon, mist, moss. Everything is drawn into a
 * canvas at boot so the piece ships with zero image assets.
 */
import * as THREE from "three";
import { TAU, clamp, smoothstep, mulberry32, makeNoise } from "../math";

function canvas2d(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  return [canvas, canvas.getContext("2d")!];
}

function tex(canvas: HTMLCanvasElement, srgb = true): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(canvas);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/* ------------------------------------------------------------------ */
/* soft dots + mist                                                    */
/* ------------------------------------------------------------------ */

export function makeDotTexture(): THREE.CanvasTexture {
  const size = 96;
  const [canvas, ctx] = canvas2d(size, size);
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.07, "rgba(255,255,255,0.9)");
  grad.addColorStop(0.22, "rgba(255,255,255,0.38)");
  grad.addColorStop(0.45, "rgba(255,255,255,0.1)");
  grad.addColorStop(0.7, "rgba(255,255,255,0.022)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  return tex(canvas);
}

export function makeMistTexture(): THREE.CanvasTexture {
  const size = 256;
  const [canvas, ctx] = canvas2d(size, size);
  const noise = makeNoise(811);
  const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = x / size - 0.5;
      const ny = y / size - 0.5;
      const d = Math.hypot(nx, ny);
      const wob = noise(x * 0.045, y * 0.045) * 0.11 + noise(x * 0.13, y * 0.13) * 0.04;
      const a = clamp((0.48 - d + wob) * 3.1, 0, 1);
      const spiral = Math.atan2(ny, nx) * 3 + d * 42;
      const soft = Math.pow(a, 1.7) * (0.45 + 0.55 * Math.pow(0.5 + 0.5 * Math.sin(spiral), 2));
      const i = (y * size + x) * 4;
      img.data[i] = 255;
      img.data[i + 1] = 255;
      img.data[i + 2] = 255;
      img.data[i + 3] = Math.round(soft * 255);
    }
  }
  ctx.putImageData(img, 0, 0);
  return tex(canvas);
}

/** a soft, irregular contact shadow blob */
export function makeShadowTexture(): THREE.CanvasTexture {
  const size = 128;
  const [canvas, ctx] = canvas2d(size, size);
  const noise = makeNoise(9137);
  const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = (x / size - 0.5) * 2;
      const ny = (y / size - 0.5) * 2;
      const wob = noise(x * 0.06, y * 0.06) * 0.22;
      const d = Math.hypot(nx, ny) + wob;
      const a = Math.pow(clamp(1 - d, 0, 1), 1.9);
      const i = (y * size + x) * 4;
      img.data[i] = 0;
      img.data[i + 1] = 0;
      img.data[i + 2] = 0;
      img.data[i + 3] = Math.round(a * 255);
    }
  }
  ctx.putImageData(img, 0, 0);
  return tex(canvas, false);
}


/* ------------------------------------------------------------------ */
/* foliage                                                             */
/* ------------------------------------------------------------------ */

export function makePineTexture(seed: number, slender = false): THREE.CanvasTexture {
  const w = 256;
  const h = 512;
  const [canvas, ctx] = canvas2d(w, h);
  const rng = mulberry32(seed);
  const cx = w / 2;
  const top = 12;
  const bottom = h - 8;
  const maxHalf = slender ? 50 : 110;
  const span = bottom - top;
  ctx.lineCap = "round";

  // tapered trunk spine: gives the silhouette a centre of gravity
  {
    const g = ctx.createLinearGradient(0, bottom, 0, top);
    g.addColorStop(0, "rgba(12,15,11,1)");
    g.addColorStop(0.7, "rgba(20,26,18,1)");
    g.addColorStop(1, "rgba(32,40,28,1)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(cx - (slender ? 3.4 : 5.4), bottom);
    ctx.quadraticCurveTo(cx - 2.6, bottom - span * 0.55, cx - 0.9, top);
    ctx.lineTo(cx + 0.9, top);
    ctx.quadraticCurveTo(cx + 2.6, bottom - span * 0.55, cx + (slender ? 3.4 : 5.4), bottom);
    ctx.closePath();
    ctx.fill();
  }

  // a soft needle clump; overlapping clumps build the ragged bough mass
  const clump = (x: number, y: number, r: number, light: number, a: number): void => {
    const rr = Math.max(1.2, r);
    const g = ctx.createRadialGradient(x, y - rr * 0.18, rr * 0.08, x, y, rr);
    g.addColorStop(0, `rgba(${28 + light * 58},${38 + light * 58},${25 + light * 40},${a})`);
    g.addColorStop(0.5, `rgba(${17 + light * 30},${24 + light * 32},${16 + light * 24},${a * 0.96})`);
    g.addColorStop(0.82, `rgba(10,14,10,${a * 0.7})`);
    g.addColorStop(1, "rgba(8,11,8,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(
      x, y,
      rr * (0.92 + rng() * 0.36),
      rr * (0.6 + rng() * 0.32),
      (rng() - 0.5) * 0.9,
      0, TAU
    );
    ctx.fill();
  };

  // whorled boughs, drooping at the tips: the classic fir silhouette
  const tiers = slender ? 34 : 27;
  for (let i = 0; i < tiers; i++) {
    const t = i / (tiers - 1);
    const y = bottom - Math.pow(t, 0.94) * span;
    const taper = Math.pow(1 - t, slender ? 0.92 : 0.7);
    const half = 3 + taper * maxHalf;
    if (half < 7) continue;
    const whorlH = (span / tiers) * (1.15 + rng() * 0.9);

    for (const side of [-1, 1]) {
      const boughs = 1 + (rng() < 0.68 ? 1 : 0) + (rng() < 0.3 ? 1 : 0);
      for (let b = 0; b < boughs; b++) {
        const baseY = y + (rng() - 0.5) * whorlH * 0.85;
        const len = half * (0.6 + rng() * 0.44) * (boughs > 1 ? 0.92 : 1);
        const rise = (rng() - 0.3) * whorlH * (slender ? 0.3 : 0.5);
        const droop = len * (slender ? 0.05 + rng() * 0.1 : 0.16 + rng() * 0.26);
        const x0 = cx + side * 1.4;
        const y0 = baseY;
        const x1 = cx + side * len;
        const y1 = baseY - rise + droop;

        ctx.strokeStyle = `rgba(${20 + rng() * 12},${26 + rng() * 12},${19 + rng() * 9},0.92)`;
        ctx.lineWidth = 1.0 + taper * 2.2;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.quadraticCurveTo(
          cx + side * len * 0.5,
          baseY - rise * 0.45 + droop * 0.2,
          x1, y1
        );
        ctx.stroke();

        // feathered needles tapered from trunk to tip
        const n = Math.max(3, Math.round(len / (slender ? 6 : 10)));
        for (let k = 0; k <= n; k++) {
          const u = k / n;
          const px = x0 + (x1 - x0) * u;
          const py =
            y0 + (y1 - y0) * u -
            Math.sin(u * Math.PI) * len * (slender ? 0.02 : 0.07);
          const clumpR =
            (2.0 + taper * 6.8) *
            (0.55 + u * 0.75) *
            (0.7 + rng() * 0.62);
          const light = 0.16 + u * 0.55 + rng() * 0.3;
          clump(px, py + rng() * 2.2, clumpR, light, 0.5 + rng() * 0.3);
        }
        // stray drooping tips keep the edge ragged
        if (rng() < 0.7) {
          clump(
            x1 + side * rng() * 5,
            y1 + rng() * (slender ? 4 : 9),
            2.4 + taper * 5.4,
            0.15 + rng() * 0.45,
            0.45 + rng() * 0.25
          );
        }
      }
    }
  }

  // crown leader: a tight spire of small clumps
  for (let i = 0; i < (slender ? 12 : 9); i++) {
    const u = i / 8;
    clump(cx + (rng() - 0.5) * 3, top + u * 26, 5 - u * 2.4, 0.4 + rng() * 0.4, 0.7);
  }

  // moonlit needle catch light, kept inside the bough mass
  ctx.globalCompositeOperation = "source-atop";
  for (let i = 0; i < 620; i++) {
    const t = Math.pow(rng(), 0.75);
    const y = bottom - t * span + (rng() - 0.5) * 14;
    const taper = Math.pow(1 - t, 0.85);
    const half = 3 + taper * maxHalf;
    const side = rng() < 0.5 ? -1 : 1;
    const len = 3 + rng() * half * 0.4;
    const x0 = cx + side * rng() * half * 0.5;
    const a = 0.04 + rng() * 0.18;
    ctx.strokeStyle = `rgba(${118 + rng() * 62},${136 + rng() * 58},${104 + rng() * 44},${a})`;
    ctx.lineWidth = 0.6 + rng() * 1.0;
    ctx.beginPath();
    ctx.moveTo(x0, y);
    ctx.lineTo(x0 + side * len, y + (rng() - 0.25) * 11);
    ctx.stroke();
  }

  // Flame-shaped ribbons follow the crown.
  for (let i = 0; i < 340; i++) {
    const t = rng();
    const y = bottom - t * span;
    const half = Math.pow(1 - t, 0.85) * maxHalf;
    const x = cx + (rng() - 0.5) * half * 1.7;
    const len = 12 + rng() * 36;
    ctx.strokeStyle = i % 5 === 0 ? "rgba(170,164,62,0.5)" : "rgba(28,83,54,0.8)";
    ctx.lineWidth = 2 + rng() * 4;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.bezierCurveTo(x - 9, y - len * 0.3, x + 11, y - len * 0.7, x + 2, y - len);
    ctx.stroke();
  }

  // punch irregular gaps so the sky shows through like real boughs
  ctx.globalCompositeOperation = "destination-out";
  for (let i = 0; i < 1500; i++) {
    const t = rng();
    const y = bottom - t * span;
    const taper = Math.pow(1 - t, 0.9);
    const half = 3 + taper * maxHalf;
    // bias holes toward the outer boughs, leave the trunk solid
    const u = rng();
    const x = cx + (rng() < 0.5 ? -1 : 1) * u * half;
    const r = 0.5 + rng() * 1.9;
    ctx.globalAlpha = 0.3 + rng() * 0.55;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";

  return tex(canvas);
}

/** a bare, twisted snag: trunk and branches, no needles */
export function makeDeadTreeTexture(seed: number): THREE.CanvasTexture {
  const w = 256;
  const h = 512;
  const [canvas, ctx] = canvas2d(w, h);
  const rng = mulberry32(seed ^ 0x5eed);
  ctx.lineCap = "round";

  const drawBranch = (
    x: number,
    y: number,
    len: number,
    angle: number,
    width: number,
    depth: number
  ): void => {
    const x2 = x + Math.cos(angle) * len;
    const y2 = y - Math.sin(angle) * len;
    const grad = ctx.createLinearGradient(x, y, x2, y2);
    grad.addColorStop(0, "rgba(26, 22, 18, 1)");
    grad.addColorStop(1, "rgba(58, 50, 42, 1)");
    ctx.strokeStyle = grad;
    ctx.lineWidth = Math.max(0.7, width);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    // a faint moonlit edge on one side of the limb
    ctx.strokeStyle = `rgba(148, 152, 140, ${0.05 + depth * 0.02})`;
    ctx.lineWidth = Math.max(0.4, width * 0.22);
    ctx.beginPath();
    ctx.moveTo(x - width * 0.22, y);
    ctx.lineTo(x2 - width * 0.18, y2);
    ctx.stroke();

    if (depth <= 0 || width < 0.8) return;
    const children = depth > 3 ? 3 : 2;
    for (let i = 0; i < children; i++) {
      const spread = (rng() - 0.5) * 1.5;
      drawBranch(
        x2,
        y2,
        len * (0.56 + rng() * 0.22),
        angle + spread * 0.7,
        width * (0.56 + rng() * 0.16),
        depth - 1
      );
    }
  };

  drawBranch(w / 2, h - 6, h * 0.3, Math.PI / 2 + (rng() - 0.5) * 0.16, 26, 5);

  return tex(canvas);
}

export function makeCanopyTexture(seed: number): THREE.CanvasTexture {
  const s = 512;
  const [canvas, ctx] = canvas2d(s, s);
  const rng = mulberry32(seed);
  const cx = s / 2;
  const cy = s / 2;

  // Growth happens as several overlapping lobes rather than one disc, so the
  // card silhouette is lobed and leafy instead of a green ball.
  const lobes = 9;
  const lobe: Array<{ x: number; y: number; r: number }> = [];
  for (let i = 0; i < lobes; i++) {
    const a = (i / lobes) * TAU + rng() * 0.7;
    const d = i === 0 ? 0 : s * (0.1 + rng() * 0.18);
    lobe.push({
      x: cx + Math.cos(a) * d,
      y: cy + Math.sin(a) * d * 0.9,
      r: s * (0.16 + rng() * 0.14),
    });
  }

  // small pointed leaves rather than soft circles: the lacy edge is what
  // makes a cutout card read as foliage at silhouette
  const leaf = (x: number, y: number, len: number, wid: number, rot: number, lum: number, a: number): void => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.fillStyle = `rgba(${lum * 0.52}, ${lum * 0.95}, ${lum * 0.62}, ${a})`;
    ctx.beginPath();
    ctx.moveTo(-len, 0);
    ctx.quadraticCurveTo(0, -wid, len, 0);
    ctx.quadraticCurveTo(0, wid, -len, 0);
    ctx.closePath();
    ctx.fill();
    // a thread of moonlight down the leaf's spine
    if (lum > 34) {
      ctx.strokeStyle = `rgba(${lum * 0.9}, ${lum * 1.15}, ${lum * 0.82}, ${a * 0.35})`;
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(-len * 0.8, 0);
      ctx.lineTo(len * 0.8, 0);
      ctx.stroke();
    }
    ctx.restore();
  };

  for (const L of lobe) {
    const n = 470;
    for (let i = 0; i < n; i++) {
      const a2 = rng() * TAU;
      const rr = Math.pow(rng(), 0.58) * L.r;
      const x = L.x + Math.cos(a2) * rr;
      const y = L.y + Math.sin(a2) * rr * 0.9;
      const edge = rr / L.r;
      // ragged, thinning edge with clumps that reach a little beyond
      if (edge > 0.58 && rng() < (edge - 0.58) * 2.6) continue;
      const len = 2.5 + rng() * 5.4;
      const wid = len * (0.34 + rng() * 0.34);
      // moonlight from the upper left, deep shadow at the lower right
      const facing = 0.55 - ((x - cx) / s) * 0.85 - ((y - cy) / s) * 1.05;
      const lum = 22 + clamp(facing, 0, 1) * 42 + rng() * 14 + (1 - edge) * 11;
      const rot = a2 + (rng() - 0.5) * 1.4 + Math.PI / 2;
      leaf(x, y, len, wid, rot, lum, 0.84 + rng() * 0.16);
    }
  }

  // punch many small sky gaps so the mass is lacy rather than airtight;
  // kept small and biased to the edge so the crown doesn't read as dark dots
  ctx.globalCompositeOperation = "destination-out";
  for (let i = 0; i < 170; i++) {
    const a = rng() * TAU;
    const rr = Math.pow(rng(), 0.45) * s * 0.44;
    const x = cx + Math.cos(a) * rr;
    const y = cy + Math.sin(a) * rr * 0.85;
    const r = 0.7 + rng() * 2.9;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(0,0,0,${0.55 + rng() * 0.3})`);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
  }
  ctx.globalCompositeOperation = "source-over";

  // broad directional shading across the clump so each card has form even
  // when the geometry is a flat cutout
  const shade = ctx.createLinearGradient(cx - s * 0.4, cy - s * 0.4, cx + s * 0.42, cy + s * 0.4);
  shade.addColorStop(0, "rgba(172, 204, 172, 0.17)");
  shade.addColorStop(0.42, "rgba(96, 132, 100, 0.03)");
  shade.addColorStop(1, "rgba(18, 36, 24, 0.22)");
  ctx.globalCompositeOperation = "source-atop";
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, s, s);
  ctx.globalCompositeOperation = "source-over";

  // a few twig lines threading through, to sell the structure
  ctx.strokeStyle = "rgba(28, 28, 22, 0.36)";
  for (let i = 0; i < 14; i++) {
    const a = rng() * TAU;
    const rr = s * (0.05 + rng() * 0.32);
    ctx.lineWidth = 0.9 + rng() * 2.1;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.quadraticCurveTo(
      cx + Math.cos(a) * rr * 0.6,
      cy + Math.sin(a) * rr * 0.6,
      cx + Math.cos(a) * rr,
      cy + Math.sin(a) * rr * 0.8
    );
    ctx.stroke();
  }

  return tex(canvas);
}

/** a small spray of pointed leaves on a twig: fine detail for the crown */
export function makeSprigTexture(seed: number): THREE.CanvasTexture {
  const s = 256;
  const [canvas, ctx] = canvas2d(s, s);
  const rng = mulberry32(seed ^ 0x5a17);

  const baseX = s / 2 + (rng() - 0.5) * 22;
  const lean = (rng() - 0.5) * 52;
  const topX = s / 2 + lean;
  const topY = 16;

  // the twig
  ctx.strokeStyle = "rgba(44, 38, 28, 0.92)";
  ctx.lineWidth = 2.1;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(baseX, s - 4);
  ctx.quadraticCurveTo(baseX + lean * 0.35, s * 0.52, topX, topY);
  ctx.stroke();

  const leafAt = (px: number, py: number, ang: number, len: number, wid: number, lum: number): void => {
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(ang);
    ctx.fillStyle = `rgba(${lum * 0.5}, ${lum * 0.95}, ${lum * 0.5}, ${0.9 + rng() * 0.1})`;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(len * 0.42, -wid, len, 0);
    ctx.quadraticCurveTo(len * 0.42, wid, 0, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = `rgba(${lum * 1.1}, ${lum * 1.4}, ${lum * 1.0}, 0.3)`;
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(len * 0.08, 0);
    ctx.lineTo(len * 0.86, 0);
    ctx.stroke();
    ctx.restore();
  };

  const n = 15;
  for (let i = 0; i < n; i++) {
    const t = 0.1 + (i / n) * 0.84;
    const px = baseX + (topX - baseX) * t + Math.sin(t * 4.2) * 3;
    const py = s - 4 + (topY - (s - 4)) * t;
    const side = i % 2 === 0 ? -1 : 1;
    const len = (16 + rng() * 18) * (1 - t * 0.22);
    const wid = len * (0.3 + rng() * 0.16);
    const ang = side > 0 ? -(0.12 + rng() * 0.62) : Math.PI + (0.12 + rng() * 0.62);
    // small twiglet out to the leaf base
    ctx.strokeStyle = "rgba(40, 35, 26, 0.7)";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + Math.cos(ang) * len * 0.3, py + Math.sin(ang) * len * 0.3);
    ctx.stroke();
    const lum = 14 + rng() * 26 + (1 - t) * 10;
    leafAt(px, py, ang, len, wid, lum);
  }

  // a terminal cluster
  for (let i = 0; i < 4; i++) {
    const ang = -Math.PI / 2 + (i - 1.5) * 0.5 + (rng() - 0.5) * 0.3;
    leafAt(topX, topY + 4, ang, 16 + rng() * 12, 5 + rng() * 3, 22 + rng() * 22);
  }

  return tex(canvas);
}

export function makeFernTexture(seed: number): THREE.CanvasTexture {
  const s = 256;
  const [canvas, ctx] = canvas2d(s, s);
  const rng = mulberry32(seed);
  ctx.translate(s / 2, s - 6);
  const fronds = 9;
  for (let f = 0; f < fronds; f++) {
    const angle = -Math.PI / 2 + ((f - (fronds - 1) / 2) / fronds) * 2.35 + (rng() - 0.5) * 0.15;
    const len = s * (0.42 + rng() * 0.2);
    const tipX = Math.cos(angle) * len;
    const tipY = Math.sin(angle) * len;
    ctx.strokeStyle = `rgba(96, 118, 82, ${0.75 + rng() * 0.2})`;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(tipX * 0.45, tipY * 0.62, tipX, tipY);
    ctx.stroke();
    const leaflets = 11;
    for (let i = 1; i < leaflets; i++) {
      const t = i / leaflets;
      const px = tipX * t + (rng() - 0.5) * 3;
      const py = tipY * t * (1 - t * 0.12);
      const l = (1 - t) * 17 + 4;
      const spread = 0.9;
      ctx.strokeStyle = `rgba(${78 + rng() * 40}, ${104 + rng() * 42}, ${70 + rng() * 30}, ${0.55 + rng() * 0.3})`;
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px + Math.cos(angle + spread) * l, py + Math.sin(angle + spread) * l);
      ctx.moveTo(px, py);
      ctx.lineTo(px + Math.cos(angle - spread) * l, py + Math.sin(angle - spread) * l);
      ctx.stroke();
    }
  }
  return tex(canvas);
}

export function makeGrassTexture(seed: number, variant = 0): THREE.CanvasTexture {
  const w = 192;
  const h = 384;
  const [canvas, ctx] = canvas2d(w, h);
  const rng = mulberry32(seed);
  const blades = variant === 1 ? 9 : variant === 2 ? 20 : 15;
  const broad = variant === 1 ? 1.75 : variant === 2 ? 0.8 : 1;
  ctx.lineCap = "round";

  for (let i = 0; i < blades; i++) {
    const baseX = w * (0.08 + rng() * 0.84);
    const lean = (rng() - 0.5) * 78;
    const height = h * (0.4 + rng() * 0.56);
    const width = (2.1 + rng() * 3.6) * broad;
    const dry = rng() < 0.18;
    const grad = ctx.createLinearGradient(baseX, h, baseX + lean, h - height);
    if (dry) {
      grad.addColorStop(0, "rgba(34, 34, 20, 0.96)");
      grad.addColorStop(0.5, "rgba(96, 94, 58, 0.98)");
      grad.addColorStop(0.84, "rgba(112, 106, 68, 1)");
      grad.addColorStop(1, "rgba(168, 158, 112, 1)");
    } else {
      grad.addColorStop(0, "rgba(16, 22, 12, 0.96)");
      grad.addColorStop(0.42, "rgba(55, 74, 40, 0.98)");
      grad.addColorStop(0.8, "rgba(84, 104, 60, 1)");
      grad.addColorStop(1, "rgba(148, 166, 106, 1)");
    }
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(baseX - width / 2, h);
    ctx.quadraticCurveTo(baseX - width * 0.3 + lean * 0.4, h - height * 0.58, baseX + lean, h - height);
    ctx.quadraticCurveTo(baseX + width * 0.34 + lean * 0.4, h - height * 0.55, baseX + width / 2, h);
    ctx.closePath();
    ctx.fill();

    // a cool moonlit edge down one side of the blade
    ctx.strokeStyle = dry ? "rgba(226, 216, 168, 0.16)" : "rgba(150, 180, 150, 0.13)";
    ctx.lineWidth = Math.max(0.7, width * 0.2);
    ctx.beginPath();
    ctx.moveTo(baseX - width * 0.16, h);
    ctx.quadraticCurveTo(baseX - width * 0.1 + lean * 0.44, h - height * 0.56, baseX + lean, h - height);
    ctx.stroke();
  }

  // seed heads on the dry variant: pale oats catching the moon
  if (variant === 2) {
    for (let i = 0; i < 6; i++) {
      const x = w * (0.18 + rng() * 0.64);
      const lean = (rng() - 0.5) * 40;
      const topY = h * (0.1 + rng() * 0.28);
      ctx.strokeStyle = "rgba(158, 154, 118, 0.72)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x, h);
      ctx.quadraticCurveTo(x + lean * 0.4, h * 0.5, x + lean, topY);
      ctx.stroke();
      ctx.fillStyle = "rgba(214, 206, 166, 0.9)";
      for (let k = 0; k < 6; k++) {
        const t = k / 6;
        ctx.beginPath();
        ctx.ellipse(
          x + lean * (0.8 + t * 0.2),
          topY + t * 26,
          1.5,
          3.6,
          0.4,
          0,
          TAU
        );
        ctx.fill();
      }
    }
  }
  return tex(canvas);
}

export function makeMossTexture(seed: number): THREE.CanvasTexture {
  const w = 64;
  const h = 256;
  const [canvas, ctx] = canvas2d(w, h);
  const rng = mulberry32(seed);
  for (let i = 0; i < 80; i++) {
    const x = rng() * w;
    const len = h * (0.25 + rng() * 0.72);
    const a = 0.12 + rng() * 0.4;
    ctx.strokeStyle = `rgba(196, 196, 158, ${a})`;
    ctx.lineWidth = 0.6 + rng() * 1.4;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.bezierCurveTo(x + (rng() - 0.5) * 10, len * 0.4, x + (rng() - 0.5) * 16, len * 0.8, x + (rng() - 0.5) * 20, len);
    ctx.stroke();
  }
  return tex(canvas);
}

/* ------------------------------------------------------------------ */
/* trail, leaves                                                       */
/* ------------------------------------------------------------------ */

/** a worn dirt trail with soft grassy edges; tiles along its length */
export interface TrailTextures {
  map: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
}

export function makeTrailTextures(seed: number): TrailTextures {
  const w = 256;
  const h = 512;
  const [canvas, ctx] = canvas2d(w, h);
  const noise = makeNoise(seed ^ 0x71a3);
  const fine = makeNoise(seed ^ 0x2b9d);
  const rng = mulberry32(seed ^ 0x4c11);
  const heights = new Float32Array(w * h);

  // two worn ruts either side of a raised crown
  const rut = (u: number, v: number): number => {
    const a = Math.exp(-Math.pow((u - 0.33) / 0.08, 2));
    const b = Math.exp(-Math.pow((u - 0.67) / 0.08, 2));
    const wobble = 0.006 * Math.sin(v * 21.0) + 0.004 * Math.sin(v * 57.0 + 1.3);
    const packed = 0.55 + 0.45 * (noise(v * 4.0, 0.5) * 0.5 + 0.5);
    return (a + b) * packed + wobble;
  };

  const img = ctx.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const u = x / w;
      const v = y / h;
      // ragged edges that meander down the trail
      const wob = noise(v * 3.1 + 4.2, 0.5) * 0.06 + noise(v * 9.3, 8.1) * 0.025;
      const edge = 0.5 - Math.abs(u - 0.5);
      const inner = smoothstep(0.1, 0.3, edge + wob);
      const grit = fine(x * 0.12, y * 0.12) * 0.5 + 0.5;
      const n = noise(x * 0.03, y * 0.03) * 0.5 + 0.5;
      const r = rut(u, v);
      // damp, compacted patches so the mud is not a flat brown sheet
      const damp = smoothstep(0.55, 0.78, noise(x * 0.012 + 3, y * 0.012 + 9) * 0.5 + 0.5);
      const base = clamp(0.34 + n * 0.15 + grit * 0.13 - r * 0.1 - damp * 0.07, 0, 1);
      // mossy grass creeping in at the verge
      const fleck = fine(x * 0.55, y * 0.55) * 0.5 + 0.5;
      const green = clamp(smoothstep(0.5, 0.32, edge + wob) * fleck * 1.5, 0, 1);
      const i = (y * w + x) * 4;
      img.data[i] = Math.round(clamp(base * 1.1 * (1 - green * 0.55) + green * 0.04, 0, 1) * 255);
      img.data[i + 1] = Math.round(clamp(base * 1.0 * (1 - green * 0.4) + green * 0.17, 0, 1) * 255);
      img.data[i + 2] = Math.round(clamp(base * 0.85 * (1 - green * 0.65) + green * 0.06, 0, 1) * 255);
      img.data[i + 3] = Math.round(inner * 255);
      heights[y * w + x] = base - r * 0.16 + grit * 0.06 - damp * 0.04;
    }
  }
  ctx.putImageData(img, 0, 0);

  // scattered pebbles and twigs pressed into the dirt, clipped to the trail
  ctx.globalCompositeOperation = "source-atop";
  for (let i = 0; i < 300; i++) {
    const x = w * (0.12 + rng() * 0.76);
    const y = rng() * h;
    const r = 0.8 + Math.pow(rng(), 2) * 3.1;
    const rot = rng() * TAU;
    // contact shadow
    ctx.fillStyle = `rgba(8, 7, 5, ${0.28 + rng() * 0.3})`;
    ctx.beginPath();
    ctx.ellipse(x + r * 0.35, y + r * 0.4, r * 1.15, r * 0.72, rot, 0, TAU);
    ctx.fill();
    // stone
    const l = 0.28 + rng() * 0.36;
    ctx.fillStyle = `rgba(${l * 255}, ${l * 244}, ${l * 220}, ${0.5 + rng() * 0.4})`;
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * (0.5 + rng() * 0.6), rot, 0, TAU);
    ctx.fill();
    // moonlit top facet
    ctx.fillStyle = `rgba(${l * 255 + 40}, ${l * 244 + 36}, ${l * 220 + 30}, 0.5)`;
    ctx.beginPath();
    ctx.ellipse(x - r * 0.22, y - r * 0.24, r * 0.5, r * 0.3, rot, 0, TAU);
    ctx.fill();
  }
  // a few dark twigs
  for (let i = 0; i < 40; i++) {
    const x = w * (0.14 + rng() * 0.72);
    const y = rng() * h;
    ctx.strokeStyle = `rgba(22, 18, 13, ${0.5 + rng() * 0.4})`;
    ctx.lineWidth = 0.6 + rng() * 1.1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + (rng() - 0.5) * 14, y + (rng() - 0.5) * 8, x + (rng() - 0.5) * 26, y + (rng() - 0.5) * 16);
    ctx.stroke();
  }
  ctx.globalCompositeOperation = "source-over";

  const map = tex(canvas);
  map.wrapS = THREE.ClampToEdgeWrapping;
  // mirrored tiling hides the repeat seam that otherwise bands the path
  map.wrapT = THREE.MirroredRepeatWrapping;

  // normal map from the height field so ruts catch the moonlight
  const [cNorm, nctx] = canvas2d(w, h);
  const nimg = nctx.createImageData(w, h);
  const at = (x: number, y: number): number =>
    heights[((y + h) % h) * w + ((x + w) % w)];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * 3.2;
      const dy = (at(x, y + 1) - at(x, y - 1)) * 3.2;
      const i = (y * w + x) * 4;
      nimg.data[i] = Math.round(clamp(0.5 + dx, 0, 1) * 255);
      nimg.data[i + 1] = Math.round(clamp(0.5 + dy, 0, 1) * 255);
      nimg.data[i + 2] = 255;
      nimg.data[i + 3] = 255;
    }
  }
  nctx.putImageData(nimg, 0, 0);
  const normalMap = tex(cNorm, false);
  normalMap.wrapS = THREE.ClampToEdgeWrapping;
  normalMap.wrapT = THREE.MirroredRepeatWrapping;

  return { map, normalMap };
}

/** a single fallen leaf, gently pointed */
export function makeFlowerTexture(seed: number): THREE.CanvasTexture {
  const w = 128;
  const h = 256;
  const [canvas, ctx] = canvas2d(w, h);
  const rng = mulberry32(seed ^ 0x51c3);
  // a little spray of pale night-blooming flowers on thin stems
  const stems = 4 + Math.floor(rng() * 3);
  for (let s = 0; s < stems; s++) {
    const baseX = w * (0.18 + rng() * 0.64);
    const lean = (rng() - 0.5) * 54;
    const topY = h * (0.16 + rng() * 0.42);
    ctx.strokeStyle = `rgba(96, 118, 82, ${0.6 + rng() * 0.3})`;
    ctx.lineWidth = 1.4 + rng();
    ctx.beginPath();
    ctx.moveTo(baseX, h);
    ctx.quadraticCurveTo(baseX + lean * 0.35, h * 0.6, baseX + lean, topY);
    ctx.stroke();

    // a small leaf near the stem
    ctx.fillStyle = "rgba(86, 108, 74, 0.7)";
    ctx.beginPath();
    ctx.ellipse(baseX + lean * 0.3, h * 0.66, 7, 2.6, -0.5, 0, TAU);
    ctx.fill();

    const cx = baseX + lean;
    const cy = topY;
    const petals = 5 + Math.floor(rng() * 2);
    const r = 7 + rng() * 6;
    const warm = rng();
    const pale = warm > 0.45 ? [220, 226, 238] : [232, 220, 236];
    for (let p = 0; p < petals; p++) {
      const a = (p / petals) * TAU + rng() * 0.2;
      ctx.fillStyle = `rgba(${pale[0]}, ${pale[1]}, ${pale[2]}, ${0.72 + rng() * 0.26})`;
      ctx.beginPath();
      ctx.ellipse(cx + Math.cos(a) * r * 0.5, cy + Math.sin(a) * r * 0.5, r * 0.46, r * 0.3, a, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = "rgba(218, 188, 128, 0.95)";
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.26, 0, TAU);
    ctx.fill();
  }
  return tex(canvas);
}

export function makeLeafTexture(seed: number): THREE.CanvasTexture {
  const s = 64;
  const [canvas, ctx] = canvas2d(s, s);
  const rng = mulberry32(seed ^ 0x7eaf);
  ctx.translate(s / 2, s / 2);
  const grad = ctx.createLinearGradient(0, -s * 0.4, 0, s * 0.4);
  grad.addColorStop(0, "#b98a4a");
  grad.addColorStop(0.55, "#8a5f2e");
  grad.addColorStop(1, "#5d3f20");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(0, -s * 0.42);
  ctx.bezierCurveTo(s * 0.36, -s * 0.24, s * 0.32, s * 0.2, 0, s * 0.42);
  ctx.bezierCurveTo(-s * 0.32, s * 0.2, -s * 0.36, -s * 0.24, 0, -s * 0.42);
  ctx.closePath();
  ctx.fill();
  // midrib
  ctx.strokeStyle = "rgba(60, 38, 18, 0.55)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(0, -s * 0.38);
  ctx.lineTo(0, s * 0.38);
  ctx.stroke();
  // a few dark speckles
  for (let i = 0; i < 14; i++) {
    ctx.fillStyle = `rgba(50, 30, 12, ${0.15 + rng() * 0.25})`;
    ctx.beginPath();
    ctx.arc((rng() - 0.5) * s * 0.4, (rng() - 0.5) * s * 0.5, 0.6 + rng() * 1.4, 0, TAU);
    ctx.fill();
  }
  return tex(canvas);
}

export interface GroundTextures {
  map: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
}

export function makeGroundTextures(seed: number): GroundTextures {
  const size = 256;
  const [cMap, ctx] = canvas2d(size, size);
  const noise = makeNoise(seed ^ 0x22a1);
  const detail = makeNoise(seed ^ 0x9913);
  const heights = new Float32Array(size * size);

  const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const n =
        noise(x * 0.035, y * 0.035) * 0.5 +
        noise(x * 0.11, y * 0.11) * 0.26 +
        detail(x * 0.34, y * 0.34) * 0.14;
      heights[y * size + x] = n;
      const v = 0.56 + n * 0.3;
      const grit = detail(x * 0.9, y * 0.9) * 0.12;
      const i = (y * size + x) * 4;
      img.data[i] = Math.round(clamp((v + grit) * 255, 0, 255));
      img.data[i + 1] = Math.round(clamp((v * 0.98 + grit) * 255, 0, 255));
      img.data[i + 2] = Math.round(clamp((v * 0.9 + grit) * 255, 0, 255));
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  // a few pebbles and cracks
  const rng = mulberry32(seed ^ 0x3377);
  for (let i = 0; i < 260; i++) {
    const x = rng() * size;
    const y = rng() * size;
    const r = 0.6 + rng() * 2.2;
    const l = rng() < 0.5 ? 0.3 : 0.72;
    ctx.fillStyle = `rgba(${l * 255}, ${l * 246}, ${l * 228}, ${0.25 + rng() * 0.35})`;
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * (0.6 + rng() * 0.6), rng() * TAU, 0, TAU);
    ctx.fill();
  }

  ctx.lineCap = "round";
  for (let i = 0; i < 600; i++) {
    const x = rng() * size;
    const y = rng() * size;
    ctx.strokeStyle = i % 3 === 0 ? "rgba(187,143,43,0.55)" : "rgba(48,92,52,0.55)";
    ctx.lineWidth = 1 + rng() * 3;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + 6, y - 4, x + 14, y - 2);
    ctx.stroke();
  }
  const map = tex(cMap);
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(64, 64);

  const [cNorm, nctx] = canvas2d(size, size);
  const nimg = nctx.createImageData(size, size);
  const at = (x: number, y: number): number =>
    heights[((y + size) % size) * size + ((x + size) % size)];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * 2.4;
      const dy = (at(x, y + 1) - at(x, y - 1)) * 2.4;
      const i = (y * size + x) * 4;
      nimg.data[i] = Math.round(clamp(0.5 + dx, 0, 1) * 255);
      nimg.data[i + 1] = Math.round(clamp(0.5 + dy, 0, 1) * 255);
      nimg.data[i + 2] = 255;
      nimg.data[i + 3] = 255;
    }
  }
  nctx.putImageData(nimg, 0, 0);
  const normalMap = tex(cNorm, false);
  normalMap.wrapS = normalMap.wrapT = THREE.RepeatWrapping;
  normalMap.repeat.set(64, 64);

  return { map, normalMap };
}


/* ------------------------------------------------------------------ */
/* moon                                                                */
/* ------------------------------------------------------------------ */

export function makeMoonTexture(seed: number): THREE.CanvasTexture {
  const size = 256;
  const [canvas, ctx] = canvas2d(size, size);
  const rng = mulberry32(seed);
  const grad = ctx.createRadialGradient(size * 0.42, size * 0.38, size * 0.05, size / 2, size / 2, size / 2);
  grad.addColorStop(0, "#f8eed6");
  grad.addColorStop(0.55, "#ded2b8");
  grad.addColorStop(0.86, "#b9ad96");
  grad.addColorStop(1, "#8e8474");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, TAU);
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 1, 0, TAU);
  ctx.clip();

  // maria
  for (let i = 0; i < 7; i++) {
    const x = size * (0.2 + rng() * 0.6);
    const y = size * (0.2 + rng() * 0.6);
    const r = size * (0.09 + rng() * 0.18);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, "rgba(108, 102, 92, 0.5)");
    g.addColorStop(0.7, "rgba(120, 114, 102, 0.22)");
    g.addColorStop(1, "rgba(150, 142, 128, 0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
  }

  // craters
  for (let i = 0; i < 130; i++) {
    const x = rng() * size;
    const y = rng() * size;
    const r = 1 + Math.pow(rng(), 2.4) * 14;
    const shade = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r);
    shade.addColorStop(0, "rgba(255, 252, 240, 0.3)");
    shade.addColorStop(0.55, "rgba(120, 112, 98, 0.4)");
    shade.addColorStop(0.9, "rgba(90, 84, 72, 0.22)");
    shade.addColorStop(1, "rgba(226, 218, 200, 0.14)");
    ctx.fillStyle = shade;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
    if (r > 3) {
      ctx.strokeStyle = "rgba(255, 250, 238, 0.2)";
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.arc(x, y, r * 0.92, 0, TAU);
      ctx.stroke();
    }
  }

  // limb darkening + a soft terminator so it reads as a sphere
  const limb = ctx.createRadialGradient(size * 0.46, size * 0.46, size * 0.2, size * 0.5, size * 0.5, size * 0.5);
  limb.addColorStop(0, "rgba(0,0,0,0)");
  limb.addColorStop(0.75, "rgba(10, 9, 8, 0.12)");
  limb.addColorStop(1, "rgba(8, 7, 6, 0.5)");
  ctx.fillStyle = limb;
  ctx.fillRect(0, 0, size, size);
  const term = ctx.createLinearGradient(0, 0, size, size);
  term.addColorStop(0, "rgba(0,0,0,0)");
  term.addColorStop(1, "rgba(6, 8, 12, 0.24)");
  ctx.fillStyle = term;
  ctx.fillRect(0, 0, size, size);
  ctx.restore();
  ctx.globalCompositeOperation = "source-atop";
  ctx.lineCap = "round";
  for (let i = 0; i < 480; i++) {
    const a = rng() * TAU;
    const r = Math.sqrt(rng()) * size * 0.5;
    ctx.strokeStyle = i % 3 === 0 ? "#fff4ad" : i % 3 === 1 ? "#e8b62e" : "#f6db59";
    ctx.lineWidth = 2 + rng() * 4;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, r, a, a + 0.1 + rng() * 0.3);
    ctx.stroke();
  }
  return tex(canvas);
}
