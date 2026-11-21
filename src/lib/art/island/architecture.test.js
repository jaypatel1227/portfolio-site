import { it } from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));
const allowed = {
  boot: ["config", "engine", "page"],
  engine: ["camera", "config", "input", "math", "player", "world"],
  page: ["camera"], camera: ["math", "config"], input: ["config"],
  player: ["math", "config"], math: ["config"], config: [],
  world: ["models", "voxel", "life", "details", "math", "config"],
  life: ["models", "voxel", "math", "config"],
  details: ["models", "voxel", "math", "config"],
  models: ["voxel", "math", "config"], voxel: ["math", "config"],
};
void it("keeps production imports inside their one-way layers", async () => {
  for (const name of await readdir(root, { recursive: true })) {
    if (!name.endsWith(".ts")) continue;
    const source = await readFile(resolve(root, name), "utf8");
    const layer = name.split("/")[0].replace(".ts", "");
    for (const match of source.matchAll(/(?:from|import)\s+["']([^"']+)["']/g)) {
      const target = match[1];
      if (!target.startsWith(".")) { assert.ok(target === "three" || target.startsWith("three/")); continue; }
      const absolute = resolve(dirname(resolve(root, name)), target);
      assert.ok(absolute.startsWith(root), name);
      const dependency = absolute.slice(root.length).split("/")[0].replace(".ts", "");
      assert.ok(dependency === layer || allowed[layer]?.includes(dependency), `${name} -> ${target}`);
    }
  }
});
