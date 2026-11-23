import { sculpture } from "./sculpt";

export function bonfire() {
  const s = sculpture(31, 41, 27);
  // Dark ash bed with pale charred bones, ribs and skulls emerging around the mound.
  s.orb([0, 1, 0], [14, 2, 11], (x, _y, z) => {
    const r = Math.hypot(x / 14, z / 11);
    return r > 0.82 ? "#3d353a" : r > 0.55 ? "#52464a" : "#6c4b42";
  });
  s.orb([0, 3, 0], [10, 3, 8], (x, y, z) =>
    y > 1 && Math.hypot(x, z) < 5 ? "#8b4b38" : (x + z) % 3 === 0 ? "#685c5d" : "#4a3f44");
  for (const [x0, z0, x1, z1, y0, y1] of [
    [-11, -3, -3, 2, 2, 5], [10, -4, 3, 1, 2, 5], [-8, 7, -2, 2, 2, 5],
    [9, 6, 3, 2, 2, 5], [-4, -8, 1, -2, 2, 5], [4, 8, -1, 3, 2, 4],
  ]) {
    s.rod([x0, y0, z0], [x1, y1, z1], 1, "#d8cbb8");
    s.orb([x0, y0, z0], [2, 1, 2], "#efe4d2");
  }
  for (const [sx, sy, sz] of [[-7, 4, 4], [7, 4, -2], [2, 4, 7]]) {
    s.orb([sx, sy, sz], [2, 2, 2], "#e2d5c1");
    s.dot(sx, sy, sz + 2, "#393036");
    s.dot(sx + 1, sy, sz + 2, "#393036");
  }
  // Multi-tiered roaring flames hugging the lower blade.
  for (const [x, z, h, w] of [[0, 0, 19, 4], [4, 1, 13, 3], [-4, -1, 15, 3], [1, 4, 11, 2], [-2, -4, 12, 2]]) {
    for (let y = 4; y < h; y++) {
      const t = (y - 4) / (h - 4);
      const r = Math.max(1, Math.round(w * (1 - t * 0.78)));
      const sway = Math.round(Math.sin(y * 0.52 + x) * (1 + t));
      s.orb([x + sway, y, z], [r, 1, r], (px, _py, pz) =>
        Math.hypot(px, pz) < r * 0.55 && y < h - 4 ? "#fff0a6" : y < 12 ? "#ff9b3d" : "#e3552b");
    }
  }
  // Iconic coiled iron sword planted at a dramatic tilt: helical blade, curved quillons, wrapped grip.
  for (let y = 5; y <= 28; y++) {
    const cx = Math.round((y - 6) * 0.18);
    const phase = (y - 5) * 0.58;
    const tx = Math.round(1.9 * Math.cos(phase));
    const tz = Math.round(1.6 * Math.sin(phase));
    const hot = y < 14;
    s.box(cx - 1, y, -1, cx + 1, y, 0, hot ? "#6a433e" : "#3b3842");
    s.orb([cx + tx, y, tz], [1, 0, 1], hot ? "#ffae5c" : "#8b8382");
    s.dot(cx - tx, y, -tz, hot ? "#d6683c" : "#55505c");
  }
  // Swept S-arched crossguard with curled finials.
  s.rod([-3, 26, 0], [4, 29, 0], 1, "#554b4d");
  s.rod([4, 29, 0], [11, 27, 0], 1, "#9a8a78");
  s.dot(-4, 25, 0, "#8b7c6d");
  s.dot(12, 26, 0, "#b8a68e");
  // Grip & pommel.
  s.rod([4, 29, 0], [6, 37, 0], 1, "#5c3f34");
  for (let y = 30; y <= 36; y += 2) s.dot(5 + Number(y >= 34), y, 1, "#c09866");
  s.orb([6, 38, 0], [2, 2, 2], "#b8a384");
  return s;
}

