import type { VectorValue } from '../domain';
import type { ThreeDimensionalPoint } from './spaceGeometry';

export type SpaceCombinationGeometryKind = 'parallelogram' | 'parallelepiped';

export interface SpaceCombinationGeometry {
  readonly kind: SpaceCombinationGeometryKind;
  readonly terms: readonly ThreeDimensionalPoint[];
  readonly vertices: readonly ThreeDimensionalPoint[];
  readonly originEdges: readonly (readonly [number, number])[];
  readonly helperEdges: readonly (readonly [number, number])[];
  readonly faces: readonly (readonly [number, number, number, number])[];
  readonly targetIndex: number;
}

const PARALLELOGRAM_ORIGIN_EDGES = [[0, 1], [0, 2]] as const;
const PARALLELOGRAM_HELPER_EDGES = [[1, 3], [2, 3]] as const;
const PARALLELOGRAM_FACES = [[0, 1, 3, 2]] as const;

const PARALLELEPIPED_ORIGIN_EDGES = [[0, 1], [0, 2], [0, 4]] as const;
const PARALLELEPIPED_HELPER_EDGES = [
  [1, 3], [1, 5],
  [2, 3], [2, 6],
  [4, 5], [4, 6],
  [3, 7], [5, 7], [6, 7],
] as const;
const PARALLELEPIPED_FACES = [
  [0, 1, 3, 2],
  [4, 5, 7, 6],
  [0, 1, 5, 4],
  [2, 3, 7, 6],
  [0, 2, 6, 4],
  [1, 3, 7, 5],
] as const;

export function createSpaceCombinationGeometry(
  vectors: readonly VectorValue[],
  coefficients: readonly number[],
): SpaceCombinationGeometry | null {
  if (vectors.length !== 2 && vectors.length !== 3) {
    return null;
  }
  if (coefficients.length !== vectors.length) {
    throw new RangeError('一次結合係数の数は選択ベクトル数と一致する必要があります。');
  }
  if (coefficients.some((coefficient) => !Number.isFinite(coefficient))) {
    throw new RangeError('一次結合係数は有限値である必要があります。');
  }

  const terms = vectors.map((vector, index) => ({
    x: cleanZero((vector.coordinates[0] ?? 0) * coefficients[index]),
    y: cleanZero((vector.coordinates[1] ?? 0) * coefficients[index]),
    z: cleanZero((vector.coordinates[2] ?? 0) * coefficients[index]),
  }));
  const vertexCount = 2 ** terms.length;
  const vertices = Array.from({ length: vertexCount }, (_, mask) => terms.reduce(
    (point, term, termIndex) => (mask & (1 << termIndex)) === 0
      ? point
      : addPoints(point, term),
    { x: 0, y: 0, z: 0 } as ThreeDimensionalPoint,
  ));

  if (vectors.length === 2) {
    return {
      kind: 'parallelogram',
      terms,
      vertices,
      originEdges: PARALLELOGRAM_ORIGIN_EDGES,
      helperEdges: PARALLELOGRAM_HELPER_EDGES,
      faces: PARALLELOGRAM_FACES,
      targetIndex: 3,
    };
  }

  return {
    kind: 'parallelepiped',
    terms,
    vertices,
    originEdges: PARALLELEPIPED_ORIGIN_EDGES,
    helperEdges: PARALLELEPIPED_HELPER_EDGES,
    faces: PARALLELEPIPED_FACES,
    targetIndex: 7,
  };
}

function cleanZero(value: number): number {
  return Object.is(value, -0) ? 0 : value;
}

function addPoints(
  first: ThreeDimensionalPoint,
  second: ThreeDimensionalPoint,
): ThreeDimensionalPoint {
  return {
    x: first.x + second.x,
    y: first.y + second.y,
    z: first.z + second.z,
  };
}
