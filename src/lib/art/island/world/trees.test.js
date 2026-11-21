import { it } from "node:test";
import assert from "node:assert/strict";
import { movePlayer, random } from "../math.ts";
import { pineSpots, pineObstacles } from "./trees.ts";

void it("blocks every rendered pine, including all three foreground trees", () => {
  for (const seed of [1, 2026, 891]) {
    const spots = pineSpots(random(seed));
    const obstacles = pineObstacles(spots);
    assert.equal(obstacles.length, spots.length);
    for (const [i, spot] of spots.entries()) {
      const obstacle = obstacles[i];
      assert.equal(obstacle.x, spot.x);
      assert.equal(obstacle.z, spot.z);
      assert.ok(obstacle.r >= spot.scale * 2);
      const end = movePlayer({ x: spot.x + 2, z: spot.z }, { x: -4, z: 0 }, [obstacle], 100);
      assert.ok(end.x >= spot.x + obstacle.r + 0.34 - 1e-8);
    }
    for (const [x, z] of [[-12, 6], [12, 9], [13, -8]]) {
      assert.ok(obstacles.some((o) => o.x === x && o.z === z));
    }
  }
  assert.deepEqual(pineObstacles([]), []);
});

void it("blocks A walking into the pond-side pine rather than reaching the reported interior sample", () => {
  const obstacles = pineObstacles(pineSpots(random(2026)));
  const tree = obstacles.find((o) => o.x === -12 && o.z === 6);
  assert.ok(tree);
  let player = { x: -10, z: 6 };
  for (let i = 0; i < 40; i++) {
    player = movePlayer(player, { x: -3.3 * 0.05, z: 0 }, obstacles, 18);
    assert.ok(player.x >= tree.x + tree.r + 0.34 - 1e-8);
  }
  const recovered = movePlayer({ x: -11.998, z: 5.734 }, { x: 0, z: 0 }, obstacles, 18);
  assert.ok(Math.hypot(recovered.x - tree.x, recovered.z - tree.z) >= tree.r + 0.34 - 1e-8);
});

void it("substeps large deltas so even small obstacles cannot be skipped in either direction", () => {
  const obstacle = { x: -12, z: 6, r: 0.01 };
  for (const sign of [-1, 1]) {
    const end = movePlayer({ x: -12 + sign * 3, z: 6 }, { x: -sign * 7, z: 0 }, [obstacle], 100);
    assert.ok((end.x + 12) * sign >= 0.35 - 1e-8);
  }
});
