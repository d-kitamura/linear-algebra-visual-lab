import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import type { VectorValue } from '../domain';
import {
  lineSnapDistanceForViewWidth,
  snapLineCoordinateToOrigin,
} from '../state';
import { formatVectorSpokenName, splitVectorName } from '../ui';
import {
  createAdaptiveTicks,
  createArrowHeadPoints,
  formatTickValue,
  pointsToSvg,
} from './planeGeometry';
import {
  DEFAULT_LINE_VIEWPORT,
  createAutoFitLineViewport,
  fromLineSvgX,
  lineCoordinateFromSvgX,
  panLineViewportBySvgDelta,
  toLineSvgX,
  translateLineViewport,
  zoomLineViewportAt,
  zoomLineViewportAtCenter,
  type LineViewport,
} from './lineGeometry';

export interface VectorLine1DProps {
  readonly vectors: readonly VectorValue[];
  readonly colors: readonly string[];
  readonly viewport?: LineViewport;
  readonly onViewportChange?: (viewport: LineViewport) => void;
  readonly onVectorDragStart?: (vectorId: string) => void;
  readonly onVectorChange?: (vectorId: string, coordinates: readonly [number]) => void;
  readonly onVectorDragEnd?: (vectorId: string) => void;
  readonly spanDimension?: 0 | 1;
  readonly showSpan?: boolean;
  readonly spanLabel?: string;
  readonly spanVectorIds?: readonly string[];
  readonly linearCombinationVisible?: boolean;
  readonly target?: number | null;
  readonly onTargetPlacement?: (coordinate: number) => void;
  readonly onTargetDragStart?: () => void;
  readonly onTargetChange?: (coordinate: number) => void;
  readonly onTargetDragEnd?: () => void;
  readonly idPrefix?: string;
  readonly axisLabel?: string;
}

interface SvgPointerPoint {
  readonly x: number;
  readonly y: number;
}

const WHEEL_ZOOM_SENSITIVITY = 0.0015;
const MAX_WHEEL_DELTA = 500;
const TARGET_TAP_MOVEMENT_THRESHOLD = 8;

/**
 * 3つのLabで共用する1D数直線。状態は呼出側に置き、ここでは表示と直接操作だけを担う。
 */
