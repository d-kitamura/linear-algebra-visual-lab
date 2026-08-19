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
  createLineSegmentThroughViewport,
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
  readonly spanVectors?: readonly VectorValue[];
  readonly spanDimension?: number;
  readonly showSpan?: boolean;
  readonly linearCombinationVisible?: boolean;
  readonly target?: readonly [number, number] | null;
  readonly linearCombinationCoefficients?: readonly [number, number] | null;
  readonly targetSnapKind?: 'origin' | 'span-line' | null;
  readonly onTargetPlacement?: (coordinates: readonly [number, number]) => void;
  readonly onTargetDragStart?: () => void;
  readonly onTargetChange?: (coordinates: readonly [number, number]) => void;
  readonly onTargetDragEnd?: () => void;
}

const WHEEL_ZOOM_SENSITIVITY = 0.0015;
const MAX_WHEEL_DELTA = 500;
const TARGET_TAP_MOVEMENT_THRESHOLD = 8;

export function VectorPlane2D({
  vectors,
  colors,
  viewport = DEFAULT_PLANE_VIEWPORT,
  onViewportChange,
  onVectorDragStart,
  onVectorChange,
  onVectorDragEnd,
  parallelSnapTargetId = null,
  spanVectors = [],
  spanDimension = 0,
  showSpan = false,
  linearCombinationVisible = false,
  target = null,
  linearCombinationCoefficients = null,
  targetSnapKind = null,
  onTargetPlacement,
  onTargetDragStart,
  onTargetChange,
  onTargetDragEnd,
}: VectorPlane2DProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const viewportRef = useRef(viewport);
  const onViewportChangeRef = useRef(onViewportChange);
  const pointerPositionsRef = useRef(new Map<number, SvgPoint>());
  const pointerStartPositionsRef = useRef(new Map<number, SvgPoint>());
  const draggedBackgroundPointersRef = useRef(new Set<number>());
  const vectorDragRef = useRef<{ pointerId: number; vectorId: string } | null>(null);
  const targetDragRef = useRef<{ pointerId: number } | null>(null);
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
  const vectorDescription = vectors.length === 0
    ? '表示中の列ベクトルはありません。'
    : `原点から各列ベクトルの終点へ向かう矢印です。${vectors
        .map((vector) => `${vector.name} は第1成分 ${vector.coordinates[0]}、第2成分 ${vector.coordinates[1]}`)
        .join('。')}。`;
  const spanVectorIds = new Set(spanVectors.map((vector) => vector.id));
  const spanDirection = spanVectors.find((vector) =>
    vector.coordinates[0] !== 0 || vector.coordinates[1] !== 0,
  )?.coordinates as readonly [number, number] | undefined;
  const spanLine = showSpan && spanDimension === 1 && spanDirection
    ? createLineSegmentThroughViewport(spanDirection, viewport)
    : null;
  const spanShapeLabel = spanDimension === 0
    ? '原点'
    : spanDimension === 1
      ? '原点を通る直線'
      : '2次元座標平面全体';
  const spanGeometryLabel = `生成する空間：${spanShapeLabel}`;
  const spanGeometryLabelWidth = Math.min(
    plotRight - plotLeft - 24,
    Math.max(160, Array.from(spanGeometryLabel).length * 14 + 28),
  );
  const spanDescription = showSpan
    ? `選択した${spanVectors.length === 0 ? '空集合' : spanVectors.map((vector) => vector.name).join('、')}が生成する空間を、${spanShapeLabel}として表示しています。`
    : '選択したベクトルが生成する空間の幾何表示はオフです。';
  const targetDescription = linearCombinationVisible
    ? target
      ? `ターゲット x は第1成分 ${target[0]}、第2成分 ${target[1]} です。${linearCombinationCoefficients && spanVectors.length === 2 ? '2項の一次結合を原点からの2辺とする平行四辺形も表示しています。' : ''}`
      : '一次結合を調べるモードです。ターゲット x はまだ配置されていません。'
    : '一次結合を調べるモードはオフです。';

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) {
      return undefined;
    }

    function handleWheel(event: WheelEvent): void {
      if (
        !onViewportChangeRef.current
        || !svgRef.current
        || vectorDragRef.current
        || targetDragRef.current
      ) {
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
    if (!onViewportChangeRef.current || vectorDragRef.current || targetDragRef.current) {
      return;
    }

    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = clientPointToSvg(
      event.currentTarget.ownerSVGElement,
      event.clientX,
      event.clientY,
      viewportRef.current,
      false,
    );
    pointerPositionsRef.current.set(event.pointerId, point);
    pointerStartPositionsRef.current.set(event.pointerId, point);
    if (pointerPositionsRef.current.size > 1) {
      for (const pointerId of pointerPositionsRef.current.keys()) {
        draggedBackgroundPointersRef.current.add(pointerId);
      }
    }
    setIsPanning(!linearCombinationVisible);
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

    const startPoint = pointerStartPositionsRef.current.get(event.pointerId);
    if (
      startPoint
      && distance(startPoint, currentPoint) > TARGET_TAP_MOVEMENT_THRESHOLD
    ) {
      draggedBackgroundPointersRef.current.add(event.pointerId);
    }

    if (pointerPositionsRef.current.size === 1) {
      if (
        linearCombinationVisible
        && !draggedBackgroundPointersRef.current.has(event.pointerId)
      ) {
        return;
      }
      const previousPoint = previousPositions.get(event.pointerId);
      if (previousPoint) {
        setIsPanning(true);
        emitViewport(panViewportBySvgDelta(viewportRef.current, [
          currentPoint[0] - previousPoint[0],
          currentPoint[1] - previousPoint[1],
        ]));
      }
      return;
    }

    const pointerIds = [...pointerPositionsRef.current.keys()].slice(0, 2);
    pointerIds.forEach((pointerId) => draggedBackgroundPointersRef.current.add(pointerId));
    setIsPanning(true);
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
    const point = pointerPositionsRef.current.get(event.pointerId);
    const shouldPlaceTarget = (
      event.type === 'pointerup'
      && linearCombinationVisible
      && Boolean(onTargetPlacement)
      && pointerPositionsRef.current.size === 1
      && !draggedBackgroundPointersRef.current.has(event.pointerId)
    );

    pointerPositionsRef.current.delete(event.pointerId);
    pointerStartPositionsRef.current.delete(event.pointerId);
    draggedBackgroundPointersRef.current.delete(event.pointerId);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setIsPanning(pointerPositionsRef.current.size > 0);

    if (shouldPlaceTarget && point) {
      onTargetPlacement?.(vectorCoordinatesFromSvgPoint(point, viewportRef.current));
    }
  }

  function handleVectorPointerDown(
    event: ReactPointerEvent<SVGCircleElement>,
    vectorId: string,
  ): void {
    if (
      !onVectorChange
      || vectorDragRef.current
      || targetDragRef.current
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

  function handleTargetPointerDown(
    event: ReactPointerEvent<SVGCircleElement>,
  ): void {
    if (
      !onTargetChange
      || vectorDragRef.current
      || targetDragRef.current
      || pointerPositionsRef.current.size > 0
      || (event.pointerType === 'mouse' && event.button !== 0)
    ) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    targetDragRef.current = { pointerId: event.pointerId };
    onTargetDragStart?.();
  }

  function handleTargetPointerMove(
    event: ReactPointerEvent<SVGCircleElement>,
  ): void {
    if (targetDragRef.current?.pointerId !== event.pointerId || !onTargetChange) {
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
    onTargetChange(vectorCoordinatesFromSvgPoint(svgPoint, viewportRef.current));
  }

  function handleTargetPointerEnd(
    event: ReactPointerEvent<SVGCircleElement>,
  ): void {
    if (targetDragRef.current?.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    targetDragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    onTargetDragEnd?.();
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
        {`${vectorDescription}${spanDescription}${targetDescription}`}
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
        <pattern
          id="span-plane-pattern"
          width="18"
          height="18"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(35)"
        >
          <line className="span-plane-hatch" x1="0" y1="0" x2="0" y2="18" />
        </pattern>
      </defs>

      <rect
        className={`plot-background plot-interaction-surface ${linearCombinationVisible ? 'is-target-mode' : ''} ${isPanning ? 'is-panning' : ''}`}
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

      {showSpan ? (
        <g
          className={`span-layer span-dimension-${spanDimension}`}
          clipPath="url(#vector-plane-plot-clip)"
          aria-hidden="true"
        >
          {spanDimension === 2 ? (
            <>
              <rect
                className="span-plane-fill"
                x={plotLeft}
                y={plotTop}
                width={plotRight - plotLeft}
                height={plotBottom - plotTop}
              />
              <rect
                className="span-plane-pattern"
                x={plotLeft}
                y={plotTop}
                width={plotRight - plotLeft}
                height={plotBottom - plotTop}
              />
            </>
          ) : null}
          {spanLine ? (
            <line
              className="span-line"
              x1={spanLine[0][0]}
              y1={spanLine[0][1]}
              x2={spanLine[1][0]}
              y2={spanLine[1][1]}
            />
          ) : null}
          {spanDimension === 0 ? (
            <g className="span-origin" transform={`translate(${origin[0]} ${origin[1]})`}>
              <circle r="15" />
              <path d="M -11 0 H 11 M 0 -11 V 11" />
            </g>
          ) : null}
        </g>
      ) : null}

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

      {showSpan ? (
        <g
          className="span-geometry-label"
          transform={`translate(${plotLeft + 12} ${plotTop + 12})`}
          aria-hidden="true"
        >
          <rect width={spanGeometryLabelWidth} height="32" rx="8" />
          <text x="14" y="21">{spanGeometryLabel}</text>
        </g>
      ) : null}

      {linearCombinationVisible
      && target
      && linearCombinationCoefficients
      && spanVectors.length === 2 ? (
        <CombinationParallelogram
          vectors={[spanVectors[0], spanVectors[1]]}
          coefficients={linearCombinationCoefficients}
          target={target}
          colors={[
            colorForVector(spanVectors[0], vectors, colors),
            colorForVector(spanVectors[1], vectors, colors),
          ]}
          viewport={viewport}
          origin={origin}
        />
      ) : null}

      <g
        className={`vector-arrows ${showSpan ? 'is-showing-span' : ''}`}
        clipPath="url(#vector-plane-plot-clip)"
      >
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
              className={`vector-arrow ${parallelSnapTargetId === vector.id ? 'is-snap-target' : ''} ${spanVectorIds.has(vector.id) ? 'is-span-selected' : ''}`}
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

      {linearCombinationVisible && target ? (
        <TargetVector
          target={target}
          viewport={viewport}
          origin={origin}
          snapKind={targetSnapKind}
          onPointerDown={handleTargetPointerDown}
          onPointerMove={handleTargetPointerMove}
          onPointerEnd={handleTargetPointerEnd}
        />
      ) : null}

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

function colorForVector(
  vector: VectorValue,
  vectors: readonly VectorValue[],
  colors: readonly string[],
): string {
  const vectorIndex = vectors.findIndex((candidate) => candidate.id === vector.id);
  return colors[(vectorIndex >= 0 ? vectorIndex : 0) % colors.length];
}

function CombinationParallelogram({
  vectors,
  coefficients,
  target,
  colors,
  viewport,
  origin,
}: {
  readonly vectors: readonly [VectorValue, VectorValue];
  readonly coefficients: readonly [number, number];
  readonly target: readonly [number, number];
  readonly colors: readonly [string, string];
  readonly viewport: PlaneViewport;
  readonly origin: SvgPoint;
}) {
  const scaledCoordinates: readonly [SvgPoint, SvgPoint] = [
    [
      vectors[0].coordinates[0] * coefficients[0],
      vectors[0].coordinates[1] * coefficients[0],
    ],
    [
      vectors[1].coordinates[0] * coefficients[1],
      vectors[1].coordinates[1] * coefficients[1],
    ],
  ];

  if (!scaledCoordinates.flat().every(Number.isFinite)) {
    return null;
  }

  const scaledEnds: readonly [SvgPoint, SvgPoint] = [
    toSvgPoint(scaledCoordinates[0], viewport),
    toSvgPoint(scaledCoordinates[1], viewport),
  ];
  const targetEnd = toSvgPoint(target, viewport);
  const arrowHeads = scaledEnds.map((end) => createArrowHeadPoints(origin, end));

  return (
    <g className="combination-parallelogram" clipPath="url(#vector-plane-plot-clip)" aria-hidden="true">
      <line
        className="parallelogram-opposite-edge"
        x1={scaledEnds[0][0]}
        y1={scaledEnds[0][1]}
        x2={targetEnd[0]}
        y2={targetEnd[1]}
      />
      <line
        className="parallelogram-opposite-edge"
        x1={scaledEnds[1][0]}
        y1={scaledEnds[1][1]}
        x2={targetEnd[0]}
        y2={targetEnd[1]}
      />
      {scaledEnds.map((end, index) => (
        <g className="scaled-combination-term" key={vectors[index].id}>
          <line
            x1={origin[0]}
            y1={origin[1]}
            x2={end[0]}
            y2={end[1]}
            stroke={colors[index]}
          />
          {arrowHeads[index] ? (
            <polygon points={pointsToSvg(arrowHeads[index]!)} fill={colors[index]} />
          ) : (
            <circle cx={origin[0]} cy={origin[1]} r="7" stroke={colors[index]} />
          )}
          <CombinationTermLabel
            coefficientIndex={index + 1}
            vectorName={vectors[index].name}
            coordinates={scaledCoordinates[index]}
            end={end}
            color={colors[index]}
          />
        </g>
      ))}
      <circle className="parallelogram-target-corner" cx={targetEnd[0]} cy={targetEnd[1]} r="7" />
    </g>
  );
}

function CombinationTermLabel({
  coefficientIndex,
  vectorName,
  coordinates,
  end,
  color,
}: {
  readonly coefficientIndex: number;
  readonly vectorName: string;
  readonly coordinates: SvgPoint;
  readonly end: SvgPoint;
  readonly color: string;
}) {
  const nameParts = splitVectorName(vectorName);

  return (
    <text
      className="combination-term-label"
      x={end[0] + (coordinates[0] >= 0 ? 12 : -12)}
      y={end[1] + 18}
      fill={color}
      textAnchor={coordinates[0] >= 0 ? 'start' : 'end'}
    >
      <tspan className="svg-scalar-base">c</tspan>
      <tspan className="svg-scalar-subscript" baselineShift="sub" fontSize="65%">
        {coefficientIndex}
      </tspan>
      <tspan className="svg-vector-base">{nameParts.base}</tspan>
      {nameParts.subscript ? (
        <tspan className="svg-vector-subscript" baselineShift="sub" fontSize="65%">
          {nameParts.subscript}
        </tspan>
      ) : null}
    </text>
  );
}

function TargetVector({
  target,
  viewport,
  origin,
  snapKind,
  onPointerDown,
  onPointerMove,
  onPointerEnd,
}: {
  readonly target: readonly [number, number];
  readonly viewport: PlaneViewport;
  readonly origin: SvgPoint;
  readonly snapKind: 'origin' | 'span-line' | null;
  readonly onPointerDown: (event: ReactPointerEvent<SVGCircleElement>) => void;
  readonly onPointerMove: (event: ReactPointerEvent<SVGCircleElement>) => void;
  readonly onPointerEnd: (event: ReactPointerEvent<SVGCircleElement>) => void;
}) {
  const end = toSvgPoint(target, viewport);
  const arrowHead = createArrowHeadPoints(origin, end);
  const labelX = end[0] + (target[0] >= 0 ? 16 : -16);
  const labelY = end[1] - 16;

  return (
    <g
      className={`target-vector ${snapKind ? 'is-snapped' : ''}`}
      clipPath="url(#vector-plane-plot-clip)"
    >
      <title>{`ターゲット x は第1成分 ${target[0]}、第2成分 ${target[1]} の列ベクトル`}</title>
      <line x1={origin[0]} y1={origin[1]} x2={end[0]} y2={end[1]} />
      {arrowHead ? (
        <polygon points={pointsToSvg(arrowHead)} />
      ) : (
        <circle className="target-zero" cx={origin[0]} cy={origin[1]} r="9" />
      )}
      <circle className="target-tip" cx={end[0]} cy={end[1]} r="5" />
      <circle
        className="target-drag-handle"
        cx={end[0]}
        cy={end[1]}
        r="20"
        aria-hidden="true"
        focusable="false"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onLostPointerCapture={onPointerEnd}
      />
      <text
        className="target-label"
        x={labelX}
        y={labelY}
        textAnchor={target[0] >= 0 ? 'start' : 'end'}
      >
        x
      </text>
    </g>
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
