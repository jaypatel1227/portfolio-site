import { PLAYER } from "../config";
import { movePlayer, relativeMove, type Obstacle, type Point } from "../math";

export function createPlayer(home: Point, obstacles: readonly Obstacle[]) {
  const position = { ...home };
  let facing = Math.PI, steps = 0;
  return {
    position,
    get facing() { return facing; },
    get steps() { return steps; },
    reset() { Object.assign(position, home); facing = Math.PI; },
    move(forward: number, strafe: number, yaw: number, sprint: boolean, dt: number): number {
      const direction = relativeMove(forward, strafe, yaw);
      const speed = PLAYER.speed * (sprint ? PLAYER.sprint : 1);
      const next = movePlayer(position, { x: direction.x * speed * dt, z: direction.z * speed * dt }, obstacles, PLAYER.worldRadius);
      const motion = Math.hypot(next.x - position.x, next.z - position.z) / Math.max(dt, 0.001);
      Object.assign(position, next);
      if (motion > 0.1) { facing = Math.atan2(direction.x, direction.z); steps += motion * dt * PLAYER.stepRate; }
      return motion;
    },
  };
}
