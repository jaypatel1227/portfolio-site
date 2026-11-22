import { sculpture, type XYZ } from "./sculpt";

/** A pocket orrery: all bodies, moons, armatures and cutaways are solid voxels. */
export function orrery() {
  const s = sculpture(99, 34, 75);
  const brass = "#a38150", shadow = "#403845", rim = "#d3af72";
  s.orb([0, 1, 0], [14, 2, 12], shadow);
  s.orb([0, 3, 0], [12, 2, 10], (x, _y, z) => Math.hypot(x, z * 1.2) > 8 && Math.cos(Math.atan2(z, x) * 12) > 0.4 ? rim : brass);
  s.orb([0, 5, 0], [7, 1, 6], "#665047");
  s.box(-1, 4, -1, 1, 15, 1, rim);
  function pin(x: number, y: number, z: number) {
    const elbow: XYZ = [Math.round(x * 0.55 - z * 0.15), 6, Math.round(z * 0.55 + x * 0.15)];
    s.rod([0, 5, 0], elbow, 1, brass); s.rod(elbow, [x, 6, z], 1, brass);
    s.orb(elbow, [2, 1, 2], rim);
    s.rod([x, 6, z], [x, y, z], 0, rim);
  }
  function body(at: XYZ, r: number, ink: (x: number, y: number, z: number) => string | null) {
    pin(at[0], at[1], at[2]); s.orb(at, [r, r, r], ink);
  }
  body([0, 18, 0], 10, (x, y, z) => Math.sin(x * 0.55 + Math.sin(y) + z * 0.35) > 0.55 ? "#ffd475" : y < -3 ? "#e66e3f" : "#f8ab50");
  // Hourglass Twins: a stream joins the striped sandstone and ash-shell cores.
  s.rod([-17, 15, 16], [-32, 12, 25], 1, "#f6ca84");
  body([-17, 15, 16], 4, (_x, y) => y === 0 || y === -2 ? "#9e5136" : "#d88a59");
  body([-32, 12, 25], 4, (x, y, z) => Math.abs(x + z) < 2 ? "#bc875a" : y > 0 ? "#76675b" : "#4b4749");
  // Timber Hearth's seas, polar forests, pale crater moon.
  body([17, 13, 23], 6, (x, y, z) => Math.sin(x * 0.8 + z * 0.5) + Math.cos(y * 0.6) > 0.5 ? "#5c91a0" : y > 2 ? "#537457" : "#81814f");
  s.orb([24, 18, 27], [2, 2, 2], "#bdbca4");
  // Brittle Hollow's broken crust exposes a black-hole core and its blue rim.
  pin(-29, 16, -9);
  s.orb([-29, 16, -9], [4, 4, 4], (x, y) => Math.abs(x + y) < 2 ? "#6889d2" : "#1f2039");
  s.orb([-29, 16, -9], [7, 7, 7], (x, y, z) => {
    if (x * x + y * y + z * z < 22 || z > -1 && Math.abs(x - y * 0.55) < 2 || y > 0 && Math.abs(z + x * 0.6) < 2) return null;
    return y > 2 ? "#9185a8" : x < 0 ? "#645b86" : "#514966";
  });
  s.orb([-35, 23, -13], [3, 3, 3], (x, y) => Math.abs(x - y) < 2 ? "#ee864f" : "#5b4650");
  body([15, 18, -24], 9, (x, y, z) => {
    const bands = Math.sin(y * 1.7 + Math.sin(x * 0.46) + z * 0.23);
    return bands > 0.45 ? "#8baf85" : bands < -0.4 ? "#386d67" : "#649481";
  });
  for (let i = 0; i < 48; i++) {
    const a = i / 7, r = 0.5 + i / 12;
    s.dot(15 + Math.cos(a) * r, 26, -24 + Math.sin(a) * r, "#c0cf9e");
  }
  // Thorny ice shards framing a red seed on Dark Bramble.
  body([39, 14, 2], 6, (x, y, z) => Math.abs(y - x * 0.65) < 2 || Math.abs(x - z) < 2 ? "#4c5158" : "#b9c8bd");
  for (const [x, y, z] of [[-6, 7, 3], [5, 8, -4], [8, -1, 6], [-7, -4, -4]]) {
    s.rod([39, 14, 2], [39 + x, 14 + y, 2 + z], 1, "#4c4a4a");
    s.rod([39 + x, 14 + y, 2 + z], [39 + x - 2, 17 + y, 2 + z], 0, "#847c72");
  }
  s.orb([39, 15, 7], [2, 2, 1], "#e66c61");
  return s;
}
