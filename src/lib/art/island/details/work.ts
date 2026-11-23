const SLICE_MS = 5;

export function buildBudget(idle?: IdleDeadline): number {
  // A busy renderer may never grant idle time. Limit forced work to one slice per frame.
  return !idle || idle.didTimeout ? SLICE_MS : Math.min(SLICE_MS, idle.timeRemaining());
}

export function advance<T>(work: Generator<void, T>, end: number) {
  let step = work.next();
  while (!step.done && performance.now() < end) step = work.next();
  return step;
}
