/** Always do one piece, even when an idle callback only ran because it timed out. */
export function advance<T>(work: Generator<void, T>, end: number) {
  let step = work.next();
  while (!step.done && performance.now() < end) step = work.next();
  return step;
}
