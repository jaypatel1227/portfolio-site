/** Cobalt curls, eleven golden stars and a crescent laid in curved dabs. */
import * as THREE from "three";
import { PaintLayer, palette, random, TAU, tickPaint } from "./paint";

export function paintedSky(): { group: THREE.Group; count: number; update: (time: number) => void } {
  const rng = random(8741);
  const group = new THREE.Group();
  const ground = new PaintLayer();
  const curls = new PaintLayer();
  const lights = new PaintLayer();
  const choose = (colors: string[]): string => colors[Math.floor(rng() * colors.length)];
  const position = (az: number, el: number, radius = 180): THREE.Vector3 =>
    new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)).multiplyScalar(radius);
  const dab = (layer: PaintLayer, az: number, el: number, angle: number, width: number, length: number, color: string): void => {
    const at = position(az, el);
    const east = new THREE.Vector3(Math.cos(az), 0, Math.sin(az));
    const north = new THREE.Vector3(-Math.sin(az) * Math.sin(el), Math.cos(el), Math.cos(az) * Math.sin(el));
    layer.add({ at, normal: at.clone().negate(), along: east.multiplyScalar(Math.cos(angle)).add(north.multiplyScalar(Math.sin(angle))), width, length, color, motion: 0.12 });
  };
  for (let row = 0; row < 30; row++) {
    const el = -0.15 + row * 0.057;
    const columns = Math.max(10, Math.round(135 * Math.cos(el)));
    for (let j = 0; j < columns; j++) {
      dab(ground, j / columns * TAU, el, 0, 17, 23, choose(palette.sky.slice(0, 3)));
    }
  }
  for (let i = 0; i < 15500; i++) {
    const az = (rng() - 0.5) * TAU;
    const el = Math.asin(rng() * 1.08 - 0.08);
    const centers = [[0.3, 0.59, 1.0], [-0.8, 0.78, 0.7], [1.4, 0.44, 0.55]];
    let fx = 0.3;
    let fy = Math.sin(az * 3) * 0.12;
    let band = el * 24;
    for (const [x, y, strength] of centers) {
      const dx = (az - x) * Math.cos(el);
      const dy = el - y;
      const d = dx * dx + dy * dy;
      const weight = Math.exp(-d * 4) * strength;
      fx += -dy / (d + 0.055) * weight;
      fy += dx / (d + 0.055) * weight;
      band += Math.sin(Math.sqrt(d) * 24 - Math.atan2(dy, dx) * 2) * weight * 3;
    }
    const dx = (az - 0.3) * Math.cos(el);
    const dy = el - 0.59;
    const eddy = Math.sqrt(dx * dx + dy * dy) * 31 - Math.atan2(dy, dx) * 2;
    band = band * 0.15 + eddy;
    const color = palette.sky[Math.min(6, Math.max(1, Math.floor(3.0 + Math.sin(band) * 1.6 + rng() * 1.1)))];
    dab(curls, az, el, Math.atan2(fy, fx), 1.9 + rng() * 1.8, 7 + rng() * 7, color);
  }
  const stars = [[-0.9, 0.32], [-0.6, 0.92], [-0.34, 0.46], [-0.15, 1.02], [0.16, 0.38], [0.42, 0.68], [0.72, 0.49], [1.08, 0.83], [1.4, 0.4], [-1.55, 0.76], [2.25, 0.71]];
  const halo = (az: number, el: number, moon: boolean): void => {
    for (let ring = 0; ring < 3; ring++) {
      const r = (moon ? 0.06 : 0.02) + ring * 0.019;
      const count = 28 + ring * 14;
      for (let j = 0; j < count; j++) {
        const a = j / count * TAU;
        dab(lights, az + Math.cos(a) * r / Math.cos(el), el + Math.sin(a) * r, a + Math.PI / 2, 1.7 + rng() * 0.8, 2.4 + rng() * 1.8, choose(ring === 1 ? ["#56849d", "#94a993", "#b6b27c"] : palette.gold));
      }
    }
  };
  for (const [az, el] of stars) {
    halo(az, el, false);
    for (let j = 0; j < 14; j++) {
      dab(lights, az + (rng() - 0.5) * 0.018, el + (rng() - 0.5) * 0.018, rng() * TAU, 1.8, 3.1, choose(palette.gold.slice(0, 3)));
    }
  }
  halo(-0.65, 0.55, true);
  for (let j = 0; j < 750; j++) {
    const a = rng() * TAU;
    const r = Math.sqrt(rng()) * 0.055;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (Math.hypot(x - 0.024, y + 0.006) < 0.05) continue;
    dab(lights, -0.65 + x / Math.cos(0.55), 0.55 + y, a + Math.PI / 2, 1.2, 2.5, choose(palette.gold.slice(0, 3)));
  }
  const count = ground.count + curls.count + lights.count;
  const base = ground.build(true);
  const flow = curls.build(true);
  const glow = lights.build(true);
  flow.renderOrder = -9;
  glow.renderOrder = -8;
  group.add(base, flow, glow);
  return {
    group, count,
    update(time) {
      flow.rotation.y = Math.sin(time * 0.018) * 0.035;
      tickPaint(flow, time);
    },
  };
}
