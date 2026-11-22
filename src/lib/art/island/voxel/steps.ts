export function finish<T>(work: Generator<void, T>): T {
  let step = work.next();
  while (!step.done) step = work.next();
  return step.value;
}
