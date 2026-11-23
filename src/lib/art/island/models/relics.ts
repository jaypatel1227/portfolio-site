import { sculpture } from "./sculpt";

export function bonfire() {
  const s = sculpture(29, 35, 25);
  s.orb([0, 1, 0], [13, 2, 10], "#55474a");
  for (let i = 0; i < 11; i++) {
    const a = i * Math.PI * 2 / 11;
    s.orb([Math.round(11 * Math.cos(a)), 2, Math.round(8 * Math.sin(a))], [3, 1 + i % 3, 2], (x, y) => y > 0 ? "#928880" : x > 0 ? "#696366" : "#594e52");
  }
  for (const [x, z, dx, dz] of [[-8, -5, 5, 4], [-8, 4, 6, -3], [-5, -7, 3, 6]]) {
    s.rod([x, 4, z], [dx, 4, dz], 2, "#483737");
    s.rod([x, 5, z], [dx, 5, dz], 0, "#be6544");
  }
  for (const [x, z, h] of [[0, 0, 15], [4, 1, 10], [-4, -1, 13], [0, 4, 8]]) {
    for (let y = 4; y < h; y++) {
      const r = Math.max(1, Math.round(3 * (h - y) / (h - 4)));
      s.orb([x + Math.round(Math.sin(y * 0.46)), y, z], [r, 1, r], (px, _py, pz) =>
        Math.abs(px + pz) < 2 && y < h - 3 ? "#ffdb86" : y < 11 ? "#f79344" : "#e06637");
    }
  }
  // Twisted blackened blade, arched quillons and leather-wrapped grip.
  for (let y = 5; y <= 24; y++) {
    const x = Math.round((y - 6) * 0.22), twist = Math.round(1.5 * Math.sin(y * 0.66));
    s.box(x - 1, y, -1, x + 1, y, 0, "#423e46");
    s.dot(x + twist, y, 1, y < 14 ? "#dc8555" : "#a59a90");
  }
  s.rod([-1, 22, 0], [4, 25, 0], 1, "#5d4c44"); s.rod([4, 25, 0], [10, 24, 0], 1, "#a08768");
  s.rod([4, 25, 0], [6, 32, 0], 1, "#553e34");
  for (let y = 26; y < 32; y += 2) s.dot(5 + Number(y >= 30), y, 1, "#b08e62");
  s.orb([6, 32, 0], [2, 2, 2], "#aa967a");
  return s;
}

export function plasmaBlade() {
  const s = sculpture(79, 85, 29);
  // A split basalt cradle leaves daylight under the cross-grip.
  for (const [x, z, w, h] of [[-5, -3, 11, 5], [6, 1, 9, 3], [1, -5, 7, 9]]) {
    s.orb([x, 0, z], [w, h, 6], (px, py, pz) => py + pz * 0.5 > h * 0.7 ? "#667581" : px < 0 ? "#394455" : "#485561");
  }
  function bladePoint(x: number, y: number, z: number): [number, number, number] {
    return [Math.round(x * 0.93 + y * 0.37 - 4), Math.round(y * 0.93 - x * 0.37 + 8), z];
  }
  s.rod(bladePoint(-10, 12, 0), bladePoint(10, 12, 0), 2, "#575569");
  s.rod(bladePoint(-7, 11, 0), bladePoint(7, 11, 0), 1, "#a7adbc");
  s.orb(bladePoint(0, 12, 0), [3, 2, 2], "#4e4f61");
  for (let x = -6; x <= 6; x += 3) s.dot(...bladePoint(x, 12, 2), "#afa9bd");
  for (const side of [-1, 1]) {
    s.rod([side * 5, 2, -3], bladePoint(side * 10, 12, -3), 1, "#50556a");
    s.rod(bladePoint(side * 3, 14, -1), bladePoint(side * 9, 16, 0), 1, "#635674");
    s.orb(bladePoint(side * 9, 12, 0), [3, 4, 2], "#514769");
    s.orb(bladePoint(side * 10, 12, 1), [2, 3, 2], "#b1b4c6");
  }
  // Inner and outer edges have different breakpoints: a hooked heel, long
  // concave cutting edge and a needle tip, with an open channel between them.
  const outline = [[0, 7, 7], [.08, 10, 13], [.16, 11, 18], [.21, 10, 17],
    [.28, 7, 15], [.34, 3, 12], [.42, 3, 10], [.58, 3, 8], [.8, 4, 6], [1, 4, 4]];
  for (const side of [-1, 1]) {
    const length = side > 0 ? 73 : 71;
    const rows = Array.from({ length: length + 1 }, (_, y) => {
      const t = y / length, k = outline.findIndex((p, i) => i > 0 && p[0] >= t);
      const a = outline[k - 1], b = outline[k], f = (t - a[0]) / (b[0] - a[0]);
      const inner = Math.round(a[1] + (b[1] - a[1]) * f), outer = Math.round(a[2] + (b[2] - a[2]) * f);
      return { inner, outer, ridge: inner + Math.round((outer - inner) * 0.38) };
    });
    for (let py = 4; py < s.voxels.height; py++) for (let x = -39; x <= 39; x++) {
        const i = side * Math.round((x + 4) * 0.93 - (py - 8) * 0.37);
        const y = Math.round((py - 8) * 0.93 + (x + 4) * 0.37);
        if (!rows[y]) continue;
        const { inner, outer, ridge } = rows[y];
        if (i < inner || i > outer) continue;
        const dx = Math.abs(i - ridge), depth = Math.max(0, Math.min(i - inner, outer - i, 3 - Math.floor(dx / 3)));
        const z = -Math.round(7 * y / length);
        const vein = Math.abs(i - ridge - Math.round(1.5 * Math.sin(y * 0.25))) < 1;
        const ink = i === outer ? "#f4ffff" : i === inner ? "#d0c6ff" : vein ? "#defdff" :
          i < ridge ? "#806ee1" : dx < 3 ? "#699aec" : "#79d0ff";
        s.box(x, py, z - depth, x, py, z + depth, ink);
    }
  }
  return s;
}

