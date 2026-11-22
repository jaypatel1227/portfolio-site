import { PLAYER } from "../config";
import { movePlayer, relativeMove, type Obstacle, type Point } from "../math";

export function createPlayer(home: Point, obstacles: readonly Obstacle[]) {
  const position = { ...home };
  const trail: Point[] = [{ ...home }];
  let facing = Math.PI, steps = 0;
  function clearSegment(a: Point, b: Point): boolean {
    const dx = b.x - a.x, dz = b.z - a.z, length2 = dx * dx + dz * dz;
    return obstacles.every((o) => {
      const t = length2 ? Math.max(0, Math.min(1, ((o.x - a.x) * dx + (o.z - a.z) * dz) / length2)) : 0;
      return (a.x + t * dx - o.x) ** 2 + (a.z + t * dz - o.z) ** 2 >= (o.r + PLAYER.radius) ** 2 - 1e-8;
    });
  }
  function advance(next: Point): void {
    if (position.x === next.x && position.z === next.z) return;
    // Keep only bends that cannot be retraced in a straight line.
    if (clearSegment(home, next)) trail.length = 1;
    else {
      while (trail.length > 1 && clearSegment(trail[trail.length - 2], next)) trail.pop();
      if (!clearSegment(trail[trail.length - 1], next)) trail.push({ ...position });
    }
    Object.assign(position, next);
  }
  return {
    position,
    get facing() { return facing; },
    get steps() { return steps; },
    reset() { Object.assign(position, home); facing = Math.PI; trail.length = 1; },
    get atHome() { return position.x === home.x && position.z === home.z; },
    carry(delta: Point) { advance(movePlayer(position, delta, obstacles, PLAYER.worldRadius)); },
    runHome(dt: number): number {
      let budget = PLAYER.speed * PLAYER.sprint * dt, moved = 0;
      while (budget > 0) {
        const target = trail[trail.length - 1];
        const dx = target.x - position.x, dz = target.z - position.z, distance = Math.hypot(dx, dz);
        if (distance > 0) facing = Math.atan2(dx, dz);
        const step = Math.min(distance, budget);
        if (distance > budget) {
          Object.assign(position, movePlayer(position, { x: dx * step / distance, z: dz * step / distance }, obstacles, PLAYER.worldRadius));
        } else Object.assign(position, target);
        moved += step; budget -= step;
        if (step < distance || trail.length === 1) break;
        trail.pop();
      }
      steps += moved * PLAYER.stepRate;
      return dt > 0 ? moved / dt : 0;
    },
    move(forward: number, strafe: number, yaw: number, sprint: boolean, dt: number): number {
      const direction = relativeMove(forward, strafe, yaw);
      const speed = PLAYER.speed * (sprint ? PLAYER.sprint : 1);
      if (!direction.x && !direction.z) return 0;
      const next = movePlayer(position, { x: direction.x * speed * dt, z: direction.z * speed * dt }, obstacles, PLAYER.worldRadius);
      const motion = Math.hypot(next.x - position.x, next.z - position.z) / Math.max(dt, 0.001);
      advance(next);
      if (motion > 0.1) { facing = Math.atan2(direction.x, direction.z); steps += motion * dt * PLAYER.stepRate; }
      return motion;
    },
  };
}
