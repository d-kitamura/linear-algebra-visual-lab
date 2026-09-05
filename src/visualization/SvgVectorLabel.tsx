import { splitVectorName } from '../ui';

/** 数直線・座標平面で共用し、写像記号とベクトル、添え字の書体を区別する。 */
export function SvgVectorLabel({ name, fallbackParts = splitVectorName(name) }: {
  readonly name: string;
  readonly fallbackParts?: ReturnType<typeof splitVectorName>;
}) {
  const mappedVector = /^T\(([A-Za-z]+)([0-9]*)\)$/u.exec(name);
  if (mappedVector) return <>
    <tspan className="svg-map-symbol">T</tspan><tspan>(</tspan>
    <tspan className="svg-vector-base">{mappedVector[1]}</tspan>
    {mappedVector[2] ? <tspan className="svg-vector-subscript" baselineShift="sub" fontSize="65%">{mappedVector[2]}</tspan> : null}
    <tspan>)</tspan>
  </>;
  return <>
    <tspan className="svg-vector-base">{fallbackParts.base}</tspan>
    {fallbackParts.subscript ? <tspan className="svg-vector-subscript" baselineShift="sub" fontSize="65%">{fallbackParts.subscript}</tspan> : null}
  </>;
}
