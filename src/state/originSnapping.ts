export function isWithinOriginSnapDistance(
  coordinates: readonly number[],
  maximumDistance: number,
): boolean {
  return Math.hypot(...coordinates) <= maximumDistance;
}
