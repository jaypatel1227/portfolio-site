import { sculpture } from "./sculpt";

// Inked as raised pixels on three separate pieces of card stock.
export function cardFan() {
  const s = sculpture(65, 11, 47);
  s.orb([0, 1, 0], [31, 3, 22], (x, _y, z) => x - z > 9 ? "#798386" : "#65727b");
  const paper = "#ede0bc", black = "#35353e", red = "#bd4f4d", blue = "#5187a0";
  const portrait = [
    "..rrr......bbb..",
    ".rryrr....bbybb.",
    ".y..rrrrbbbb..y.",
    "....rryyybbb....",
    "...yyrrrrrbyy...",
    "....pppppppp....",
    "...pkkppppkkp...",
    "...ppbkppkbpp...",
    "....ppprrppp....",
    "...prrrrrrrrp...",
    "....pkkkkkkp....",
    ".....pwwwwp.....",
    ".....pppppp.....",
    "..bbyrppppryrr..",
    ".bbbyyrrrryyrrr.",
    ".bbbybbyyrbyrrr.",
  ];
  const inks: Record<string, string> = { r: red, b: blue, p: "#f3d8ad", w: "#fff3d9", k: black, y: "#e3b862" };
  function card(cx: number, cz: number, y: number, angle: number, kind: number) {
    const ca = Math.cos(angle), sa = Math.sin(angle);
    for (let z = -22; z <= 22; z++) for (let x = -31; x <= 31; x++) {
      const u = Math.round((x - cx) * ca + (z - cz) * sa), v = Math.round(-(x - cx) * sa + (z - cz) * ca);
      if (Math.abs(u) > 10 || Math.abs(v) > 15 || Math.abs(u) === 10 && Math.abs(v) === 15) continue;
      const edge = Math.abs(u) === 10 || Math.abs(v) === 15;
      let ink = edge ? "#c9bea2" : paper;
      const i = u + 8, j = v + 13;
      const rank = kind === 2 ? ["111","001","001","101","111"] : kind ? ["010","101","111","101","101"] : ["111","101","111","001","111"];
      if (i >= 0 && i < 3 && j >= 0 && j < 5 && rank[j][i] === "1") ink = kind === 1 ? black : red;
      if (kind === 2) {
        if (Math.abs(u) === 9 && Math.abs(v) < 12 || Math.abs(v) === 14 && Math.abs(u) < 9) ink = "#bb9465";
        const c = portrait[v + 7]?.[u + 8];
        if (inks[c]) ink = inks[c];
        if (v === 11 && Math.abs(u) < 6) ink = red;
      } else if (kind) {
        if (Math.abs(u) + Math.abs(v + 2) < 7 || v > 2 && v < 7 && Math.abs(u) < (v - 1) * 0.5) ink = black;
      } else {
        for (const a of [-4, 4]) for (const b of [-8, 0, 8]) if (Math.abs(u - a) + Math.abs(v - b) < 3) ink = red;
      }
      s.dot(x, y - 1, z, "#a39e8d"); s.dot(x, y, z, ink);
    }
  }
  card(-12, -1, 5, -0.44, 0); card(0, -1, 7, -0.14, 1); card(12, 1, 9, 0.22, 2);
  return s;
}
