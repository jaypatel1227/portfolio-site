import { sculpture, type Sculpture } from "./sculpt";

const cream = "#fff2ce", ivory = "#e7d5ac", red = "#ed4944", shade = "#a73449";
const blue = "#358ca7", teal = "#1f5a6e", black = "#302e40";
const inks: Record<string, [string, number]> = {
  k: ["#303647", 2], r: ["#ef423a", 4], d: ["#be2e34", 3], b: ["#1c84d6", 3], t: ["#1e5791", 2],
  h: ["#7be0f7", 4], y: ["#f7b538", 4], w: ["#fffaf0", 4], s: ["#e6c4a8", 3], p: ["#e88476", 4],
};
// Raised ink: the three-pointed cap, bells, white face, red nose/smile and pleated ruff stand proud.
const jester = [
  "..............kkkk.............",
  ".............krrrrk............",
  "............krrrrwwk...........",
  "...........krrrrrkwwk..........",
  "..........krrrrrrrrkk..........",
  "....kkk..krrrrrrrrrrk..kkk.....",
  "...kyyykkrrrrrrrrrrrrkkyyyk....",
  "..kyyyyyyddrrrrrrrrddyyyyyyk...",
  ".kyyykkydrrrrrrrrrrrrdykkyyyk..",
  ".kyyk..kdrrrrrrrrrrrrdk..kyyk..",
  "kwwk...krkkkkkkkkkkkkrk...kwwk.",
  "kwwk...kswwwwwwwwwwwwsk...kwwk.",
  ".kk...kswwwwwwwwwwwwwwsk...kk..",
  "......kswkkwwwwwwwwkkwsk.......",
  "......kswkkwwwwwwwwkkwsk.......",
  "......kswwwwwrrrrwwwwwsk.......",
  "......kpwwwwwrrrrwwwwwpk.......",
  "......ksswwwwwrrwwwwwssk.......",
  ".......ksrrwwwwwwwwrrsk........",
  ".......kswrrrrrrrrrrwsk........",
  "........kswrrrrrrrrwsk.........",
  ".........ksswwwwwwssk..........",
  "......kkkhhksswwsskbhhkk.......",
  "....khhbbbhhkkwwkkhhbbbhhk.....",
  "..khhbbbbbbbhhhhhhbbbbbbbhhk...",
  ".khbbbbtbbbhhbbbbhhbbbtbbbbhk..",
  "ktbbkkttbbhhbbbbbbhhbbttkkbbtk.",
  "kyyk..ktbhhbbkkkkbbhhbtk..kyyk.",
  ".kk...ktbbbkk....kkbbbbtk..kk..",
  "......ktbkk........kkbbtk......",
  "......kyk............kyk.......",
];
const letters = [
  ["111","001","001","101","111"], ["111","101","101","101","111"], ["101","101","110","101","101"],
  ["111","100","110","100","111"], ["110","101","110","101","101"],
];
const ace = ["010","101","111","101","101"];
function heart(x: number, y: number) {
  return Math.abs(x) * 1.05 - y < 7.5 && Math.hypot(Math.abs(x) - 3.6, y - 2.4) < 5.6;
}
function legend(u: number, v: number) {
  const letter = letters[Math.floor(v / 6)];
  return v >= 0 && v < 29 && u >= 0 && u < 3 && letter?.[v % 6]?.[u] === "1";
}

function card(s: Sculpture, cx: number, baseZ: number, roll: number, kind: "face" | "ace" | "back") {
  const ca = Math.cos(roll), sa = Math.sin(roll), half = kind === "face" ? 19 : 15;
  const height = kind === "face" ? 54 : 45;
  for (let y = 3; y < 64; y++) for (let x = -36; x <= 36; x++) {
    const u = Math.round((x - cx) * ca + (y - 7) * sa), v = Math.round(-(x - cx) * sa + (y - 7) * ca);
    const edge = Math.min(half - Math.abs(u), v, height - v);
    if (edge < 0 || Math.abs(u) > half - 2 && (v < 2 || v > height - 2)) continue;
    const z = baseZ - Math.round((y - 7) * 0.38);
    const grain = Math.abs(u + v) % 5 === 0 || Math.abs(u - v) % 5 === 0;
    const medallion = Math.abs(u) + Math.abs(v - height / 2) * 0.78;
    const back = edge < 2 ? cream : edge === 3 || Math.abs(medallion - 10) < 1.1 ? "#e6b48a" :
      medallion < 7 ? "#b34344" : grain ? "#c65d5c" : "#7c2f3f";
    s.box(x, y, z - 2, x, y, z, edge === 0 ? "#9c8776" : ivory);
    s.dot(x, y, z - 2, back);
    let ink = cream, rise = 1;
    if (kind === "back") ink = back;
    if (kind === "ace") {
      const pip = heart(u, v - 23) || v <= 25 && v > 14 && Math.abs(u) < (v - 14) * 0.88;
      const a = ace[height - 4 - v]?.[u + half - 3] === "1";
      const bottomA = ace[v - 4]?.[half - 3 - u] === "1";
      const corners = Math.abs(u + 11) + Math.abs(v - 33) < 2.6 || Math.abs(u - 11) + Math.abs(v - 12) < 2.6;
      ink = pip || a || bottomA || corners ? red : edge === 2 ? ivory : cream;
    }
    if (kind === "face") {
      ink = edge < 1 ? ivory : "#fffaf0";
      if (Math.abs(u) <= 15) {
        const glyph = jester[44 - v]?.[u + 15], pixel = inks[glyph];
        if (pixel) {
          [ink, rise] = pixel;
          if (v >= 23 && v <= 33 && (glyph === "y" || glyph === "r" || glyph === "p" || glyph === "k")) rise = 5;
        }
      }
      if (legend(u + 17, 51 - v) || legend(17 - u, v - 3)) { ink = teal; rise = 2; }
    }
    s.box(x, y, z + 1, x, y, z + rise, ink);
  }
}

export function jokerCard() {
  const s = sculpture(45, 65, 29);
  card(s, 0, 9, 0.03, "face");
  return s;
}

export function cardFan() {
  const s = sculpture(75, 58, 51);
  s.orb([0, 1, 1], [35, 3, 21], (x, y, z) => y < 0 ? black : y === 0 ? "#b89050" :
    (x / 32) ** 2 + (z / 18) ** 2 > 0.96 ? "#9aa882" : "#2b665d");
  card(s, -13, -5, 0.37, "back"); card(s, 13, -1, -0.34, "ace");
  for (const [cx, cz, count, ink] of [[-19, 12, 3, shade], [17, 13, 2, blue]] as const) {
    for (let i = 0; i < count; i++) for (let z = -5; z <= 5; z++) for (let x = -5; x <= 5; x++) {
      const r = Math.hypot(x, z);
      if (r > 5.4) continue;
      const stripe = r > 3.7 && Math.cos(Math.atan2(z, x) * 6 + i) > 0.2;
      s.dot(cx + x, 4 + i * 2, cz + z, black);
      s.dot(cx + x, 5 + i * 2, cz + z, stripe ? cream : ink);
      if (i === count - 1 && r < 3.4) s.dot(cx + x, 5 + i * 2, cz + z, r > 2.4 ? cream : ink);
    }
  }
  return s;
}
