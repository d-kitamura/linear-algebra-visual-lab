import type { VectorValue } from '../domain';
import type { PlaneVectorPresentation } from './VectorPlane2D';
import { SvgVectorLabel } from './SvgVectorLabel';
import { toSvgPoint, type PlaneViewport } from './planeGeometry';

/** 同じ図の入力・像を区別する共通表示。完全一致はラベルを統合し、近接時は上下へ分離する。 */
export function inputImagePresentation(input: VectorValue, image: VectorValue | null, viewport: PlaneViewport): Record<string, PlaneVectorPresentation> {
  const same = image !== null && input.coordinates.every((v, i) => v === image.coordinates[i]);
  const endpoint = toSvgPoint(input.coordinates as readonly [number, number], viewport);
  const imageEndpoint = image ? toSvgPoint(image.coordinates as readonly [number, number], viewport) : null;
  const close = imageEndpoint && Math.hypot(endpoint[0] - imageEndpoint[0], endpoint[1] - imageEndpoint[1]) < 85;
  // 共通SVGはplot内でclipする。長い写像ラベルも表示端の内側に置く。
  const offset = (point: readonly [number, number], right: boolean, width: number, dy: number): readonly [number, number] => {
    const x = Math.max(viewport.padding + 8 + (right ? 0 : width),
      Math.min(viewport.width - viewport.padding - 8 - (right ? width : 0), point[0] + (right ? 16 : -16)));
    const y = Math.max(viewport.padding + 24, Math.min(viewport.height - viewport.padding - 8, point[1] + dy));
    return [x - point[0], y - point[1]];
  };
  return {
    [input.id]: { strokeWidth: 5, labelOffset: offset(endpoint, input.coordinates[0] >= 0, same ? 120 : 22, -18),
      ...(same ? { label: <><SvgVectorLabel name={input.name} /><tspan> = </tspan><SvgVectorLabel name={image!.name} /></> } : {}) },
    ...(image ? { [image.id]: { strokeWidth: 9, outline: true, ...(same ? { hideArrow: true, label: null }
      : imageEndpoint ? { labelOffset: offset(imageEndpoint, image.coordinates[0] >= 0, 65, close ? 30 : -18) } : {}) } } : {}),
  };
}