export function plasmaBlade() {
  const s = sculpture(79, 87, 29);
  // Subtle dark basalt cradle leaving the Covenant hilt and emitters clearly visible.
  for (const [x, z, w, h] of [[-5, -2, 8, 4], [5, 1, 7, 3], [0, -4, 6, 6]]) {
    s.orb([x, 0, z], [w, h, 5], (px, py, pz) => py + pz * 0.5 > h * 0.65 ? "#5b6a78" : px < 0 ? "#2e3847" : "#3e4b58");
  }
  function bladePoint(x: number, y: number, z: number): [number, number, number] {
    return [Math.round(x * 0.94 + y * 0.34 - 4), Math.round(y * 0.94 - x * 0.34 + 7), z];
  }
  // Sleek curved metallic Covenant cross-grip and twin plasma emitter housings.
  s.rod(bladePoint(-11, 11, 0), bladePoint(11, 11, 0), 2, "#595e75");
  s.rod(bladePoint(-8, 12, 1), bladePoint(8, 12, 1), 1, "#c4cbd9");
  s.orb(bladePoint(0, 11, 0), [3, 2, 2], "#42465b");
  for (let x = -6; x <= 6; x += 3) s.dot(...bladePoint(x, 11, 2), "#d6dced");
  for (const side of [-1, 1]) {
    s.rod([side * 4, 2, -2], bladePoint(side * 10, 11, -2), 1, "#454a60");
    s.rod(bladePoint(side * 4, 13, 0), bladePoint(side * 11, 15, 0), 1, "#70728f");
    s.orb(bladePoint(side * 11, 12, 0), [3, 4, 2], "#4d4c6b");
    s.orb(bladePoint(side * 11, 13, 1), [2, 3, 2], "#ced4e6");
    // Glowing cyan plasma emitter vents feeding the blade roots.
    s.orb(bladePoint(side * 10, 16, 1), [2, 2, 1], "#aef7ff");
  }
  // Parallel-curving twin plasma blades: hooked Covenant heel, fuller midsection,
  // clean central channel, and sweeping parallel needle tips.
  const outline = [
    [0.00, 8, 9],
    [0.06, 9, 16],
    [0.14, 10, 20],
    [0.22, 8, 19],
    [0.32, 5, 16],
    [0.45, 4, 13],
    [0.62, 4, 11],
    [0.80, 4, 8],
    [0.92, 4, 6],
    [1.00, 5, 5],
  ];
  for (const side of [-1, 1]) {
    const length = side > 0 ? 75 : 73;
    const rows = Array.from({ length: length + 1 }, (_, y) => {
      const t = y / length, k = outline.findIndex((p, i) => i > 0 && p[0] >= t);
      const a = outline[k - 1], b = outline[k], f = (t - a[0]) / (b[0] - a[0]);
      const inner = Math.round(a[1] + (b[1] - a[1]) * f), outer = Math.round(a[2] + (b[2] - a[2]) * f);
      return { inner, outer, ridge: inner + Math.round((outer - inner) * 0.45) };
    });
    for (let py = 4; py < s.voxels.height; py++) for (let x = -39; x <= 39; x++) {
      const i = side * Math.round((x + 4) * 0.94 - (py - 7) * 0.34);
      const y = Math.round((py - 7) * 0.94 + (x + 4) * 0.34);
      if (!rows[y]) continue;
      const { inner, outer, ridge } = rows[y];
      if (i < inner || i > outer) continue;
      const dx = Math.abs(i - ridge);
      const depth = Math.max(0, Math.min(i - inner, outer - i, 3 - Math.floor(dx / 3)));
      const z = -Math.round(6 * y / length);
      const vein = Math.abs(i - ridge - Math.round(1.2 * Math.sin(y * 0.28))) < 1;
      const ink = i === outer ? "#f6ffff" : i === inner ? "#d7d0ff" : vein || dx <= 1 ? "#ecffff" :
        dx <= 2 ? "#7be0ff" : i < ridge ? "#6b66e8" : "#58aef8";
      s.box(x, py, z - depth, x, py, z + depth, ink);
    }
  }
  return s;
}

