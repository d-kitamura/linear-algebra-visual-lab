import { toInnerProductCoordinates, fromInnerProductCoordinates, type InnerProductMetric, type VectorValue } from '../../domain';
import { innerProductMetric, type InnerProductScene } from './innerProductScene';

/** 図だけをC座標へ変換する。入力・解析snapshotの標準係数は変更しない。 */
export function innerDisplayCoordinates(metric: InnerProductMetric, values: readonly number[]): readonly number[] | null {
  const result = toInnerProductCoordinates(metric, values);
  return result.status === 'ready' && result.value.every(v => Math.abs(v) <= 1e6) ? result.value : null;
}
export function innerInputCoordinates(scene: InnerProductScene, coordinates: readonly number[]): readonly number[] | null {
  if (coordinates.length !== scene.dimension || coordinates.some(x => !Number.isFinite(x))) return null;
  // 原点吸着は逆変換の丸めを経ず、元係数も厳密な零にする。
  if (coordinates.every(x => x === 0)) return Array<number>(scene.dimension).fill(0);
  const result = fromInnerProductCoordinates(innerProductMetric(scene.dimension, scene.metric), coordinates);
  return result.status === 'ready' && result.value.every(x => Math.abs(x) <= 1e6) ? result.value : null;
}
export function innerDisplayPlots<T extends { readonly vectors: readonly VectorValue[]; readonly inputs: readonly VectorValue[]; readonly safe: boolean }>(scene: InnerProductScene, plots: T): T {
  if (scene.metric !== 'integral') return plots;
  const metric = innerProductMetric(scene.dimension, scene.metric);
  let safe = true;
  const vectors = plots.vectors.map(vector => {
    const coordinates = innerDisplayCoordinates(metric, vector.coordinates);
    if (!coordinates) { safe = false; return vector; }
    return { ...vector, coordinates };
  });
  const inputs = vectors.filter(v => plots.inputs.some(input => input.id === v.id));
  return { ...plots, vectors, inputs, safe };
}
