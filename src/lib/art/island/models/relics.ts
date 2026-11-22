import { sculpture } from "./sculpt";

export function bonfire() {
  const s = sculpture(29, 35, 25);
  s.orb([0, 1, 0], [13, 2, 10], (x, _y, z) => (x + z) % 4 === 0 ? "#a79b8c" : "#726b6a");
  for (const [x, z, dx, dz] of [[-8, -5, 5, 4], [-8, 4, 6, -3], [-5, -7, 3, 6]]) {
    s.rod([x, 4, z], [dx, 4, dz], 2, "#483737");
    s.rod([x, 5, z], [dx, 5, dz], 0, "#be6544");
  }
  for (const [x, z, h] of [[0, 0, 15], [4, 1, 10], [-4, -1, 13], [0, 4, 8]]) {
    for (let y = 4; y < h; y++) {
      const r = Math.max(1, Math.round(3 * (h - y) / (h - 4)));
      s.orb([x + Math.round(Math.sin(y * 0.46)), y, z], [r, 1, r], y < 7 ? "#f5c46f" : y < 10 ? "#ed914e" : "#c76140");
    }
  }
  // Twisted blackened blade, arched quillons and leather-wrapped grip.
  for (let y = 5; y <= 24; y++) {
    const x = Math.round((y - 6) * 0.22), twist = Math.round(1.25 * Math.sin(y * 0.85));
    s.box(x + twist - 1, y, -1, x + twist + 1, y, 0, "#49414a");
    s.dot(x + twist + 1, y, 1, y < 14 ? "#e78b52" : "#b3a18b");
  }
  s.rod([-1, 22, 0], [4, 25, 0], 1, "#5d4c44"); s.rod([4, 25, 0], [10, 24, 0], 1, "#a08768");
  s.rod([4, 25, 0], [6, 32, 0], 1, "#553e34");
  for (let y = 26; y < 32; y += 2) s.dot(5 + Number(y >= 30), y, 1, "#b08e62");
  s.orb([6, 32, 0], [2, 2, 2], "#aa967a");
  return s;
}

export function plasmaBlade() {
  const s = sculpture(29, 44, 17);
  s.orb([0, 2, 0], [10, 4, 7], (x, y) => y > 3 ? "#737272" : x > 0 ? "#555562" : "#474655");
  s.rod([-3, 7, 0], [3, 10, 0], 2, "#525067");
  for (const side of [-1, 1]) {
    for (let y = 8; y < (side < 0 ? 41 : 38); y++) {
      const t = (y - 8) / (side < 0 ? 33 : 30), x = Math.round(side * (3 + 7 * Math.sin(t * Math.PI * 0.82)) + t * 2);
      const width = Math.round(3.3 * Math.sin(t * Math.PI) + 0.7 * (1 - t));
      s.box(x - width, y, -1, x + width, y, 1, "#597dd8");
      s.box(x - width + 1, y, 0, x + width - 1, y, 2, "#77cce6");
      s.dot(x - side * Math.max(0, width - 1), y, 2, "#d0f2ff");
    }
    s.orb([side * 4, 8, 0], [2, 3, 2], "#686984");
  }
  return s;
}