export function teleporter() {
  const s = sculpture(61, 42, 53), slate = "#3c435f", basalt = "#262d46", ridge = "#626a8a";
  // Broad stepped circular stone dais with concentric bevel rings.
  for (let y = 0; y <= 5; y++) {
    const extent = 28 - Math.floor(y / 2) * 2;
    s.orb([0, y, 0], [extent, 1, extent - 4], (x, _py, z) => {
      const r = Math.hypot(x, z * extent / (extent - 4));
      if (y === 5 && Math.abs(r - 18) < 1.1) return "#645a78";
      if (y === 5 && Math.abs(r - 11) < 0.9) return "#4f4a68";
      return r > extent - 1.8 ? (y % 2 ? "#424a66" : "#5b627f") : basalt;
    });
  }
  // Bold curved stone prongs sweeping outward and curving inward like giant parentheses.
  for (const side of [-1, 1]) {
    for (let y = 5; y <= 39; y++) {
      const t = (y - 5) / 34;
      const breadth = Math.max(1, Math.round(5.6 * (1 - t) ** 1.15));
      const x = side * Math.round(18 + 7 * Math.sin(t * Math.PI) - 7 * t ** 2.6);
      const z = -3 - Math.round(3 * t);
      for (let dx = -breadth; dx <= breadth; dx++) {
        const depth = Math.max(0, Math.round((breadth - Math.abs(dx)) * 0.85));
        const edgeLight = side * dx < 0;
        const ink = Math.abs(dx) === breadth ? ridge : edgeLight ? "#555c7c" : slate;
        s.box(x + dx, y, z - depth, x + dx, y, z + depth, ink);
        if (dx === 0 && y < 30) s.dot(x, y, z + depth, y < 11 ? "#c66376" : "#6b7294");
      }
    }
  }
  // Ring of small stone nodules around the platform.
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4, x = Math.round(Math.sin(a) * 16), z = Math.round(Math.cos(a) * 11);
    s.orb([x, 6, z], [1, 1, 1], "#7b6c88");
  }
  // Central floating crimson-orange energy core above its stone socket.
  s.orb([0, 7, -1], [5, 2, 5], "#454c68");
  s.orb([0, 11, -1], [3, 4, 3], (x, y, z) =>
    Math.hypot(x, y, z) < 1.8 ? "#ffd79c" : y > 0 ? "#f26b5e" : "#b53c4c");
  s.dot(0, 15, -1, "#ffbe8c");
  // Four-string ukulele resting across the front lip: clear figure-8 body, soundhole, frets, pegs.
  s.orb([-10, 8, 16], [5, 2, 4], "#874736"); s.orb([-3, 8, 14], [4, 2, 3], "#9e5c44");
  s.orb([-10, 10, 16], [5, 1, 4], "#ba7150"); s.orb([-3, 10, 14], [4, 1, 3], "#ba7150");
  s.orb([-4, 11, 14], [2, 1, 2], "#2f242c");
  s.box(-10, 11, 15, -9, 11, 17, "#4b322f");
  s.rod([0, 10, 13], [13, 10, 7], 1, "#5c3b3c");
  s.box(12, 10, 4, 16, 11, 8, "#8c4e44");
  for (let k = 1; k <= 4; k++) {
    s.dot(Math.round(k * 2.8), 11, Math.round(13 - k * 1.4), "#d9ccb4");
  }
  s.rod([-9, 12, 17], [14, 12, 7], 0, "#e6d2b5");
  s.rod([-9, 12, 15], [14, 12, 5], 0, "#cabca6");
  for (const x of [13, 15]) for (const z of [4, 9]) s.dot(x, 11, z, "#d4d8d2");
  return s;
}

