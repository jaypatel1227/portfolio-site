export const SEED = 2026;
export const STILL_TIME = 40;
export const MAX_FRAME_DELTA = 0.05;
export const WALK_MEDIA = "(min-width: 64rem)";
export const REDUCED_MEDIA = "(prefers-reduced-motion: reduce)";
export const CAMERA = {
  homeYaw: 0.55, explorationHeight: 24, transitionSeconds: 1.05,
  zoomResponse: 8, followResponse: 5, orbitResponse: 9,
  orbitSpeed: 1.5, keyZoomSpeed: 1.8, dragSpeed: 0.008,
  distance: 65, pitch: Math.PI * 0.24, focusHeight: 1.2, followOffset: 1.5,
};
export const PLAYER = {
  speed: 3.3, sprint: 1.6, radius: 0.34, worldRadius: 18,
  driftSeconds: 1.8, awayDistance: 0.7, noteDistance: 2.35,
  stepRate: 8, bobHeight: 0.065,
};
export const DETAIL = {
  sceneryHeight: 18, sceneryBand: 4, discoveryHeight: 10, discoveryBand: 2,
  preloadHeight: 26, revealSeconds: 0.6, distanceBand: 2,
  oakRadius: 12, nearbyRadius: 9,
};
