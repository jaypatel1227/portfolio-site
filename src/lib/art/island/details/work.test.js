import { it } from "node:test";
import assert from "node:assert/strict";
import { buildBudget } from "./work.ts";

void it("budgets a bounded slice even if rendering starves native idle callbacks", () => {
  const idle = (didTimeout, ms) => ({ didTimeout, timeRemaining: () => ms });
  assert.equal(buildBudget(idle(false, 2)), 2);
  assert.equal(buildBudget(idle(false, 50)), 5);
  assert.equal(buildBudget(idle(true, 0)), 5);
  assert.equal(buildBudget(), 5);
});
