export function pineSpots(rng: () => number) {
  const spots = [];
  for (let i = 0; i < 38; i++) {
    const angle = i / 38 * Math.PI * 2 + (rng() - 0.5) * 0.1;
    const radius = 15.5 + rng() * 2.5;
    const x = Math.cos(angle) * radius, z = Math.sin(angle) * radius * 0.86;
    if (z > 7 && Math.abs(x) < 8) continue;
    spots.push({ x, z, scale: 0.12 + rng() * 0.065, angle: rng() * Math.PI * 2 });
  }
  spots.push({ x: -12, z: 6, scale: 0.19, angle: 0 }, { x: 12, z: 9, scale: 0.17, angle: 0 }, { x: 13, z: -8, scale: 0.18, angle: 0 });
  return spots;
}

export function pineObstacles(spots: readonly { x: number; z: number; scale: number }[]) {
  return spots.map(({ x, z, scale }) => ({ x, z, r: Math.max(0.35, scale * 2) }));
}
