import { random } from "../math";

export function smallPlaces(seed: number) {
  const rng = random(seed + 819);
  return {
    mailbox: { x: 12.2, z: 1.2 }, snail: { x: -10.4, z: -3.6 }, ring: { x: -8.9, z: 2.1 },
    carving: { x: 2.4, z: -4.08 }, cat: { x: 10.5, z: 2.14 }, door: { x: 3.1, z: -3.18 },
    boot: { x: -2.4, z: 9.1 }, camp: { x: 8.1, z: -6.0 }, frog: { x: -10.2, z: 0.5 },
    bottle: { x: -4.7, z: -1.4 }, circle: { x: -8.1, z: -7.1 },
    hiker: { x: -6.4 + rng() * 0.6, z: -9.5 + rng() * 0.5 },
  };
}
