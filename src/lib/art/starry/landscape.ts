/** Wheat dabs, blue hills and a sleeping village beneath flame-shaped cypresses. */
import * as THREE from "three";
import { PaintLayer, palette, random, TAU, tickPaint } from "./paint";
import { heightAt, pathAt } from "./terrain";

const up = new THREE.Vector3(0, 1, 0);
const front = new THREE.Vector3(0, 0, 1);

export function paintedLandscape(): { group: THREE.Group; counts: Record<string, number>; update: (time: number) => void } {
  const rng = random(23082);
  const group = new THREE.Group();
  const earth = new PaintLayer();
  const wheat = new PaintLayer();
  const hills = new PaintLayer();
  const village = new PaintLayer();
  const trees = new PaintLayer();
  const flies = new PaintLayer();
  const choose = (colors: string[]): string => colors[Math.floor(rng() * colors.length)];
  for (let z = -85; z < 60; z += 2) {
    for (let x = -75; x < 75; x += 2) {
      const path = Math.abs(x - pathAt(z)) < 1.8;
      earth.add({
        at: new THREE.Vector3(x, heightAt(x, z) - 0.06, z),
        along: new THREE.Vector3(0.2 + Math.sin(z * 0.1) * 0.3, 0, 1), normal: up,
        width: 3.5, length: 4.6, relief: 0.12,
        color: choose(path ? ["#665237", "#88704a", "#a88b53"] : ["#343e32", "#444f3a", "#555c39", "#344e49"]),
      });
    }
  }
  for (let i = 0; i < 24500; i++) {
    const x = (rng() - 0.5) * 100;
    const z = rng() * 95 - 55;
    const path = Math.abs(x - pathAt(z)) < 1.4;
    const color = choose(path ? ["#a28a56", "#b39864", "#776648", "#597677"] : palette.wheat);
    const tilt = path ? 0.02 : 0.1 + rng() * 0.4;
    wheat.add({
      at: new THREE.Vector3(x, heightAt(x, z) + 0.12 + tilt * 0.2, z),
      along: new THREE.Vector3(Math.sin(x * 0.1 + z * 0.06) * 0.4, tilt, -0.8),
      normal: new THREE.Vector3(0, 1, tilt),
      width: 0.23 + rng() * 0.27, length: path ? 0.5 + rng() * 0.6 : 0.7 + rng() * 0.8,
      color, motion: path ? 0 : 0.7,
    });
  }
  for (let layer = 0; layer < 3; layer++) {
    const z = -82 - layer * 26;
    for (let i = 0; i < 1450; i++) {
      const x = (rng() - 0.5) * 270;
      const crest = 6 + layer * 3 + Math.sin(x * 0.027 + layer * 2) * 4 + Math.sin(x * 0.07) * 1.6;
      const y = -3 + rng() * (crest + 3);
      hills.add({
        at: new THREE.Vector3(x, y, z + rng() * 6),
        along: new THREE.Vector3(1, Math.cos(x * 0.027 + layer * 2) * 0.6, 0), normal: front,
        width: 1.3 + rng() * 1.4, length: 4 + rng() * 6,
        color: choose(layer === 2 ? palette.sky.slice(1, 4) : palette.hill),
      });
    }
  }
  const mark = (x: number, y: number, z: number, width: number, length: number, color: string, angle = 0): void => {
    village.add({ at: new THREE.Vector3(x, y, z), along: new THREE.Vector3(Math.sin(angle), Math.cos(angle), 0), normal: front, width, length, color });
  };
  for (let house = 0; house < 32; house++) {
    const x = (house % 11 - 5) * 4.3 + (rng() - 0.5) * 2;
    const z = -39 - Math.floor(house / 11) * 8 - rng() * 2;
    const base = heightAt(x, z);
    const width = 2.7 + rng() * 1.4;
    const height = 2.3 + rng() * 1.7;
    for (let i = 0; i < 65; i++) {
      const dx = (rng() - 0.5) * width;
      const y = rng() * height;
      mark(x + dx, base + y, z, 0.4, 0.8 + rng() * 0.7, choose(["#344d58", "#62756b", "#839085", "#b4ac8c", "#667a88"]));
    }
    for (let i = 0; i < 38; i++) {
      const dx = (rng() - 0.5) * (width + 0.8);
      const roof = 1.5 * (1 - Math.abs(dx) / (width * 0.5 + 0.4));
      mark(x + dx, base + height + rng() * roof, z + 0.04, 0.38, 0.85, choose(["#1c3045", "#314254", "#624e3f", "#8b6846"]), dx < 0 ? 0.8 : -0.8);
    }
    for (const dx of [-0.7, 0.6]) {
      for (let i = 0; i < 4; i++) mark(x + dx + (rng() - 0.5) * 0.19, base + 0.95 + rng() * 0.3, z + 0.08, 0.23, 0.5, choose(palette.gold.slice(0, 3)));
    }
  }
  // The steeple is drawn, like the houses, only in strokes.
  for (let i = 0; i < 250; i++) {
    const y = rng() * 10;
    const half = y < 5.8 ? 0.9 : (10 - y) * 0.22;
    mark(4.3 + (rng() - 0.5) * half * 2, heightAt(4.3, -39) + y, -37.5, 0.34, 1.05, choose(["#14283e", "#213b4d", "#3a5260", "#586a70"]));
  }
  for (const [cx, cz, height, radius] of [[-10.5, 0, 20, 2.7], [14, -15, 14, 1.9]]) {
    const base = heightAt(cx, cz);
    for (let coat = 0; coat < 2; coat++) {
      const count = coat === 0 ? 280 : 1700;
      for (let i = 0; i < count; i++) {
        const t = rng();
        const taper = Math.pow(1 - t, 0.63) * (0.82 + Math.sin(t * 19) * 0.09);
        const angle = rng() * TAU;
        const dx = (rng() - 0.5) * 2;
        const r = radius * taper;
        const lean = Math.sin(t * 6) * 0.55 + t * 0.6;
        const x = cx + dx * r + lean;
        const z = coat === 0 ? cz : cz + Math.sqrt(1 - dx * dx) * r + 0.16;
        const y = base + t * height;
        trees.add({
          at: new THREE.Vector3(x, y, z),
          along: new THREE.Vector3(Math.sin(t * 14 + angle) * 0.22, 1, Math.cos(angle) * 0.1),
          normal: new THREE.Vector3(Math.cos(angle) * 0.3, 0, 1),
          width: coat === 0 ? 1.6 : 0.2 + rng() * 0.3,
          length: coat === 0 ? 4 : 1.2 + rng() * 2.8,
          color: coat === 0 ? "#10282a" : choose(palette.cypress),
          motion: 0.15 + t * 0.15,
        });
      }
    }
  }
  for (let i = 0; i < 45; i++) {
    const x = (rng() - 0.5) * 45;
    const z = rng() * 55 - 25;
    flies.add({ at: new THREE.Vector3(x, heightAt(x, z) + 0.8 + rng() * 2.5, z), along: up, normal: front, width: 0.055, length: 0.11, color: choose(palette.gold.slice(0, 3)), motion: 1 });
  }
  const layers = { earth, wheat, hills, village, trees, flies };
  const counts = Object.fromEntries(Object.entries(layers).map(([key, layer]) => [key, layer.count]));
  const meshes = Object.values(layers).map(layer => layer.build());
  group.add(...meshes);
  return { group, counts, update: time => meshes.forEach(mesh => tickPaint(mesh, time)) };
}