export function teleporter() {
  const s = sculpture(51, 30, 43), slate = "#534f57", basalt = "#464651";
  s.orb([0, 1, 0], [22, 2, 15], basalt);
  s.orb([0, 3, 0], [18, 1, 13], (x, _y, z) => {
    const r = Math.hypot(x, z * 1.4);
    return Math.abs(r - 12) < 1 ? "#b27769" : r < 4 ? "#8e5c5b" : "#777078";
  });
  for (const side of [-1, 1]) {
    for (let y = 3; y <= 26; y++) {
      const t = (y - 3) / 23, radius = Math.max(1, Math.round(5 * (1 - t)));
      const x = side * Math.round(14 + 6 * Math.sin(t * 3.6) - 4 * t);
      s.orb([x, y, -2 - Math.round(2 * t)], [radius, 2, radius], (px) => px * side < -1 ? "#817781" : y < 12 ? basalt : slate);
    }
  }
  s.orb([0, 5, -1], [3, 2, 3], "#b96561"); s.dot(0, 7, -1, "#e4a098");
  // A four-string instrument lying across the lip, not another upright marker.
  s.orb([-6, 5, 13], [5, 2, 4], "#925d40"); s.orb([0, 5, 13], [4, 2, 3], "#b57f4e");
  s.orb([-5, 7, 13], [4, 1, 3], "#d3a96c");
  s.orb([-2, 7, 13], [2, 1, 2], "#46383c");
  s.rod([1, 6, 13], [10, 6, 15], 1, "#694737"); s.box(10, 6, 13, 13, 7, 16, "#ba885e");
  for (const z of [12, 14]) s.rod([-6, 8, z], [12, 8, z + 2], 0, "#ddd1ad");
  for (const x of [10, 12]) for (const z of [12, 17]) s.dot(x, 7, z, "#a7a9a4");
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
  s.box(-10, 4, 5, 10, 13, 5, "#d66155");
  s.box(-10, 4, 6, 10, 4, 6, "#9c423e");
  for (const x of [-10, 10]) s.box(x, 5, 6, x, 13, 6, "#b44d46");
  s.box(-2, 5, 6, 1, 13, 6, "#f1e8cf"); s.box(-5, 8, 6, 4, 10, 6, "#f1e8cf");
  for (const x of [-5, 4]) s.box(x, 16, -1, x + 1, 18, 0, "#443e40");
  s.box(-5, 19, -1, 5, 19, 0, "#494244");
  s.rod([8, 14, 4], [9, 12, 6], 0, "#b8afa2");
  return s;
}

export function obol() {
  const s = sculpture(23, 5, 23);
  s.orb([0, 1, 0], [10, 2, 10], "#b88846");
  for (let z = -9; z <= 9; z++) for (let x = -9; x <= 9; x++) {
    const r = Math.hypot(x, z);
    if (r < 9.5) s.dot(x, 3, z, r > 8 ? "#f4d48b" : "#c79e56");
  }
  const stamp = ["..####..",".######.","########","##.##.##","##.##.##",".##..##.","..####..","..#.#..."];
  stamp.forEach((row, j) => row.split("").forEach((c, i) => { if (c === "#") s.dot(i - 4, 4, j - 4, "#f5db94"); }));
  for (const x of [-2, 1]) s.box(x, 3, -1, x, 3, 0, "#89603c");
  for (const sign of [-1, 1]) for (let z = -4; z < 6; z += 2) s.dot(sign * (Math.abs(z) < 3 ? 7 : 6), 4, z, "#edc578");
  return s;
}

export function placeSetting() {
  const s = sculpture(55, 27, 29);
  for (const x of [-22, 22]) for (const z of [-9, 9]) s.box(x - 1, 0, z - 1, x + 1, 15, z + 1, "#695247");
  s.box(-24, 13, -10, 24, 15, 10, "#78604e");
  for (let i = 0; i < 4; i++) s.box(-26, 16, -12 + i * 6, 26, 18, -7 + i * 6, i % 2 ? "#99765c" : "#8f6c54");
  for (const x of [-23, 23]) for (const z of [-10, 9]) s.dot(x, 18, z, "#69554c");
  s.orb([-4, 20, 0], [8, 2, 6], "#536771");
  s.orb([-4, 22, 0], [9, 1, 7], "#a6b1a5");
  s.orb([-4, 23, 0], [7, 1, 5], "#778473");
  s.orb([-4, 24, 0], [6, 2, 4], (x, y, z) => (x + z + y) % 5 === 0 ? "#9ca36e" : "#7e8d5a");
  s.rod([1, 24, -1], [8, 25, -6], 0, "#b6b9af");
  return s;
}

export function stool() {
  const s = sculpture(17, 16, 17);
  for (const x of [-5, 5]) for (const z of [-5, 5]) s.box(x - 1, 0, z - 1, x + 1, 11, z + 1, "#6c5149");
  s.box(-7, 10, -7, 7, 13, 7, "#93715a");
  for (const x of [-3, 3]) s.rod([x, 13, -7], [x, 13, 7], 0, "#735548");
  return s;
}