export function teleporter() {
  const s = sculpture(59, 38, 51), slate = "#373c57", basalt = "#252d46";
  for (let y = 0; y <= 4; y++) {
    const extent = 27 - Math.floor(y / 2) * 2;
    s.orb([0, y, 0], [extent, 1, extent - 4], (x, _py, z) => {
      const r = Math.hypot(x, z * extent / (extent - 4));
      if (y === 4 && Math.abs(r - 18) < 0.8) return "#4d4760";
      return r > extent - 1.6 ? y % 2 ? "#363d55" : "#4b4e65" : basalt;
    });
  }
  for (const side of [-1, 1]) {
    for (let y = 4; y <= 35; y++) {
      const t = (y - 4) / 31, breadth = Math.max(1, Math.round(5 * (1 - t) ** 1.25));
      const x = side * Math.round(18 + 5 * Math.sin(t * Math.PI) - 5 * t ** 3);
      const z = -3 - Math.round(3 * t);
      for (let dx = -breadth; dx <= breadth; dx++) {
        const depth = Math.max(0, Math.round((breadth - Math.abs(dx)) * 0.8));
        s.box(x + dx, y, z - depth, x + dx, y, z + depth, side * dx < 0 ? "#505372" : slate);
        if (dx === 0 && y < 26) s.dot(x, y, z + depth, y < 9 ? "#975c6e" : "#535877");
      }
    }
  }
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4, x = Math.round(Math.sin(a) * 16), z = Math.round(Math.cos(a) * 11);
    s.dot(x, 5, z, "#706078");
  }
  s.orb([0, 6, -1], [4, 2, 4], slate);
  s.orb([0, 8, -1], [2, 3, 2], "#984757"); s.dot(0, 11, -1, "#f2a181");
  // A four-string instrument lying across the lip, not another upright marker.
  s.orb([-9, 7, 15], [5, 2, 4], "#804536"); s.orb([-3, 7, 13], [4, 2, 3], "#965a44");
  s.orb([-9, 9, 15], [5, 1, 4], "#a86246"); s.orb([-3, 9, 13], [4, 1, 3], "#a86246");
  s.orb([-4, 10, 13], [2, 1, 2], "#392d37");
  s.rod([0, 9, 12], [12, 9, 7], 1, "#624042"); s.box(11, 9, 4, 15, 10, 8, "#804743");
  s.rod([-9, 11, 16], [13, 11, 7], 0, "#d5bd9e");
  s.rod([-9, 11, 14], [13, 11, 5], 0, "#b7a996");
  for (const x of [12, 14]) for (const z of [4, 9]) s.dot(x, 10, z, "#a7a9a4");
  return s;
}

