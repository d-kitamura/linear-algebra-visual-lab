import type { VectorValue } from '../domain';
import {
  DEFAULT_PLANE_VIEWPORT,
  createArrowHeadPoints,
  createIntegerTicks,
  pointsToSvg,
  toSvgPoint,
} from './planeGeometry';

interface VectorPlane2DProps {
  readonly vectors: readonly VectorValue[];
  readonly colors: readonly string[];
}

export function VectorPlane2D({ vectors, colors }: VectorPlane2DProps) {
  const viewport = DEFAULT_PLANE_VIEWPORT;
  const xTicks = createIntegerTicks(viewport.minX, viewport.maxX);
  const yTicks = createIntegerTicks(viewport.minY, viewport.maxY);
  const origin = toSvgPoint([0, 0], viewport);
  const plotLeft = viewport.padding;
  const plotRight = viewport.width - viewport.padding;
  const plotTop = viewport.padding;
  const plotBottom = viewport.height - viewport.padding;

  return (
    <svg
      className="vector-plane"
      viewBox={`0 0 ${viewport.width} ${viewport.height}`}
      role="img"
      aria-labelledby="vector-plane-title vector-plane-description"
    >
      <title id="vector-plane-title">2次元ベクトルの座標表示</title>
      <desc id="vector-plane-description">
        原点から v₁ は座標 2, 1 へ、v₂ は座標 -3, 2 へ向かう矢印です。
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
        {xTicks.map((tick) => {
          const [x] = toSvgPoint([tick, 0], viewport);
          return <line key={`grid-x-${tick}`} x1={x} y1={plotTop} x2={x} y2={plotBottom} />;
        })}
        {yTicks.map((tick) => {
          const [, y] = toSvgPoint([0, tick], viewport);
          return <line key={`grid-y-${tick}`} x1={plotLeft} y1={y} x2={plotRight} y2={y} />;
        })}
      </g>

      <g className="coordinate-axes" aria-hidden="true">
        <line x1={plotLeft} y1={origin[1]} x2={plotRight} y2={origin[1]} />
        <line x1={origin[0]} y1={plotBottom} x2={origin[0]} y2={plotTop} />
        <path d={`M ${plotRight - 10} ${origin[1] - 5} L ${plotRight} ${origin[1]} L ${plotRight - 10} ${origin[1] + 5}`} />
        <path d={`M ${origin[0] - 5} ${plotTop + 10} L ${origin[0]} ${plotTop} L ${origin[0] + 5} ${plotTop + 10}`} />
        <text x={plotRight + 18} y={origin[1] + 5}>x</text>
        <text x={origin[0] + 8} y={plotTop - 16}>y</text>
      </g>

      <g className="tick-labels" aria-hidden="true">
        {xTicks.filter((tick) => tick !== 0).map((tick) => {
          const [x] = toSvgPoint([tick, 0], viewport);
          return <text key={`label-x-${tick}`} x={x} y={origin[1] + 24}>{tick}</text>;
        })}
        {yTicks.filter((tick) => tick !== 0).map((tick) => {
          const [, y] = toSvgPoint([0, tick], viewport);
          return <text key={`label-y-${tick}`} x={origin[0] - 18} y={y + 4}>{tick}</text>;
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

          return (
            <g key={vector.id} className="vector-arrow">
              <title>{`${vector.name} = (${coordinates[0]}, ${coordinates[1]})`}</title>
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
                {vector.name}
              </text>
            </g>
          );
        })}
      </g>

      <circle className="origin-point" cx={origin[0]} cy={origin[1]} r="4" aria-hidden="true" />
    </svg>
  );
}
