import type { VectorValue } from '../domain';
import { splitVectorName } from '../ui';
import {
  DEFAULT_PLANE_VIEWPORT,
  createAdaptiveTicks,
  createArrowHeadPoints,
  formatTickValue,
  pointsToSvg,
  toSvgPoint,
  type PlaneViewport,
} from './planeGeometry';

interface VectorPlane2DProps {
  readonly vectors: readonly VectorValue[];
  readonly colors: readonly string[];
  readonly viewport?: PlaneViewport;
}

export function VectorPlane2D({
  vectors,
  colors,
  viewport = DEFAULT_PLANE_VIEWPORT,
}: VectorPlane2DProps) {
  const xScale = createAdaptiveTicks(viewport.minX, viewport.maxX);
  const yScale = createAdaptiveTicks(viewport.minY, viewport.maxY);
  const origin = toSvgPoint([0, 0], viewport);
  const plotLeft = viewport.padding;
  const plotRight = viewport.width - viewport.padding;
  const plotTop = viewport.padding;
  const plotBottom = viewport.height - viewport.padding;
  const description = vectors
    .map((vector) => `${vector.name} は第1成分 ${vector.coordinates[0]}、第2成分 ${vector.coordinates[1]}`)
    .join('。');

  return (
    <svg
      className="vector-plane"
      viewBox={`0 0 ${viewport.width} ${viewport.height}`}
      role="img"
      aria-labelledby="vector-plane-title vector-plane-description"
    >
      <title id="vector-plane-title">2次元数ベクトルの座標表示</title>
      <desc id="vector-plane-description">
        {`原点から各列ベクトルの終点へ向かう矢印です。${description}。`}
      </desc>

      <rect
        className="plot-background"
        x={plotLeft}
        y={plotTop}
        width={plotRight - plotLeft}
        height={plotBottom - plotTop}
        rx="8"
      />

      <g className="grid-lines" aria-hidden="true">
        {xScale.values.map((tick) => {
          const [x] = toSvgPoint([tick, 0], viewport);
          return <line key={`grid-x-${tick}`} x1={x} y1={plotTop} x2={x} y2={plotBottom} />;
        })}
        {yScale.values.map((tick) => {
          const [, y] = toSvgPoint([0, tick], viewport);
          return <line key={`grid-y-${tick}`} x1={plotLeft} y1={y} x2={plotRight} y2={y} />;
        })}
      </g>

      <g className="coordinate-axes" aria-hidden="true">
        <line x1={plotLeft} y1={origin[1]} x2={plotRight} y2={origin[1]} />
        <line x1={origin[0]} y1={plotBottom} x2={origin[0]} y2={plotTop} />
        <path d={`M ${plotRight - 10} ${origin[1] - 5} L ${plotRight} ${origin[1]} L ${plotRight - 10} ${origin[1] + 5}`} />
        <path d={`M ${origin[0] - 5} ${plotTop + 10} L ${origin[0]} ${plotTop} L ${origin[0] + 5} ${plotTop + 10}`} />
        <text className="axis-symbol" x={plotRight + 18} y={origin[1] + 5}>x</text>
        <text className="axis-symbol" x={origin[0] + 8} y={plotTop - 16}>y</text>
      </g>

      <g className="tick-labels" aria-hidden="true">
        {xScale.values.filter((tick) => tick !== 0).map((tick) => {
          const [x] = toSvgPoint([tick, 0], viewport);
          return (
            <text key={`label-x-${tick}`} x={x} y={origin[1] + 24} textAnchor="middle">
              {formatTickValue(tick, xScale.step)}
            </text>
          );
        })}
        {yScale.values.filter((tick) => tick !== 0).map((tick) => {
          const [, y] = toSvgPoint([0, tick], viewport);
          return (
            <text key={`label-y-${tick}`} x={origin[0] - 18} y={y + 4} textAnchor="end">
              {formatTickValue(tick, yScale.step)}
            </text>
          );
        })}
        <text x={origin[0] - 16} y={origin[1] + 22}>0</text>
      </g>

      <g className="vector-arrows">
        {vectors.map((vector, index) => {
          const coordinates = vector.coordinates as readonly [number, number];
          const end = toSvgPoint(coordinates, viewport);
          const arrowHead = createArrowHeadPoints(origin, end);
          const color = colors[index % colors.length];
          const labelX = end[0] + (coordinates[0] >= 0 ? 14 : -14);
          const labelY = end[1] - 14;
          const nameParts = splitVectorName(vector.name);

          return (
            <g key={vector.id} className="vector-arrow">
              <title>{`${vector.name} は第1成分 ${coordinates[0]}、第2成分 ${coordinates[1]} の列ベクトル`}</title>
              <line
                x1={origin[0]}
                y1={origin[1]}
                x2={end[0]}
                y2={end[1]}
                stroke={color}
              />
              {arrowHead ? (
                <polygon points={pointsToSvg(arrowHead)} fill={color} />
              ) : (
                <circle cx={origin[0]} cy={origin[1]} r="8" fill={color} />
              )}
              <circle className="vector-tip" cx={end[0]} cy={end[1]} r="4" fill={color} />
              <text
                className="vector-label"
                x={labelX}
                y={labelY}
                fill={color}
                textAnchor={coordinates[0] >= 0 ? 'start' : 'end'}
              >
                <tspan className="svg-vector-base">{nameParts.base}</tspan>
                {nameParts.subscript ? (
                  <tspan
                    className="svg-vector-subscript"
                    baselineShift="sub"
                    fontSize="65%"
                  >
                    {nameParts.subscript}
                  </tspan>
                ) : null}
              </text>
            </g>
          );
        })}
      </g>

      <circle className="origin-point" cx={origin[0]} cy={origin[1]} r="4" aria-hidden="true" />
    </svg>
  );
}
