/** Low swells under the wheat and a winding footpath to the village. */
export function heightAt(x: number, z: number): number {
  return Math.sin(x * 0.075 + z * 0.045) * 0.9
    + Math.cos(z * 0.09) * 0.65 + Math.sin(x * 0.19 - z * 0.06) * 0.22;
}

export function pathAt(z: number): number {
  return Math.sin((z - 18) * 0.065) * 5;
}
