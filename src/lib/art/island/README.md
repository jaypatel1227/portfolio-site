# Pixel island

`boot.ts` is the only page entry point. It measures the hero, applies media
policy, observes layout, and bridges phase/note callbacks to the DOM.

Dependencies flow downwards; `architecture.test.js` enforces the boundaries:

- `engine/`: renderer, nearest-filtered render target, RAF lifetime and runtime coordination.
- `camera/`, `input/`, `player/`: independent view, control and movement policies.
- `world/`: seeded layout and composition, sky, light pools and resource lifetime.
- `life/`: independently updated animation systems sharing `AnimationSystem`.
- `details/`: lazy close-view composition and discoveries.
- `models/`: voxel artwork by family; no browser or renderer dependencies.
- `voxel/`: pure grid/detail generation, slice baking and shared instance helpers.
- `math.ts`, `config.ts`: pure math, types and named interaction/detail policies.
- `page/`: DOM measurement and vapor text preparation.

Grid generation, layout, controls, framing, zoom and movement are testable
without WebGL. Model fingerprints protect the established seed's artwork.
Keep RNG consumption order stable in composition and animation initialization.
Pixel dimensions and palette indices in model functions are artwork coordinates;
behavior thresholds belong in `config.ts`.

Narrow screens and reduced motion draw at `STILL_TIME`, without input or RAF.
The page owns one WebGL context. Cleanup aborts event listeners, disconnects the
observer, stops RAF and disposes scene resources; pending detail work is inert
after disposal. Development-only inspection is exposed as `window.__island`.

Checks: `bun test src/lib/art/island`, `node_modules/.bin/vp lint`, `bun run build`.