export function fieldKit() {
  const s = sculpture(31, 22, 13);
  for (let y = 1; y <= 16; y++) for (let z = -5; z <= 5; z++) for (let x = -13; x <= 13; x++) {
    const fold = Math.max(0, Math.abs(x) - 9) ** 2 + Math.max(0, Math.abs(y - 8) - 4) ** 2 + Math.max(0, Math.abs(z) - 2) ** 2;
    if (fold <= 23) s.dot(x, y, z, y < 3 ? "#6a393c" : fold > 17 || z < -3 ? "#ac4444" : "#c85450");
  }
  for (const x of [-9, 9]) {
    s.box(x, 2, -5, x + 1, 14, -4, "#563f40");
    s.box(x, 14, -4, x + 1, 15, 4, "#6e4846");
    s.box(x, 3, 5, x, 14, 5, "#8b4141");
  }
  s.box(-10, 4, 5, 10, 13, 5, "#c84a42");
  s.box(-10, 4, 6, 10, 4, 6, "#9c423e");
  for (const x of [-10, 10]) s.box(x, 5, 6, x, 13, 6, "#b44d46");
  s.box(-7, 5, 6, 6, 14, 6, "#e8dfc8");
  s.box(-2, 7, 6, 0, 12, 6, "#bb3b39"); s.box(-4, 9, 6, 2, 10, 6, "#bb3b39");
  for (const x of [-12, 12]) s.box(x, 5, -2, x, 12, 2, "#973d3c");
  for (const x of [-5, 4]) s.box(x, 16, -1, x + 1, 18, 0, "#443e40");
  s.box(-5, 19, -1, 5, 19, 0, "#494244");
  s.box(-4, 19, 1, 4, 20, 1, "#735751");
  s.box(-11, 15, 1, 11, 15, 2, "#6c4c49");
  for (let x = -10; x <= 10; x += 2) s.dot(x, 16, 2, "#c59878");
  for (const x of [-9, 9]) {
    s.box(x - 1, 11, -5, x + 1, 13, -5, "#cdb28d");
    s.dot(x, 12, -5, "#584747");
  }
  s.rod([8, 14, 4], [9, 12, 6], 0, "#b8afa2");
  return s;
}

export function obol() {
  const s = sculpture(25, 6, 25);
  s.orb([0, 1, 0], [10, 2, 10], (x, _y, z) => Math.hypot(x, z) > 8 && Math.cos(Math.atan2(z, x) * 16) > 0 ? "#edbd71" : "#a16f43");
  for (let z = -9; z <= 9; z++) for (let x = -9; x <= 9; x++) {
    const r = Math.hypot(x, z);
    if (r < 9.5) s.dot(x, 3, z, r > 8.4 ? "#f4d48b" : r > 7.5 ? "#99623d" : "#ce9a50");
  }
  const stamp = ["...####...","..######..",".########.",".########.",".#..##..#.",".#..##..#.","..##..##..","...####...","...#..#..."];
  stamp.forEach((row, j) => row.split("").forEach((c, i) => {
    if (c === "#") s.dot(i - 5, 4, j - 4, i + j < 8 ? "#ffe5a0" : "#edc36e");
  }));
  for (const x of [-2, 2]) s.box(x - 1, 3, 0, x, 3, 1, "#80533b");
  for (const sign of [-1, 1]) for (let z = -4; z < 6; z += 2) s.dot(sign * (Math.abs(z) < 3 ? 7 : 6), 4, z, "#edc578");
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
  for (let i = 0; i < 4; i++) s.box(-26, 16, -12 + i * 6, 26, 18, -7 + i * 6, i % 2 ? "#99765c" : "#8f6c54");
  for (const x of [-23, 23]) for (const z of [-10, 9]) s.dot(x, 18, z, "#69554c");
  // Pressed meal tray: rectangular rim, recessed well and a single portion.
  s.box(-19, 19, -7, 1, 20, 7, "#4d4c43");
  s.box(-18, 21, -6, 0, 21, 6, "#a6a184");
  s.box(-17, 21, -5, -1, 21, 5, "#85806a");
  s.box(-15, 21, -4, -3, 22, 4, "#504e43");
  s.box(-14, 23, -3, -4, 23, 3, "#827d4f");
  for (const [x, z, w] of [[-12, -1, 2], [-8, 1, 3], [-6, -1, 2]]) {
    s.orb([x, 23, z], [w, 1, 2], (px, py) => px < 0 && py >= 0 ? "#a39a62" : "#8b8656");
  }
  s.rod([3, 20, 5], [6, 20, -5], 0, "#bec4b3"); s.orb([6, 20, -6], [1, 1, 2], "#a7b1a4");
  s.box(11, 19, -10, 18, 19, 10, "#607976");
  for (const x of [12, 17]) s.box(x, 19, -10, x, 19, 10, "#b8b898");
  s.orb([14, 21, 4], [3, 2, 3], "#c49770");
  s.orb([14, 23, 4], [3, 1, 3], "#e2c7a0");
  s.orb([14, 23, 4], [2, 1, 2], "#694c41");
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
