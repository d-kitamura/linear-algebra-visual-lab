import { applyLinearMap, type LinearMapDefinition } from '../domain';
import { createAdaptiveTicks, type PlaneViewport } from './planeGeometry';

export interface LinearMapGridSegment {
  readonly family: 'first-coordinate' | 'second-coordinate';
  readonly sourceValue: number;
  readonly start: readonly [number, number];
  readonly end: readonly [number, number];
}

/** 定義域の表示格子を線形写像で移した線分を作る。 */
export function createLinearMapGridSegments(
  definition: LinearMapDefinition,
  sourceViewport: PlaneViewport,
): readonly LinearMapGridSegment[] {
  if (definition.sourceDimension !== 2 || definition.targetDimension !== 2) {
    throw new RangeError('2D格子の像には2次元から2次元への線形写像が必要です。');
  }

  const xTicks = createAdaptiveTicks(sourceViewport.minX, sourceViewport.maxX).values;
  const yTicks = createAdaptiveTicks(sourceViewport.minY, sourceViewport.maxY).values;

  return [
    ...xTicks.map((x): LinearMapGridSegment => ({
      family: 'first-coordinate',
      sourceValue: x,
      start: asVector2(applyLinearMap(definition, [x, sourceViewport.minY])),
      end: asVector2(applyLinearMap(definition, [x, sourceViewport.maxY])),
    })),
    ...yTicks.map((y): LinearMapGridSegment => ({
      family: 'second-coordinate',
      sourceValue: y,
      start: asVector2(applyLinearMap(definition, [sourceViewport.minX, y])),
      end: asVector2(applyLinearMap(definition, [sourceViewport.maxX, y])),
    })),
  ];
}

function asVector2(values: readonly number[]): readonly [number, number] {
  return [values[0], values[1]];
}
