import { it } from "node:test";
import assert from "node:assert/strict";
import { random } from "../math.ts";
import { HOME, NOTE, stoneSpots, floraSpots } from "./layout.ts";

void it("keeps layout generation deterministic and flora clear of blocked ground", () => {
  assert.deepEqual(stoneSpots(random(2026)), stoneSpots(random(2026)));
  assert.notDeepEqual(stoneSpots(random(2026)), stoneSpots(random(13)));
  const obstacles = [{ x: 0, z: 0, r: 6 }];
  const { flora, tufts } = floraSpots(random(2026), obstacles);
  assert.ok(tufts.length > 0 && flora.length > 0);
  assert.ok(tufts.every((p) => Math.hypot(p.x, p.z) >= 6.5));
  assert.deepEqual(floraSpots(random(2), [{ x: 0, z: 0, r: 100 }]), { flora: [], tufts: [] });
  assert.ok(Number.isFinite(HOME.x) && Number.isFinite(NOTE.z));
});
