import * as THREE from "three";
import { CAMERA } from "../config";
import { smooth, type Point } from "../math";
import { restFraming } from "./framing";
import { clampZoom } from "./zoom";

export type RestFrame = ReturnType<typeof restFraming>;

export function createCamera() {
  const camera = new THREE.OrthographicCamera(-20, 20, 16, -16, 0.1, 180);
  const focus = new THREE.Vector3(0, CAMERA.focusHeight, CAMERA.followOffset);
  const follow = new THREE.Vector3();
  let rest = restFraming(innerWidth, innerHeight, { right: innerWidth * 0.44, bottom: 320 }, 74, innerHeight - 120);
  let yaw = CAMERA.homeYaw, wantedYaw = yaw, zoom = 0;
  let vertical = CAMERA.explorationHeight, wantedVertical = vertical;
  let transition = { from: 0, to: 0, elapsed: CAMERA.transitionSeconds };
  return {
    camera,
    get yaw() { return yaw; },
    get zoom() { return zoom; },
    get vertical() { return vertical; },
    get framing() { return rest; },
    reset() {
      yaw = wantedYaw = CAMERA.homeYaw; zoom = 0;
      vertical = wantedVertical = CAMERA.explorationHeight;
      transition = { from: 0, to: 0, elapsed: CAMERA.transitionSeconds };
    },
    resize(frame: RestFrame) { rest = frame; },
    transition(to: number) { if (transition.to !== to) transition = { from: zoom, to, elapsed: 0 }; },
    orbit(delta: number) { wantedYaw += delta; },
    rotate(angle: number) { wantedYaw = angle; },
    magnify(exponent: number) { wantedVertical = clampZoom(wantedVertical * Math.exp(exponent), rest.vertical); },
    update(dt: number, player: Point, width: number, height: number) {
      yaw += (wantedYaw - yaw) * (1 - Math.exp(-dt * CAMERA.orbitResponse));
      transition.elapsed += dt;
      zoom = THREE.MathUtils.lerp(transition.from, transition.to, smooth(transition.elapsed / CAMERA.transitionSeconds));
      vertical += (clampZoom(wantedVertical, rest.vertical) - vertical) * (dt === 0 ? 1 : 1 - Math.exp(-dt * CAMERA.zoomResponse));
      const viewHeight = THREE.MathUtils.lerp(rest.vertical, vertical, zoom), horizontal = viewHeight * width / height;
      const cx = THREE.MathUtils.lerp(rest.centerX, 0.5, zoom), cy = THREE.MathUtils.lerp(rest.centerY, 0.54, zoom);
      camera.left = -horizontal * cx; camera.right = horizontal * (1 - cx);
      camera.top = viewHeight * cy; camera.bottom = -viewHeight * (1 - cy);
      camera.updateProjectionMatrix();
      follow.set(player.x * zoom, CAMERA.focusHeight, THREE.MathUtils.lerp(CAMERA.followOffset, player.z - CAMERA.followOffset, zoom));
      focus.lerp(follow, dt === 0 ? 1 : 1 - Math.exp(-dt * CAMERA.followResponse));
      camera.position.set(focus.x + Math.sin(yaw) * Math.cos(CAMERA.pitch) * CAMERA.distance, focus.y + Math.sin(CAMERA.pitch) * CAMERA.distance, focus.z + Math.cos(yaw) * Math.cos(CAMERA.pitch) * CAMERA.distance);
      camera.lookAt(focus);
      return viewHeight;
    },
  };
}