export function fieldKit() {
  const s = sculpture(31, 23, 13);
  for (let y = 1; y <= 16; y++) for (let z = -5; z <= 5; z++) for (let x = -13; x <= 13; x++) {
    const fold = Math.max(0, Math.abs(x) - 9) ** 2 + Math.max(0, Math.abs(y - 8) - 4) ** 2 + Math.max(0, Math.abs(z) - 2) ** 2;
    if (fold <= 23) s.dot(x, y, z, y < 3 ? "#6c363a" : fold > 17 || z < -3 ? "#b03d3e" : "#d44c47");
  }
  // Molded reinforcement straps & clasps.
  for (const x of [-9, 9]) {
    s.box(x, 2, -5, x + 1, 14, -4, "#543a3c");
    s.box(x, 14, -4, x + 1, 16, 4, "#6f4443");
    s.box(x, 3, 5, x, 14, 5, "#8f383a");
  }
  // Raised front panel with crisp white emblem and bold centered red cross.
  s.box(-10, 4, 5, 10, 14, 5, "#cc433e");
  s.box(-10, 4, 6, 10, 4, 6, "#9e3b38");
  for (const x of [-10, 10]) s.box(x, 5, 6, x, 13, 6, "#b54540");
  s.box(-6, 5, 6, 6, 14, 6, "#f4eee0");
  s.box(-1, 6, 6, 1, 13, 6, "#c93132");
  s.box(-4, 9, 6, 4, 10, 6, "#c93132");
  for (const x of [-12, 12]) s.box(x, 5, -2, x, 12, 2, "#9a3838");
  // Dark rubberized carry handle and twin metallic latches.
  for (const x of [-5, 4]) s.box(x, 16, -1, x + 1, 19, 0, "#3b363a");
  s.box(-5, 20, -1, 5, 20, 0, "#433d41");
  s.box(-4, 20, 1, 4, 21, 1, "#6b5450");
  s.box(-11, 15, 1, 11, 16, 2, "#6c4846");
  for (let x = -10; x <= 10; x += 2) s.dot(x, 16, 2, "#d8b48e");
  for (const x of [-9, 9]) {
    s.box(x - 1, 12, -5, x + 1, 14, -5, "#d8c09a");
    s.dot(x, 13, -5, "#544445");
  }
  s.rod([8, 14, 4], [9, 12, 6], 0, "#c8c0b4");
  return s;
}

export function obol() {
  const s = sculpture(27, 7, 27);
  // Thick ancient gold coin with milled/beaded rim and recessed bronze field.
  s.orb([0, 1, 0], [12, 2, 12], (x, _y, z) => {
    const r = Math.hypot(x, z);
    if (r > 10.2) return Math.cos(Math.atan2(z, x) * 20) > 0 ? "#f7cf73" : "#9c6738";
    return "#b0763d";
  });
  for (let z = -11; z <= 11; z++) for (let x = -11; x <= 11; x++) {
    const r = Math.hypot(x, z);
    if (r <= 11.4) {
      const ink = r > 10.1 ? "#ffe699" : r > 9.0 ? "#7a4a28" : "#8f5930";
      s.dot(x, 3, z, ink);
      if (r > 10.3 && Math.cos(Math.atan2(z, x) * 20) > 0.2) s.dot(x, 4, z, "#ffeaa6");
    }
  }
  // High-contrast embossed gold skull relief + flanking laurel pips.
  const stamp = [
    "....######....",
    "..##########..",
    ".############.",
    ".############.",
    ".##...##...##.",
    ".##...##...##.",
    "..####..####..",
    "...########...",
    "....#.##.#....",
    "....#.##.#....",
  ];
  stamp.forEach((row, j) => row.split("").forEach((c, i) => {
    const px = i - 7, pz = j - 5;
    if (c === "#") {
      s.dot(px, 4, pz, i + j < 10 ? "#fff1b8" : "#f4c964");
      if (j <= 3 && i >= 3 && i <= 10) s.dot(px, 5, pz, "#fff4c6");
    }
  }));
  // Deep dark eye sockets & nasal cavity for instant skull readability.
  for (const x of [-3, 2]) s.box(x, 3, -1, x + 1, 3, 0, "#4a2c1c");
  s.dot(0, 3, 1, "#4a2c1c");
  for (const sign of [-1, 1]) for (let z = -5; z <= 5; z += 2) {
    s.dot(sign * (Math.abs(z) < 3 ? 8 : 7), 4, z, "#f2c66a");
  }
  return s;
}

