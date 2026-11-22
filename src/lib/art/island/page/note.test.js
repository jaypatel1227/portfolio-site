import { it } from "node:test";
import assert from "node:assert/strict";
import { islandNote } from "../../../../data/site.ts";

void it("keeps the oak note to the single requested sentence", () => {
  assert.equal(islandNote, "thanks for taking a look around.");
});
