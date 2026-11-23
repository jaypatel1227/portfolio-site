import { sculpture, type XYZ } from "./sculpt";

/** A pocket orrery: all bodies, moons, armatures and cutaways are solid voxels. */
export function orrery() {
  const s = sculpture(99, 34, 75);
  const brass = "#a6824e", shadow = "#3c3543", rim = "#dab675";
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
  // Sun: fiery convective granulation.
  body([0, 18, 0], 10, (x, y, z) => {
    const plume = Math.sin(x * 0.44 + Math.sin(y * 0.42 + z * 0.22) * 2.5) + Math.cos(z * 0.52 - y * 0.28);
    return plume > 1.2 ? "#fff09c" : plume > 0.35 ? "#ffbc4e" : plume < -0.85 || y < -6 ? "#de6432" : "#f58e3d";
  });
  // Hourglass Twins: bright golden sand stream linking canyon-banded Ember Twin and solar-tower Ash Twin.
  s.rod([-17, 15, 16], [-32, 12, 25], 1, "#fbd48c");
  s.rod([-18, 15, 17], [-31, 12, 24], 0, "#ffe8ad");
  body([-17, 15, 16], 4, (x, y, z) => Math.abs(z - x) < 2 && y > -2 ? "#8c3d32" : y === 0 || y === -2 ? "#c7643e" : "#ec9b5b");
  body([-32, 12, 25], 4, (x, y, z) =>
    Math.abs(y) <= 1 && Math.abs(x + z) % 3 === 0 ? "#e2c278" :
      Math.abs(y) <= 1 ? "#454b58" : y > 1 ? "#c99b68" : "#6c6052");
  // Timber Hearth's pine forests, teal seas, and cratered pale Attlerock moon.
  body([17, 13, 23], 6, (x, y, z) => Math.sin(x * 0.8 + z * 0.5) + Math.cos(y * 0.6) > 0.45 ? "#4a8da3" : y > 1 ? "#487454" : "#7a824a");
  s.orb([24, 18, 27], [2, 2, 2], (x, y) => (x === 0 && y === 1) || (x === -1 && y === 0) ? "#7d8276" : "#cbccc0");
  // Brittle Hollow: fractured indigo crust revealing deep black-hole singularity & bright blue-violet rim.
  pin(-29, 16, -9);
  s.orb([-29, 16, -9], [4, 4, 4], (x, y, z) => {
    const r = Math.hypot(x, y, z);
    return r < 2.7 ? "#121326" : Math.abs(x + y) < 2.2 ? "#89a8ff" : "#4b5ca8";
  });
  s.orb([-29, 16, -9], [7, 7, 7], (x, y, z) => {
    if (x * x + y * y + z * z < 23 || z > -1 && Math.abs(x - y * 0.55) < 2.2 || y > 0 && Math.abs(z + x * 0.6) < 2.2) return null;
    return y > 2 ? "#9a8bb6" : x < 0 ? "#665c8c" : "#4f4668";
  });
  // Hollow's Lantern: volcanic dark rock veined with bright magma.
  s.orb([-35, 23, -13], [3, 3, 3], (x, y) => Math.abs(x - y) < 1.8 ? "#ff9248" : Math.abs(x + y) === 2 ? "#d65238" : "#4c3b46");
  // Giant's Deep: swirling turquoise-emerald cloud bands and bright cyclone spiral.
  body([15, 18, -24], 9, (x, y, z) => {
    const eye = Math.hypot(x + 2, (z - 2) * 0.83);
    if (y > 5 && eye < 4.8) return eye < 1.6 ? "#275452" : eye < 3.1 ? "#9ee0c4" : "#6ec2a4";
    const swirl = Math.sin(y * 1.15 + Math.sin(x * 0.52 + z * 0.16) * 1.2 + z * 0.22);
    return swirl > 0.55 ? "#8ed1b3" : swirl < -0.45 ? "#2d6864" : "#4d9c8c";
  });
  for (let i = 0; i < 48; i++) {
    const a = i / 6.5, r = 0.6 + i / 11.5;
    s.dot(15 + Math.cos(a) * r, 26, -24 + Math.sin(a) * r, "#b6ebd0");
  }
  // Dark Bramble: fractured pale-ice shell, gnarled dark thorny vines, glowing angler-red core.
  body([39, 14, 2], 6, (x, y, z) => Math.abs(y - x * 0.65) < 2 || Math.abs(x - z) < 2 ? "#3d424a" : "#cce0dc");
  for (const [x, y, z] of [[-7, 7, 3], [6, 8, -4], [8, -1, 6], [-7, -4, -4], [2, 8, 5]]) {
    s.rod([39, 14, 2], [39 + x, 14 + y, 2 + z], 1, "#443d3e");
    s.rod([39 + x, 14 + y, 2 + z], [39 + x - 2, 17 + y, 2 + z], 0, "#7c7268");
  }
  s.orb([39, 15, 7], [2, 2, 1], (x, y) => x === 0 && y === 0 ? "#ffb48a" : "#eb5a50");
  return s;
}