export function placeSetting() {
  const s = sculpture(55, 27, 29);
  for (const x of [-21, 21]) {
    s.rod([x, 0, -12], [x, 15, -5], 2, "#695247");
    s.rod([x, 0, 12], [x, 15, 5], 2, "#795c49");
    s.box(x - 1, 6, -9, x + 1, 7, 9, "#936e50");
  }
  s.box(-21, 6, -1, 21, 8, 1, "#6e5446");
  s.box(-24, 13, -10, 24, 15, 10, "#78604e");
  for (let i = 0; i < 4; i++) {
    s.box(-26, 16, -12 + i * 6, 26, 18, -7 + i * 6, i % 2 ? "#9f7b5e" : "#916d54");
    if (i < 3) s.box(-26, 18, -7 + i * 6, 26, 18, -7 + i * 6, "#6f5343");
  }
  for (const x of [-23, 23]) for (const z of [-10, 9]) s.dot(x, 18, z, "#5c4a42");
  // Pressed metal ration tray: crisp beveled rim, recessed two-part well, khaki paste portion.
  s.box(-20, 19, -8, 1, 20, 8, "#474842");
  s.box(-19, 21, -7, 0, 21, 7, "#b6b298");
  s.box(-18, 21, -6, -1, 21, 6, "#7d7a68");
  s.box(-17, 21, -5, -6, 22, 5, "#4d4c42");
  s.box(-16, 23, -4, -7, 23, 4, "#8a8552");
  for (const [x, z, w] of [[-14, -1, 2], [-10, 1, 3], [-8, -1, 2]]) {
    s.orb([x, 23, z], [w, 1, 2], (px, py) => px < 0 && py >= 0 ? "#b0a76b" : "#928c58");
  }
  // Side compartment + cutlery.
  s.box(-4, 21, -5, -2, 21, 5, "#676558");
  s.rod([3, 20, 5], [6, 20, -5], 0, "#ccd2c2"); s.orb([6, 20, -6], [1, 1, 2], "#aeb8ac");
  // Striped cloth mat and ceramic bowl.
  s.box(11, 19, -10, 18, 19, 10, "#5c7a78");
  for (const x of [12, 17]) s.box(x, 19, -10, x, 19, 10, "#c6c4a4");
  s.orb([14, 21, 4], [3, 2, 3], "#c89a72");
  s.orb([14, 23, 4], [3, 1, 3], "#e8cfa8");
  s.orb([14, 23, 4], [2, 1, 2], "#63463c");
  return s;
}

export function stool() {
  const s = sculpture(17, 16, 17);
  for (const x of [-1, 1]) for (const z of [-1, 1]) {
    s.rod([6*x, 0, 6*z], [4*x, 11, 4*z], 1, "#6c5149");
  }
  for (const side of [-5, 5]) {
    s.rod([side, 4, -5], [side, 4, 5], 1, "#8b674d");
    s.rod([-5, 5, side], [5, 5, side], 0, "#826047");
  }
  for (let z = -7; z <= 7; z++) {
    const w = Math.round(Math.sqrt(62 - z*z));
    s.box(-w, 10, z, w, 12, z, "#70574c");
    s.box(-w, 13, z, w, 13, z, z === -3 || z === 3 ? "#89654b" : z > 3 ? "#a27a56" : "#ac8460");
  }
  return s;
}