export function VectorLine1D({
  vectors,
  colors,
  viewport = DEFAULT_LINE_VIEWPORT,
  onViewportChange,
  onVectorDragStart,
  onVectorChange,
  onVectorDragEnd,
  spanDimension = 0,
  showSpan = false,
  spanLabel = '生成する空間',
  spanVectorIds = [],
  linearCombinationVisible = false,
  target = null,
  onTargetPlacement,
  onTargetDragStart,
  onTargetChange,
  onTargetDragEnd,
  idPrefix = 'vector-line',
  axisLabel = 'x',
}: VectorLine1DProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const viewportRef = useRef(viewport);
  const onViewportChangeRef = useRef(onViewportChange);
  const pointersRef = useRef(new Map<number, SvgPointerPoint>());
  const pointerStartsRef = useRef(new Map<number, SvgPointerPoint>());
  const movedPointersRef = useRef(new Set<number>());
  const vectorDragRef = useRef<{ pointerId: number; vectorId: string } | null>(null);
  const targetDragRef = useRef<{ pointerId: number } | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [draggingVectorId, setDraggingVectorId] = useState<string | null>(null);
  const [vectorSnappedToOrigin, setVectorSnappedToOrigin] = useState(false);
  const [targetSnappedToOrigin, setTargetSnappedToOrigin] = useState(false);

  viewportRef.current = viewport;
  onViewportChangeRef.current = onViewportChange;

  const plotLeft = viewport.padding;
  const plotRight = viewport.width - viewport.padding;
  const plotTop = viewport.padding;
  const plotBottom = viewport.height - viewport.padding;
  const axisY = viewport.height / 2;
  const originX = toLineSvgX(0, viewport);
  const originVisible = viewport.min <= 0 && viewport.max >= 0;
  const tickScale = createAdaptiveTicks(viewport.min, viewport.max);
  const clipId = `${idPrefix}-plot-clip`;
  const selectedIds = new Set(spanVectorIds);
  const spanShape = spanDimension === 0 ? '原点' : '1次元数直線全体';
  const spanGeometryLabel = `${spanLabel}：${spanShape}`;
  const spanLabelWidth = Math.min(
    plotRight - plotLeft - 24,
    Math.max(152, Array.from(spanGeometryLabel).length * 14 + 28),
  );
  const vectorDescription = vectors.length === 0
    ? '表示中の数ベクトルはありません。'
    : vectors.map((vector) => (
        `${formatVectorSpokenName(vector.name)}の成分は${vector.coordinates[0]}です。`
      )).join('');
  const targetDescription = linearCombinationVisible
    ? target === null
      ? '一次結合モードです。ターゲットvはまだ配置されていません。'
      : `ターゲットvの成分は${target}です。`
    : '一次結合モードはオフです。';
  const fitValues = [
    ...vectors.map((vector) => vector.coordinates[0] ?? 0),
    ...(target === null ? [] : [target]),
  ];

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
      const point = clientPointToSvg(svgRef.current, event.clientX, event.clientY, currentViewport);
      const anchor = fromLineSvgX(point.x, currentViewport);
      const boundedDelta = Math.max(-MAX_WHEEL_DELTA, Math.min(MAX_WHEEL_DELTA, event.deltaY));
      emitViewport(zoomLineViewportAt(
        currentViewport,
        anchor,
        Math.exp(boundedDelta * WHEEL_ZOOM_SENSITIVITY),
      ));
    }

    svg.addEventListener('wheel', handleWheel, { passive: false });
    return () => svg.removeEventListener('wheel', handleWheel);
  }, []);

  function emitViewport(nextViewport: LineViewport): void {
    viewportRef.current = nextViewport;
    onViewportChangeRef.current?.(nextViewport);
  }

  function snapCoordinate(coordinate: number) {
    return snapLineCoordinateToOrigin(
      coordinate,
      lineSnapDistanceForViewWidth(viewportRef.current.max - viewportRef.current.min),
    );
  }

  function handleBackgroundPointerDown(event: ReactPointerEvent<SVGRectElement>): void {
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
    );
    pointersRef.current.set(event.pointerId, point);
    pointerStartsRef.current.set(event.pointerId, point);
    if (pointersRef.current.size > 1) {
      pointersRef.current.forEach((_, pointerId) => movedPointersRef.current.add(pointerId));
    }
    setIsPanning(!linearCombinationVisible);
  }

  function handleBackgroundPointerMove(event: ReactPointerEvent<SVGRectElement>): void {
    if (!pointersRef.current.has(event.pointerId)) {
      return;
    }

    event.preventDefault();
    const previous = new Map(pointersRef.current);
    const current = clientPointToSvg(
      event.currentTarget.ownerSVGElement,
      event.clientX,
      event.clientY,
      viewportRef.current,
    );
    pointersRef.current.set(event.pointerId, current);
    const start = pointerStartsRef.current.get(event.pointerId);
    if (start && pointDistance(start, current) > TARGET_TAP_MOVEMENT_THRESHOLD) {
      movedPointersRef.current.add(event.pointerId);
    }

    if (pointersRef.current.size === 1) {
      if (linearCombinationVisible && !movedPointersRef.current.has(event.pointerId)) {
        return;
      }
      const previousPoint = previous.get(event.pointerId);
      if (previousPoint) {
        setIsPanning(true);
        emitViewport(panLineViewportBySvgDelta(
          viewportRef.current,
          current.x - previousPoint.x,
        ));
      }
      return;
    }

    const pointerIds = [...pointersRef.current.keys()].slice(0, 2);
    pointerIds.forEach((pointerId) => movedPointersRef.current.add(pointerId));
    setIsPanning(true);
    const previousFirst = previous.get(pointerIds[0]);
    const previousSecond = previous.get(pointerIds[1]);
    const currentFirst = pointersRef.current.get(pointerIds[0]);
    const currentSecond = pointersRef.current.get(pointerIds[1]);
    if (!previousFirst || !previousSecond || !currentFirst || !currentSecond) {
      return;
    }

    const previousDistance = pointDistance(previousFirst, previousSecond);
    const currentDistance = pointDistance(currentFirst, currentSecond);
    if (previousDistance === 0 || currentDistance === 0) {
      return;
    }

    const previousMidpoint = midpoint(previousFirst, previousSecond);
    const currentMidpoint = midpoint(currentFirst, currentSecond);
    const anchor = fromLineSvgX(previousMidpoint.x, viewportRef.current);
    const zoomed = zoomLineViewportAt(
      viewportRef.current,
      anchor,
      previousDistance / currentDistance,
    );
    const currentMidpointCoordinate = fromLineSvgX(currentMidpoint.x, zoomed);
    emitViewport(translateLineViewport(zoomed, anchor - currentMidpointCoordinate));
  }

  function handleBackgroundPointerEnd(event: ReactPointerEvent<SVGRectElement>): void {
    const point = pointersRef.current.get(event.pointerId);
    const shouldPlaceTarget = (
      event.type === 'pointerup'
      && linearCombinationVisible
      && Boolean(onTargetPlacement)
      && pointersRef.current.size === 1
      && !movedPointersRef.current.has(event.pointerId)
    );

    pointersRef.current.delete(event.pointerId);
    pointerStartsRef.current.delete(event.pointerId);
    movedPointersRef.current.delete(event.pointerId);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setIsPanning(pointersRef.current.size > 0);

    if (shouldPlaceTarget && point) {
      onTargetPlacement?.(snapCoordinate(
        lineCoordinateFromSvgX(clampToPlot(point.x, viewportRef.current), viewportRef.current),
      ).coordinate);
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
      || pointersRef.current.size > 0
      || (event.pointerType === 'mouse' && event.button !== 0)
    ) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    vectorDragRef.current = { pointerId: event.pointerId, vectorId };
    setDraggingVectorId(vectorId);
    setVectorSnappedToOrigin(false);
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
    const point = clientPointToSvg(
      event.currentTarget.ownerSVGElement,
      event.clientX,
      event.clientY,
      viewportRef.current,
    );
    const result = snapCoordinate(lineCoordinateFromSvgX(
      clampToPlot(point.x, viewportRef.current),
      viewportRef.current,
    ));
    setVectorSnappedToOrigin(result.snappedToOrigin);
    onVectorChange(vectorId, [result.coordinate]);
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
    setVectorSnappedToOrigin(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    onVectorDragEnd?.(vectorId);
  }

  function handleTargetPointerDown(event: ReactPointerEvent<SVGCircleElement>): void {
    if (
      !onTargetChange
      || vectorDragRef.current
      || targetDragRef.current
      || pointersRef.current.size > 0
      || (event.pointerType === 'mouse' && event.button !== 0)
    ) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    targetDragRef.current = { pointerId: event.pointerId };
    setTargetSnappedToOrigin(false);
    onTargetDragStart?.();
  }

  function handleTargetPointerMove(event: ReactPointerEvent<SVGCircleElement>): void {
    if (targetDragRef.current?.pointerId !== event.pointerId || !onTargetChange) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    const point = clientPointToSvg(
      event.currentTarget.ownerSVGElement,
      event.clientX,
      event.clientY,
      viewportRef.current,
    );
    const result = snapCoordinate(lineCoordinateFromSvgX(
      clampToPlot(point.x, viewportRef.current),
      viewportRef.current,
    ));
    setTargetSnappedToOrigin(result.snappedToOrigin);
    onTargetChange(result.coordinate);
  }

  function handleTargetPointerEnd(event: ReactPointerEvent<SVGCircleElement>): void {
    if (targetDragRef.current?.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    targetDragRef.current = null;
    setTargetSnappedToOrigin(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    onTargetDragEnd?.();
  }

  return (
    <div className="one-dimensional-figure">
      <div className="one-dimensional-controls" role="toolbar" aria-label="1次元数直線の表示範囲">
        <button
          type="button"
          aria-label="1次元数直線を縮小表示"
          disabled={!onViewportChange}
          onClick={() => emitViewport(zoomLineViewportAtCenter(viewportRef.current, 1.25))}
        >
          −
        </button>
        <button
          type="button"
          aria-label="1次元数直線を拡大表示"
          disabled={!onViewportChange}
          onClick={() => emitViewport(zoomLineViewportAtCenter(viewportRef.current, 0.8))}
        >
          ＋
        </button>
        <button
          type="button"
          disabled={!onViewportChange}
          onClick={() => emitViewport(createAutoFitLineViewport(fitValues))}
        >
          全体を表示
        </button>
      </div>
      <svg
        ref={svgRef}
        className="vector-line"
        viewBox={`0 0 ${viewport.width} ${viewport.height}`}
        role="img"
        aria-labelledby={`${idPrefix}-title ${idPrefix}-description`}
      >
        <title id={`${idPrefix}-title`}>1次元数ベクトルの数直線表示</title>
        <desc id={`${idPrefix}-description`}>
          {`${vectorDescription}${showSpan ? `${spanLabel}は${spanShape}です。` : ''}${targetDescription}矢先以外のドラッグで表示位置、ホイールまたはピンチで表示範囲を変更できます。`}
        </desc>
        <defs>
          <clipPath id={clipId}>
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
          className={`line-plot-background line-interaction-surface ${linearCombinationVisible ? 'is-target-mode' : ''} ${isPanning ? 'is-panning' : ''}`}
          x={plotLeft}
          y={plotTop}
          width={plotRight - plotLeft}
          height={plotBottom - plotTop}
          rx="8"
          aria-hidden="true"
          onPointerDown={handleBackgroundPointerDown}
          onPointerMove={handleBackgroundPointerMove}
          onPointerUp={handleBackgroundPointerEnd}
          onPointerCancel={handleBackgroundPointerEnd}
        />

        {showSpan ? (
          <g className={`line-span line-span-${spanDimension}`} clipPath={`url(#${clipId})`} aria-hidden="true">
            {spanDimension === 1 ? (
              <line x1={plotLeft} y1={axisY} x2={plotRight} y2={axisY} />
            ) : originVisible ? (
              <g className="line-span-origin" transform={`translate(${originX} ${axisY})`}>
                <circle r="15" />
                <path d="M -11 0 H 11 M 0 -11 V 11" />
              </g>
            ) : null}
          </g>
        ) : null}

        <g className="number-line-axis" aria-hidden="true">
          <line x1={plotLeft} y1={axisY} x2={plotRight} y2={axisY} />
          <path d={`M ${plotRight - 10} ${axisY - 5} L ${plotRight} ${axisY} L ${plotRight - 10} ${axisY + 5}`} />
          <text className="axis-symbol" x={plotRight + 18} y={axisY + 5}>{axisLabel}</text>
        </g>

        <g className="number-line-ticks" aria-hidden="true">
          {tickScale.values.map((tick) => {
            const x = toLineSvgX(tick, viewport);
            return (
              <g key={`line-tick-${tick}`}>
                <line x1={x} y1={axisY - 7} x2={x} y2={axisY + 7} />
                <text x={x} y={axisY + 27} textAnchor="middle">
                  {formatTickValue(tick, tickScale.step)}
                </text>
              </g>
            );
          })}
        </g>

        {showSpan ? (
          <g className="span-geometry-label line-span-label" transform={`translate(${plotLeft + 12} ${plotTop + 12})`} aria-hidden="true">
            <rect width={spanLabelWidth} height="32" rx="8" />
            <text x="14" y="21">{spanGeometryLabel}</text>
          </g>
        ) : null}

        <g className={`line-vector-arrows ${showSpan ? 'is-showing-span' : ''}`} clipPath={`url(#${clipId})`}>
          {vectors.map((vector, index) => {
            const coordinate = vector.coordinates[0] ?? 0;
            const endX = toLineSvgX(coordinate, viewport);
            const color = colors[index % Math.max(1, colors.length)] ?? '#d55535';
            const arrowHead = createArrowHeadPoints([originX, axisY], [endX, axisY], 16, 7);
            const name = splitVectorName(vector.name);
            const labelAbove = index % 2 === 0;

            return (
              <g
                key={vector.id}
                className={`line-vector-arrow ${selectedIds.has(vector.id) ? 'is-span-selected' : ''}`}
              >
                <title>{`${formatVectorSpokenName(vector.name)}は成分${coordinate}の1次元数ベクトル`}</title>
                <line x1={originX} y1={axisY} x2={endX} y2={axisY} stroke={color} />
                {arrowHead ? (
                  <polygon points={pointsToSvg(arrowHead)} fill={color} />
                ) : (
                  <circle cx={originX} cy={axisY} r="8" fill={color} />
                )}
                <circle className="vector-tip" cx={endX} cy={axisY} r="4" fill={color} />
                <circle
                  className={`line-vector-drag-handle ${draggingVectorId === vector.id ? 'is-dragging' : ''} ${draggingVectorId === vector.id && vectorSnappedToOrigin ? 'is-snapped' : ''}`}
                  cx={endX}
                  cy={axisY}
                  r="20"
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
                  className="vector-label line-vector-label"
                  x={endX + (coordinate >= 0 ? 13 : -13)}
                  y={axisY + (labelAbove ? -18 : 35)}
                  fill={color}
                  textAnchor={coordinate >= 0 ? 'start' : 'end'}
                >
                  <tspan className="svg-vector-base">{name.base}</tspan>
                  {name.subscript ? (
                    <tspan className="svg-vector-subscript" baselineShift="sub" fontSize="65%">{name.subscript}</tspan>
                  ) : null}
                </text>
              </g>
            );
          })}
        </g>

        {linearCombinationVisible && target !== null ? (
          <LineTargetVector
            coordinate={target}
            viewport={viewport}
            axisY={axisY}
            originX={originX}
            clipId={clipId}
            snappedToOrigin={targetSnappedToOrigin}
            onPointerDown={handleTargetPointerDown}
            onPointerMove={handleTargetPointerMove}
            onPointerEnd={handleTargetPointerEnd}
          />
        ) : null}

        {originVisible ? (
          <circle className="origin-point" cx={originX} cy={axisY} r="4" clipPath={`url(#${clipId})`} aria-hidden="true" />
        ) : null}
      </svg>
      <p className="viewport-help">
        矢先をドラッグすると成分を変更できます。矢先以外のドラッグで移動、ホイールまたはピンチで拡大縮小できます。
      </p>
    </div>
  );
}

function LineTargetVector({
  coordinate,
  viewport,
  axisY,
  originX,
  clipId,
  snappedToOrigin,
  onPointerDown,
  onPointerMove,
  onPointerEnd,
}: {
  readonly coordinate: number;
  readonly viewport: LineViewport;
  readonly axisY: number;
  readonly originX: number;
  readonly clipId: string;
  readonly snappedToOrigin: boolean;
  readonly onPointerDown: (event: ReactPointerEvent<SVGCircleElement>) => void;
  readonly onPointerMove: (event: ReactPointerEvent<SVGCircleElement>) => void;
  readonly onPointerEnd: (event: ReactPointerEvent<SVGCircleElement>) => void;
}) {
  const endX = toLineSvgX(coordinate, viewport);
  const arrowHead = createArrowHeadPoints([originX, axisY], [endX, axisY], 16, 7);

  return (
    <g className={`line-target-vector ${snappedToOrigin ? 'is-snapped' : ''}`} clipPath={`url(#${clipId})`}>
      <title>{`ターゲットvは成分${coordinate}の1次元数ベクトル`}</title>
      <line x1={originX} y1={axisY} x2={endX} y2={axisY} />
      {arrowHead ? <polygon points={pointsToSvg(arrowHead)} /> : <circle className="target-zero" cx={originX} cy={axisY} r="9" />}
      <circle className="target-tip" cx={endX} cy={axisY} r="5" />
      <circle
        className="line-target-drag-handle"
        cx={endX}
        cy={axisY}
        r="21"
        aria-hidden="true"
        focusable="false"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onLostPointerCapture={onPointerEnd}
      />
      <text className="target-label" x={endX + (coordinate >= 0 ? 13 : -13)} y={axisY - 42} textAnchor={coordinate >= 0 ? 'start' : 'end'}>v</text>
    </g>
  );
}

function clientPointToSvg(
  svg: SVGSVGElement | null,
  clientX: number,
  clientY: number,
  viewport: LineViewport,
): SvgPointerPoint {
  if (!svg) {
    return { x: viewport.width / 2, y: viewport.height / 2 };
  }
  const bounds = svg.getBoundingClientRect();
  return {
    x: (clientX - bounds.left) * viewport.width / Math.max(1, bounds.width),
    y: (clientY - bounds.top) * viewport.height / Math.max(1, bounds.height),
  };
}

function clampToPlot(svgX: number, viewport: LineViewport): number {
  return Math.min(viewport.width - viewport.padding, Math.max(viewport.padding, svgX));
}

function pointDistance(first: SvgPointerPoint, second: SvgPointerPoint): number {
  return Math.hypot(second.x - first.x, second.y - first.y);
}

function midpoint(first: SvgPointerPoint, second: SvgPointerPoint): SvgPointerPoint {
  return { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };
}
