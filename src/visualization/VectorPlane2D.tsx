import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import type { VectorValue } from '../domain';
import { splitVectorName } from '../ui';
import {
  DEFAULT_PLANE_VIEWPORT,
  createAdaptiveTicks,
  createArrowHeadPoints,
  formatTickValue,
  fromSvgPoint,
  panViewportBySvgDelta,
  pointsToSvg,
  toSvgPoint,
  translateViewport,
  vectorCoordinatesFromSvgPoint,
  zoomViewportAt,
  type PlaneViewport,
  type SvgPoint,
} from './planeGeometry';

interface VectorPlane2DProps {
  readonly vectors: readonly VectorValue[];
  readonly colors: readonly string[];
  readonly viewport?: PlaneViewport;
  readonly onViewportChange?: (viewport: PlaneViewport) => void;
  readonly onVectorDragStart?: (vectorId: string) => void;
  readonly onVectorChange?: (
    vectorId: string,
    coordinates: readonly [number, number],
  ) => void;
  readonly onVectorDragEnd?: (vectorId: string) => void;
  readonly parallelSnapTargetId?: string | null;
}

const WHEEL_ZOOM_SENSITIVITY = 0.0015;
const MAX_WHEEL_DELTA = 500;

export function VectorPlane2D({
  vectors,
  colors,
  viewport = DEFAULT_PLANE_VIEWPORT,
  onViewportChange,
  onVectorDragStart,
  onVectorChange,
  onVectorDragEnd,
  parallelSnapTargetId = null,
}: VectorPlane2DProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const viewportRef = useRef(viewport);
  const onViewportChangeRef = useRef(onViewportChange);
  const pointerPositionsRef = useRef(new Map<number, SvgPoint>());
  const vectorDragRef = useRef<{ pointerId: number; vectorId: string } | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [draggingVectorId, setDraggingVectorId] = useState<string | null>(null);
  viewportRef.current = viewport;
  onViewportChangeRef.current = onViewportChange;

  const xScale = createAdaptiveTicks(viewport.minX, viewport.maxX);
  const yScale = createAdaptiveTicks(viewport.minY, viewport.maxY);
  const origin = toSvgPoint([0, 0], viewport);
  const plotLeft = viewport.padding;
  const plotRight = viewport.width - viewport.padding;
  const plotTop = viewport.padding;
  const plotBottom = viewport.height - viewport.padding;
  const showsXAxis = viewport.minY <= 0 && viewport.maxY >= 0;
  const showsYAxis = viewport.minX <= 0 && viewport.maxX >= 0;
  const xTickLabelY = showsXAxis ? origin[1] + 24 : plotBottom + 24;
  const yTickLabelX = showsYAxis ? origin[0] - 18 : plotLeft - 12;
  const description = vectors
    .map((vector) => `${vector.name} は第1成分 ${vector.coordinates[0]}、第2成分 ${vector.coordinates[1]}`)
    .join('。');

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) {
      return undefined;
    }

    function handleWheel(event: WheelEvent): void {
      if (!onViewportChangeRef.current || !svgRef.current || vectorDragRef.current) {
        return;
      }

      event.preventDefault();
      const currentViewport = viewportRef.current;
      const svgPoint = clientPointToSvg(
        svgRef.current,
        event.clientX,
        event.clientY,
        currentViewport,
        true,
      );
      const anchor = fromSvgPoint(svgPoint, currentViewport);
      const boundedDelta = Math.max(-MAX_WHEEL_DELTA, Math.min(MAX_WHEEL_DELTA, event.deltaY));
      const factor = Math.exp(boundedDelta * WHEEL_ZOOM_SENSITIVITY);

      emitViewport(zoomViewportAt(currentViewport, anchor, factor));
    }

    svg.addEventListener('wheel', handleWheel, { passive: false });
    return () => svg.removeEventListener('wheel', handleWheel);
  }, []);

  function emitViewport(nextViewport: PlaneViewport): void {
    viewportRef.current = nextViewport;
    onViewportChangeRef.current?.(nextViewport);
  }

  function handlePointerDown(event: ReactPointerEvent<SVGRectElement>): void {
    if (!onViewportChangeRef.current || vectorDragRef.current) {
      return;
    }

    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    pointerPositionsRef.current.set(
      event.pointerId,
      clientPointToSvg(
        event.currentTarget.ownerSVGElement,
        event.clientX,
        event.clientY,
        viewportRef.current,
        false,
      ),
    );
    setIsPanning(true);
  }

  function handlePointerMove(event: ReactPointerEvent<SVGRectElement>): void {
    if (!pointerPositionsRef.current.has(event.pointerId)) {
      return;
    }

    event.preventDefault();
    const previousPositions = new Map(pointerPositionsRef.current);
    const currentPoint = clientPointToSvg(
      event.currentTarget.ownerSVGElement,
      event.clientX,
      event.clientY,
      viewportRef.current,
      false,
    );
    pointerPositionsRef.current.set(event.pointerId, currentPoint);

    if (pointerPositionsRef.current.size === 1) {
      const previousPoint = previousPositions.get(event.pointerId);
      if (previousPoint) {
        emitViewport(panViewportBySvgDelta(viewportRef.current, [
          currentPoint[0] - previousPoint[0],
          currentPoint[1] - previousPoint[1],
        ]));
      }
      return;
    }

    const pointerIds = [...pointerPositionsRef.current.keys()].slice(0, 2);
    const previousFirst = previousPositions.get(pointerIds[0]);
    const previousSecond = previousPositions.get(pointerIds[1]);
    const currentFirst = pointerPositionsRef.current.get(pointerIds[0]);
    const currentSecond = pointerPositionsRef.current.get(pointerIds[1]);

    if (!previousFirst || !previousSecond || !currentFirst || !currentSecond) {
      return;
    }

    const previousDistance = distance(previousFirst, previousSecond);
    const currentDistance = distance(currentFirst, currentSecond);
    if (previousDistance === 0 || currentDistance === 0) {
      return;
    }

    const previousMidpoint = midpoint(previousFirst, previousSecond);
    const currentMidpoint = midpoint(currentFirst, currentSecond);
    const anchor = fromSvgPoint(previousMidpoint, viewportRef.current);
    const zoomed = zoomViewportAt(
      viewportRef.current,
      anchor,
      previousDistance / currentDistance,
    );
    const currentMidpointCoordinate = fromSvgPoint(currentMidpoint, zoomed);

    emitViewport(translateViewport(
      zoomed,
      anchor[0] - currentMidpointCoordinate[0],
      anchor[1] - currentMidpointCoordinate[1],
    ));
  }

  function handlePointerEnd(event: ReactPointerEvent<SVGRectElement>): void {
    pointerPositionsRef.current.delete(event.pointerId);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setIsPanning(pointerPositionsRef.current.size > 0);
  }

  function handleVectorPointerDown(
    event: ReactPointerEvent<SVGCircleElement>,
    vectorId: string,
  ): void {
    if (
      !onVectorChange
      || vectorDragRef.current
      || pointerPositionsRef.current.size > 0
      || (event.pointerType === 'mouse' && event.button !== 0)
    ) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    vectorDragRef.current = { pointerId: event.pointerId, vectorId };
    setDraggingVectorId(vectorId);
    onVectorDragStart?.(vectorId);
  }

  function handleVectorPointerMove(
    event: ReactPointerEvent<SVGCircleElement>,
    vectorId: string,
  ): void {
    const activeDrag = vectorDragRef.current;
    if (
      !activeDrag
      || activeDrag.pointerId !== event.pointerId
      || activeDrag.vectorId !== vectorId
      || !onVectorChange
    ) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    const svgPoint = clientPointToSvg(
      event.currentTarget.ownerSVGElement,
      event.clientX,
      event.clientY,
      viewportRef.current,
      false,
    );
    onVectorChange(vectorId, vectorCoordinatesFromSvgPoint(svgPoint, viewportRef.current));
  }

  function handleVectorPointerEnd(
    event: ReactPointerEvent<SVGCircleElement>,
    vectorId: string,
  ): void {
    const activeDrag = vectorDragRef.current;
    if (
      !activeDrag
      || activeDrag.pointerId !== event.pointerId
      || activeDrag.vectorId !== vectorId
    ) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    vectorDragRef.current = null;
    setDraggingVectorId(null);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    onVectorDragEnd?.(vectorId);
  }

  return (
    <svg
      ref={svgRef}
      className="vector-plane"
      viewBox={`0 0 ${viewport.width} ${viewport.height}`}
      role="img"
      aria-labelledby="vector-plane-title vector-plane-description"
    >
      <title id="vector-plane-title">2次元数ベクトルの座標表示</title>
      <desc id="vector-plane-description">
        {`原点から各列ベクトルの終点へ向かう矢印です。${description}。`}
      </desc>
      <defs>
        <clipPath id="vector-plane-plot-clip">
          <rect
            x={plotLeft}
            y={plotTop}
            width={plotRight - plotLeft}
            height={plotBottom - plotTop}
            rx="8"
          />
        </clipPath>
      </defs>

      <rect
        className={`plot-background plot-interaction-surface ${isPanning ? 'is-panning' : ''}`}
        x={plotLeft}
        y={plotTop}
        width={plotRight - plotLeft}
        height={plotBottom - plotTop}
        rx="8"
        aria-hidden="true"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
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
        {showsXAxis ? (
          <>
            <line x1={plotLeft} y1={origin[1]} x2={plotRight} y2={origin[1]} />
            <path d={`M ${plotRight - 10} ${origin[1] - 5} L ${plotRight} ${origin[1]} L ${plotRight - 10} ${origin[1] + 5}`} />
            <text className="axis-symbol" x={plotRight + 18} y={origin[1] + 5}>x</text>
          </>
        ) : null}
        {showsYAxis ? (
          <>
            <line x1={origin[0]} y1={plotBottom} x2={origin[0]} y2={plotTop} />
            <path d={`M ${origin[0] - 5} ${plotTop + 10} L ${origin[0]} ${plotTop} L ${origin[0] + 5} ${plotTop + 10}`} />
            <text className="axis-symbol" x={origin[0] + 8} y={plotTop - 16}>y</text>
          </>
        ) : null}
      </g>

      <g className="tick-labels" aria-hidden="true">
        {xScale.values.filter((tick) => tick !== 0).map((tick) => {
          const [x] = toSvgPoint([tick, 0], viewport);
          return (
            <text key={`label-x-${tick}`} x={x} y={xTickLabelY} textAnchor="middle">
              {formatTickValue(tick, xScale.step)}
            </text>
          );
        })}
        {yScale.values.filter((tick) => tick !== 0).map((tick) => {
          const [, y] = toSvgPoint([0, tick], viewport);
          return (
            <text key={`label-y-${tick}`} x={yTickLabelX} y={y + 4} textAnchor="end">
              {formatTickValue(tick, yScale.step)}
            </text>
          );
        })}
        {showsXAxis && showsYAxis ? (
          <text x={origin[0] - 16} y={origin[1] + 22}>0</text>
        ) : null}
      </g>

      <g className="vector-arrows" clipPath="url(#vector-plane-plot-clip)">
        {vectors.map((vector, index) => {
          const coordinates = vector.coordinates as readonly [number, number];
          const end = toSvgPoint(coordinates, viewport);
          const arrowHead = createArrowHeadPoints(origin, end);
          const color = colors[index % colors.length];
          const labelX = end[0] + (coordinates[0] >= 0 ? 14 : -14);
          const labelY = end[1] - 14;
          const nameParts = splitVectorName(vector.name);

          return (
            <g
              key={vector.id}
              className={`vector-arrow ${parallelSnapTargetId === vector.id ? 'is-snap-target' : ''}`}
            >
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
              <circle
                className={`vector-drag-handle ${draggingVectorId === vector.id ? 'is-dragging' : ''} ${draggingVectorId === vector.id && parallelSnapTargetId ? 'is-snapped' : ''}`}
                cx={end[0]}
                cy={end[1]}
                r="18"
                fill={color}
                stroke={color}
                aria-hidden="true"
                focusable="false"
                onPointerDown={(event) => handleVectorPointerDown(event, vector.id)}
                onPointerMove={(event) => handleVectorPointerMove(event, vector.id)}
                onPointerUp={(event) => handleVectorPointerEnd(event, vector.id)}
                onPointerCancel={(event) => handleVectorPointerEnd(event, vector.id)}
                onLostPointerCapture={(event) => handleVectorPointerEnd(event, vector.id)}
              />
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

      <circle
        className="origin-point"
        cx={origin[0]}
        cy={origin[1]}
        r="4"
        clipPath="url(#vector-plane-plot-clip)"
        aria-hidden="true"
      />
    </svg>
  );
}

function clientPointToSvg(
  svg: SVGSVGElement | null,
  clientX: number,
  clientY: number,
  viewport: PlaneViewport,
  clampToPlot: boolean,
): SvgPoint {
  if (!svg) {
    return [viewport.width / 2, viewport.height / 2];
  }

  const bounds = svg.getBoundingClientRect();
  const x = (clientX - bounds.left) * viewport.width / Math.max(1, bounds.width);
  const y = (clientY - bounds.top) * viewport.height / Math.max(1, bounds.height);

  if (!clampToPlot) {
    return [x, y];
  }

  return [
    Math.min(viewport.width - viewport.padding, Math.max(viewport.padding, x)),
    Math.min(viewport.height - viewport.padding, Math.max(viewport.padding, y)),
  ];
}

function distance(first: SvgPoint, second: SvgPoint): number {
  return Math.hypot(second[0] - first[0], second[1] - first[1]);
}

function midpoint(first: SvgPoint, second: SvgPoint): SvgPoint {
  return [(first[0] + second[0]) / 2, (first[1] + second[1]) / 2];
}
