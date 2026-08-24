import {
  lazy,
  Suspense,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type RefObject,
} from 'react';
import {
  analyzeLinearCombination,
  analyzeVectorSet,
  type LinearCombinationAnalysis,
  type VectorSetAnalysis,
  type VectorValue,
} from '../domain';
import {
  MAX_ABSOLUTE_COORDINATE,
  MAX_SHARE_VECTORS,
  buildShareUrl,
  createShareQrCodeDataUrl,
  createShareQrCodeFileName,
  createShareTextFileContents,
  createShareTextFileName,
  type SharedCameraState,
  type ShareState,
} from '../sharing';
import {
  addDefaultVector,
  createAppInitialization,
  parallelSnapDistanceForViewWidth,
  parseCoordinateInput,
  selectSpanVectors,
  snapTargetToSelectedSpan,
  snapDraggedVectorToParallel,
  updateSpanSelection,
  removeVector as removeVectorFromState,
  type AppDimension,
  type TargetSnapKind,
} from '../state';
import {
  describeLinearCombinationStatus,
  formatMathNumber,
  formatVectorSpokenName,
  splitVectorName,
} from '../ui';
import {
  VectorPlane2D,
  createAutoFitViewport,
  zoomViewportAtCenter,
  type PlaneViewport,
} from '../visualization';
import { projectInfo } from './projectInfo';
import './App.css';

const VectorSpace3D = lazy(async () => {
  const module = await import('../visualization/VectorSpace3D');
  return { default: module.VectorSpace3D };
});

const vectorColors = [
  '#c84c35',
  '#087f73',
  '#6456a8',
  '#a56a00',
  '#2f6690',
  '#9c3f72',
  '#4f772d',
  '#8a5a44',
];
const coordinateNames = ['第1成分', '第2成分', '第3成分'] as const;
const inspectorTabs = [
  { id: 'edit', label: 'ベクトル編集', shortLabel: '編集' },
  { id: 'span', label: '生成する空間', shortLabel: 'span' },
  { id: 'combination', label: '一次結合', shortLabel: '一次結合' },
  { id: 'all', label: '全ベクトル', shortLabel: '全体' },
] as const;
const dimensionTabs = [
  { dimension: 2, label: '2D座標平面', shortLabel: '2D' },
  { dimension: 3, label: '3D座標空間', shortLabel: '3D' },
] as const;
const threeDimensionalInspectorTabs = [
  { id: 'edit', label: 'ベクトル編集', shortLabel: '編集' },
  { id: 'span', label: '生成する空間', shortLabel: 'span' },
  { id: 'combination', label: '一次結合', shortLabel: '一次結合' },
  { id: 'all', label: '全ベクトル', shortLabel: '全体' },
] as const;

type CoordinateDrafts = Readonly<Record<string, readonly string[]>>;
type TargetCoordinateDrafts = readonly string[];
type ViewMode = 'auto' | 'manual';
type InspectorTabId = typeof inspectorTabs[number]['id'];
type ThreeDimensionalInspectorTabId =
  typeof threeDimensionalInspectorTabs[number]['id'];
type ShareFeedback = {
  readonly kind: 'success' | 'error';
  readonly message: string;
} | null;

interface CoordinateInputIssue {
  readonly inputId: string;
}

interface SpanShapeDescription {
  readonly heading: string;
  readonly explanation: string;
  readonly summary: string;
}

export function App() {
  const [initialization] = useState(() => createAppInitialization(window.location.href));
  const initial2DState = initialization.initialStates[2];
  const initial3DState = initialization.initialStates[3];
  const [activeDimension, setActiveDimension] = useState<AppDimension>(
    initialization.activeDimension,
  );
  const [hasActivatedThreeDimensions, setHasActivatedThreeDimensions] = useState(
    initialization.activeDimension === 3,
  );
  const [state, setState] = useState<ShareState>(initial2DState);
  const [threeDimensionalState, setThreeDimensionalState] = useState<ShareState>(
    initial3DState,
  );
  const [threeDimensionalCameraResetKey, setThreeDimensionalCameraResetKey] =
    useState(0);
  const [coordinateDrafts, setCoordinateDrafts] = useState<CoordinateDrafts>(() =>
    createCoordinateDrafts(initial2DState.vectors),
  );
  const [
    threeDimensionalCoordinateDrafts,
    setThreeDimensionalCoordinateDrafts,
  ] = useState<CoordinateDrafts>(() =>
    createCoordinateDrafts(initial3DState.vectors),
  );
  const [targetCoordinateDrafts, setTargetCoordinateDrafts] = useState<TargetCoordinateDrafts>(
    () => createTargetCoordinateDrafts(initial2DState.linearCombination.target, 2),
  );
  const [
    threeDimensionalTargetCoordinateDrafts,
    setThreeDimensionalTargetCoordinateDrafts,
  ] = useState<TargetCoordinateDrafts>(
    () => createTargetCoordinateDrafts(initial3DState.linearCombination.target, 3),
  );
  const [viewMode, setViewMode] = useState<ViewMode>('auto');
  const [manualViewport, setManualViewport] = useState<PlaneViewport | null>(null);
  const [dragViewport, setDragViewport] = useState<PlaneViewport | null>(null);
  const [parallelSnapTargetId, setParallelSnapTargetId] = useState<string | null>(null);
  const [targetSnapKind, setTargetSnapKind] = useState<TargetSnapKind>(null);
  const [activeInspectorTab, setActiveInspectorTab] = useState<InspectorTabId>(
    initial2DState.linearCombination.visible ? 'combination' : 'edit',
  );
  const [
    activeThreeDimensionalInspectorTab,
    setActiveThreeDimensionalInspectorTab,
  ] = useState<ThreeDimensionalInspectorTabId>(
    initial3DState.linearCombination.visible ? 'combination' : 'edit',
  );
  const [loadErrorMessage, setLoadErrorMessage] = useState(initialization.errorMessage);
  const [exportErrorMessage, setExportErrorMessage] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState('');
  const [shareQrCodeDataUrl, setShareQrCodeDataUrl] = useState('');
  const [shareQrCodeErrorMessage, setShareQrCodeErrorMessage] = useState<string | null>(null);
  const [isShareQrCodeLoading, setIsShareQrCodeLoading] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<ShareFeedback>(null);
  const shareQrCodeRequestIdRef = useRef(0);
  const shareDialogRef = useRef<HTMLDialogElement>(null);
  const shareUrlFieldRef = useRef<HTMLTextAreaElement>(null);
  const addVectorButtonRef = useRef<HTMLButtonElement>(null);
  const threeDimensionalAddVectorButtonRef = useRef<HTMLButtonElement>(null);
  const coordinateInputIssues = useMemo(
    () => collectCoordinateInputIssues(
      state.vectors,
      coordinateDrafts,
      state.linearCombination.visible,
      targetCoordinateDrafts,
    ),
    [
      state.vectors,
      state.linearCombination.visible,
      coordinateDrafts,
      targetCoordinateDrafts,
    ],
  );
  const hasInvalid2DCoordinateDraft = coordinateInputIssues.length > 0;
  const threeDimensionalCoordinateInputIssues = useMemo(
    () => collectCoordinateInputIssues(
      threeDimensionalState.vectors,
      threeDimensionalCoordinateDrafts,
      threeDimensionalState.linearCombination.visible,
      threeDimensionalTargetCoordinateDrafts,
      '3d-',
      '3d-linear-combination-target-coordinate-',
    ),
    [
      threeDimensionalState.vectors,
      threeDimensionalState.linearCombination.visible,
      threeDimensionalCoordinateDrafts,
      threeDimensionalTargetCoordinateDrafts,
    ],
  );
  const hasInvalidCoordinateDraft = activeDimension === 2
    ? hasInvalid2DCoordinateDraft
    : threeDimensionalCoordinateInputIssues.length > 0;
  const activeCoordinateInputIssues = activeDimension === 2
    ? coordinateInputIssues
    : threeDimensionalCoordinateInputIssues;
  const activeShareState = activeDimension === 2 ? state : threeDimensionalState;
  const analysis = useMemo(
    () => analyzeVectorSet({ dimension: state.dim, vectors: state.vectors }),
    [state],
  );
  const threeDimensionalAnalysis = useMemo(
    () => analyzeVectorSet({
      dimension: threeDimensionalState.dim,
      vectors: threeDimensionalState.vectors,
    }),
    [threeDimensionalState.dim, threeDimensionalState.vectors],
  );
  const threeDimensionalSpanVectors = useMemo(
    () => selectSpanVectors(
      threeDimensionalState.vectors,
      threeDimensionalState.spanSelection,
    ),
    [threeDimensionalState.vectors, threeDimensionalState.spanSelection],
  );
  const threeDimensionalSpanAnalysis = useMemo(
    () => analyzeVectorSet({
      dimension: threeDimensionalState.dim,
      vectors: threeDimensionalSpanVectors,
    }),
    [threeDimensionalState.dim, threeDimensionalSpanVectors],
  );
  const threeDimensionalTargetCoordinates = useMemo(
    () => toThreeDimensionalTarget(threeDimensionalState.linearCombination.target),
    [threeDimensionalState.linearCombination.target],
  );
  const threeDimensionalLinearCombinationAnalysis = useMemo(
    () => threeDimensionalTargetCoordinates
      ? analyzeLinearCombination(
          { dimension: threeDimensionalState.dim, vectors: threeDimensionalSpanVectors },
          threeDimensionalTargetCoordinates,
        )
      : null,
    [
      threeDimensionalState.dim,
      threeDimensionalSpanVectors,
      threeDimensionalTargetCoordinates,
    ],
  );
  const spanVectors = useMemo(
    () => selectSpanVectors(state.vectors, state.spanSelection),
    [state.vectors, state.spanSelection],
  );
  const spanAnalysis = useMemo(
    () => analyzeVectorSet({ dimension: state.dim, vectors: spanVectors }),
    [state.dim, spanVectors],
  );
  const targetCoordinates = useMemo(
    () => toTwoDimensionalTarget(state.linearCombination.target),
    [state.linearCombination.target],
  );
  const linearCombinationAnalysis = useMemo(
    () => targetCoordinates
      ? analyzeLinearCombination(
          { dimension: state.dim, vectors: spanVectors },
          targetCoordinates,
        )
      : null,
    [state.dim, spanVectors, targetCoordinates],
  );
  const linearCombinationCoefficients = useMemo(() => {
    if (
      spanVectors.length !== 2
      || !linearCombinationAnalysis?.particularSolution
      || linearCombinationAnalysis.particularSolution.length !== 2
    ) {
      return null;
    }

    return [
      linearCombinationAnalysis.particularSolution[0],
      linearCombinationAnalysis.particularSolution[1],
    ] as const;
  }, [linearCombinationAnalysis, spanVectors.length]);
  const autoViewport = useMemo(
    () => createAutoFitViewport(state.linearCombination.visible && targetCoordinates
      ? [...state.vectors, { coordinates: targetCoordinates }]
      : state.vectors),
    [state.vectors, state.linearCombination.visible, targetCoordinates],
  );
  const selectedViewport = viewMode === 'auto' ? autoViewport : (manualViewport ?? autoViewport);
  const viewport = dragViewport ?? selectedViewport;
  const isIndependent = analysis.isLinearlyIndependent;
  const allVectorRelation = describeAllVectorRelation(
    analysis.vectorCount,
    analysis.isLinearlyIndependent,
  );
  const spanShape = describeSpanShape(spanAnalysis.rank, 2);
  const threeDimensionalSpanShape = describeSpanShape(threeDimensionalSpanAnalysis.rank, 3);
  const threeDimensionalAllVectorRelation = describeAllVectorRelation(
    threeDimensionalAnalysis.vectorCount,
    threeDimensionalAnalysis.isLinearlyIndependent,
  );
  const availableInspectorTabs = state.linearCombination.visible
    ? inspectorTabs
    : inspectorTabs.filter((tab) => tab.id !== 'combination');
  const availableThreeDimensionalInspectorTabs = threeDimensionalState.linearCombination.visible
    ? threeDimensionalInspectorTabs
    : threeDimensionalInspectorTabs.filter((tab) => tab.id !== 'combination');
  const viewportLabel = viewMode === 'auto'
    ? `自動表示 ±${formatViewportNumber((viewport.maxX - viewport.minX) / 2)}`
    : `手動表示・幅 ${formatViewportNumber(viewport.maxX - viewport.minX)}`;

  function handleManualViewportChange(nextViewport: PlaneViewport): void {
    setManualViewport(nextViewport);
    setViewMode('manual');
  }

  function handleButtonZoom(factor: number): void {
    handleManualViewportChange(zoomViewportAtCenter(viewport, factor));
  }

  function handleFitViewport(): void {
    setManualViewport(null);
    setViewMode('auto');
  }

  function handleVectorDragStart(): void {
    setDragViewport(viewport);
    setParallelSnapTargetId(null);
  }

  function handleVectorDrag(
    vectorId: string,
    coordinates: readonly [number, number],
  ): void {
    const candidateCoordinates: readonly [number, number] = [
      clampDraggedCoordinate(coordinates[0]),
      clampDraggedCoordinate(coordinates[1]),
    ];
    const snapResult = snapDraggedVectorToParallel(
      vectorId,
      candidateCoordinates,
      state.vectors,
      parallelSnapDistanceForViewWidth(viewport.maxX - viewport.minX),
    );
    const safeCoordinates = snapResult.coordinates;

    setState((current) => ({
      ...current,
      vectors: current.vectors.map((vector) =>
        vector.id === vectorId
          ? { ...vector, coordinates: safeCoordinates }
          : vector,
      ),
    }));
    setCoordinateDrafts((current) => ({
      ...current,
      [vectorId]: safeCoordinates.map(String),
    }));
    setParallelSnapTargetId(snapResult.targetVectorId);
  }

  function handleVectorDragEnd(): void {
    setDragViewport(null);
    setParallelSnapTargetId(null);
  }

  function handleLinearCombinationVisibility(): void {
    const nextVisible = !state.linearCombination.visible;
    setState((current) => ({
      ...current,
      linearCombination: {
        ...current.linearCombination,
        visible: nextVisible,
      },
    }));
    setTargetSnapKind(null);
    setActiveInspectorTab((current) => (
      nextVisible ? 'combination' : current === 'combination' ? 'span' : current
    ));
    if (!nextVisible) {
      setTargetCoordinateDrafts(createTargetCoordinateDrafts(state.linearCombination.target, 2));
    }
  }

  function updateTargetFromPointer(coordinates: readonly [number, number]): void {
    const candidate: readonly [number, number] = [
      clampDraggedCoordinate(coordinates[0]),
      clampDraggedCoordinate(coordinates[1]),
    ];
    const snapResult = snapTargetToSelectedSpan(
      candidate,
      spanVectors,
      spanAnalysis.rank,
      parallelSnapDistanceForViewWidth(viewport.maxX - viewport.minX),
    );

    setState((current) => ({
      ...current,
      linearCombination: {
        ...current.linearCombination,
        target: snapResult.coordinates,
      },
    }));
    setTargetCoordinateDrafts(coordinatesToTargetDrafts(snapResult.coordinates));
    setTargetSnapKind(snapResult.snapKind);
  }

  function handleTargetPlacement(coordinates: readonly [number, number]): void {
    updateTargetFromPointer(coordinates);
    setTargetSnapKind(null);
  }

  function handleTargetDragStart(): void {
    setDragViewport(viewport);
    setTargetSnapKind(null);
  }

  function handleTargetDragEnd(): void {
    setDragViewport(null);
    setTargetSnapKind(null);
  }

  function handleTargetCoordinateChange(coordinateIndex: number, input: string): void {
    const nextDrafts = targetCoordinateDrafts.map((value, index) =>
      index === coordinateIndex ? input : value,
    );
    setTargetCoordinateDrafts(nextDrafts);

    if (nextDrafts.every((draft) => draft.trim().length === 0)) {
      setState((current) => ({
        ...current,
        linearCombination: {
          ...current.linearCombination,
          target: null,
        },
      }));
      setTargetSnapKind(null);
      return;
    }

    const parsed = nextDrafts.map(parseCoordinateInput);
    if (!parsed.every((result) => result.ok)) {
      return;
    }

    const coordinates: readonly [number, number] = [
      parsed[0].ok ? parsed[0].value : 0,
      parsed[1].ok ? parsed[1].value : 0,
    ];
    setState((current) => ({
      ...current,
      linearCombination: {
        ...current.linearCombination,
        target: coordinates,
      },
    }));
    setTargetSnapKind(null);
  }

  function handleClearTarget(): void {
    setState((current) => ({
      ...current,
      linearCombination: {
        ...current.linearCombination,
        target: null,
      },
    }));
    setTargetCoordinateDrafts(['', '']);
    setTargetSnapKind(null);
    setDragViewport(null);
  }

  function handleSpanSelection(vectorId: string, selected: boolean): void {
    setState((current) => ({
      ...current,
      spanSelection: updateSpanSelection(
        current.vectors,
        current.spanSelection,
        vectorId,
        selected,
      ),
    }));
  }

  function handleShowSpan(showSpan: boolean): void {
    setState((current) => ({
      ...current,
      visualization: { ...current.visualization, showSpan },
    }));
  }

  function handleAddVector(): void {
    const result = addDefaultVector(state);
    if (!result.addedVector) {
      return;
    }
    const addedVector = result.addedVector;

    setState(result.state);
    setCoordinateDrafts((current) => ({
      ...current,
      [addedVector.id]: addedVector.coordinates.map(String),
    }));
    setParallelSnapTargetId(null);
    window.requestAnimationFrame(() => {
      document.getElementById(`${addedVector.id}-coordinate-0`)?.focus();
    });
  }

  function handleRemoveVector(vectorId: string): void {
    setState((current) => removeVectorFromState(current, vectorId));
    setCoordinateDrafts((current) => Object.fromEntries(
      Object.entries(current).filter(([id]) => id !== vectorId),
    ));
    setDragViewport(null);
    setParallelSnapTargetId(null);
    window.requestAnimationFrame(() => addVectorButtonRef.current?.focus());
  }

  function handleThreeDimensionalSpanSelection(vectorId: string, selected: boolean): void {
    setThreeDimensionalState((current) => ({
      ...current,
      spanSelection: updateSpanSelection(
        current.vectors,
        current.spanSelection,
        vectorId,
        selected,
      ),
    }));
  }

  function handleThreeDimensionalLinearCombinationVisibility(): void {
    const nextVisible = !threeDimensionalState.linearCombination.visible;
    setThreeDimensionalState((current) => ({
      ...current,
      linearCombination: {
        ...current.linearCombination,
        visible: nextVisible,
      },
    }));
    setActiveThreeDimensionalInspectorTab((current) => (
      nextVisible ? 'combination' : current === 'combination' ? 'span' : current
    ));
    if (!nextVisible) {
      setThreeDimensionalTargetCoordinateDrafts(createTargetCoordinateDrafts(
        threeDimensionalState.linearCombination.target,
        3,
      ));
    }
  }

  function handleThreeDimensionalTargetCoordinateChange(
    coordinateIndex: number,
    input: string,
  ): void {
    const nextDrafts = threeDimensionalTargetCoordinateDrafts.map((value, index) =>
      index === coordinateIndex ? input : value,
    );
    setThreeDimensionalTargetCoordinateDrafts(nextDrafts);

    if (nextDrafts.every((draft) => draft.trim().length === 0)) {
      setThreeDimensionalState((current) => ({
        ...current,
        linearCombination: { ...current.linearCombination, target: null },
      }));
      return;
    }

    const parsed = nextDrafts.map(parseCoordinateInput);
    if (!parsed.every((result) => result.ok)) {
      return;
    }

    const coordinates: readonly [number, number, number] = [
      parsed[0].ok ? parsed[0].value : 0,
      parsed[1].ok ? parsed[1].value : 0,
      parsed[2].ok ? parsed[2].value : 0,
    ];
    setThreeDimensionalState((current) => ({
      ...current,
      linearCombination: { ...current.linearCombination, target: coordinates },
    }));
  }

  function handleThreeDimensionalClearTarget(): void {
    setThreeDimensionalState((current) => ({
      ...current,
      linearCombination: { ...current.linearCombination, target: null },
    }));
    setThreeDimensionalTargetCoordinateDrafts(['', '', '']);
  }

  function handleThreeDimensionalTargetPlacement(
    coordinates: readonly [number, number, number],
  ): void {
    setThreeDimensionalState((current) => ({
      ...current,
      linearCombination: { ...current.linearCombination, target: coordinates },
    }));
    setThreeDimensionalTargetCoordinateDrafts(coordinates.map(String));
  }

  function handleThreeDimensionalShowSpan(showSpan: boolean): void {
    setThreeDimensionalState((current) => ({
      ...current,
      visualization: { ...current.visualization, showSpan },
    }));
  }

  function handleThreeDimensionalAddVector(): void {
    const result = addDefaultVector(threeDimensionalState);
    if (!result.addedVector) {
      return;
    }
    const addedVector = result.addedVector;

    setThreeDimensionalState(result.state);
    setThreeDimensionalCoordinateDrafts((current) => ({
      ...current,
      [addedVector.id]: addedVector.coordinates.map(String),
    }));
    window.requestAnimationFrame(() => {
      document.getElementById(`3d-${addedVector.id}-coordinate-0`)?.focus();
    });
  }

  function handleThreeDimensionalRemoveVector(vectorId: string): void {
    const nextState = removeVectorFromState(threeDimensionalState, vectorId);
    setThreeDimensionalState(nextState);
    setThreeDimensionalCoordinateDrafts((current) => Object.fromEntries(
      Object.entries(current).filter(([id]) => id !== vectorId),
    ));
    window.requestAnimationFrame(() => threeDimensionalAddVectorButtonRef.current?.focus());
  }

  function handleThreeDimensionalCameraChange(camera: SharedCameraState): void {
    setThreeDimensionalState((current) => cameraStatesEqual(current.visualization.camera, camera)
      ? current
      : {
          ...current,
          visualization: { ...current.visualization, camera },
        });
  }

  function handleThreeDimensionalDirectCoordinatesCommit(
    vectorId: string,
    coordinates: readonly [number, number, number],
  ): void {
    const normalizedCoordinates = coordinates.map((coordinate) => {
      const clamped = Math.min(
        MAX_ABSOLUTE_COORDINATE,
        Math.max(-MAX_ABSOLUTE_COORDINATE, coordinate),
      );
      return Object.is(clamped, -0) ? 0 : clamped;
    });
    setThreeDimensionalState((current) => ({
      ...current,
      vectors: current.vectors.map((vector) => vector.id === vectorId
        ? {
            ...vector,
            coordinates: normalizedCoordinates,
          }
        : vector),
    }));
    setThreeDimensionalCoordinateDrafts((current) => ({
      ...current,
      [vectorId]: normalizedCoordinates.map(String),
    }));
  }

  function handleReset(): void {
    if (activeDimension === 3) {
      setThreeDimensionalState(initial3DState);
      setThreeDimensionalCoordinateDrafts(createCoordinateDrafts(initial3DState.vectors));
      setThreeDimensionalTargetCoordinateDrafts(createTargetCoordinateDrafts(
        initial3DState.linearCombination.target,
        3,
      ));
      setActiveThreeDimensionalInspectorTab(
        initial3DState.linearCombination.visible ? 'combination' : 'edit',
      );
      setThreeDimensionalCameraResetKey((current) => current + 1);
      setExportErrorMessage(null);
      setShareUrl('');
      shareQrCodeRequestIdRef.current += 1;
      setShareQrCodeDataUrl('');
      setShareQrCodeErrorMessage(null);
      setIsShareQrCodeLoading(false);
      setShareFeedback(null);
      shareDialogRef.current?.close();
      return;
    }

    setState(initial2DState);
    setCoordinateDrafts(createCoordinateDrafts(initial2DState.vectors));
    setTargetCoordinateDrafts(createTargetCoordinateDrafts(
      initial2DState.linearCombination.target,
      2,
    ));
    setViewMode('auto');
    setManualViewport(null);
    setDragViewport(null);
    setParallelSnapTargetId(null);
    setTargetSnapKind(null);
    setActiveInspectorTab(initial2DState.linearCombination.visible ? 'combination' : 'edit');
    setExportErrorMessage(null);
    setShareUrl('');
    shareQrCodeRequestIdRef.current += 1;
    setShareQrCodeDataUrl('');
    setShareQrCodeErrorMessage(null);
    setIsShareQrCodeLoading(false);
    setShareFeedback(null);
    shareDialogRef.current?.close();
  }

  function handleOpenShareDialog(): void {
    if (hasInvalidCoordinateDraft) {
      return;
    }

    try {
      const nextShareUrl = buildShareUrl(window.location.href, activeShareState);
      const qrCodeRequestId = shareQrCodeRequestIdRef.current + 1;
      shareQrCodeRequestIdRef.current = qrCodeRequestId;
      setShareUrl(nextShareUrl);
      setShareQrCodeDataUrl('');
      setShareQrCodeErrorMessage(null);
      setIsShareQrCodeLoading(true);
      setShareFeedback(null);
      setExportErrorMessage(null);
      shareDialogRef.current?.showModal();
      void createShareQrCodeDataUrl(nextShareUrl)
        .then((dataUrl) => {
          if (shareQrCodeRequestIdRef.current !== qrCodeRequestId) {
            return;
          }
          setShareQrCodeDataUrl(dataUrl);
          setIsShareQrCodeLoading(false);
        })
        .catch((error: unknown) => {
          if (shareQrCodeRequestIdRef.current !== qrCodeRequestId) {
            return;
          }
          setShareQrCodeErrorMessage(
            error instanceof Error
              ? error.message
              : '共有URLからQRコードを生成できませんでした。',
          );
          setIsShareQrCodeLoading(false);
        });
      window.requestAnimationFrame(() => {
        shareUrlFieldRef.current?.focus();
        shareUrlFieldRef.current?.select();
      });
    } catch {
      setExportErrorMessage('共有URLを生成できませんでした。入力内容を確認して、もう一度お試しください。');
    }
  }

  function handleFocusFirstCoordinateIssue(): void {
    const firstIssue = activeCoordinateInputIssues[0];
    if (!firstIssue) {
      return;
    }

    if (activeDimension === 3) {
      setActiveThreeDimensionalInspectorTab(
        firstIssue.inputId.startsWith('3d-linear-combination-target-')
          ? 'combination'
          : 'edit',
      );
    } else {
      setActiveInspectorTab(
        firstIssue.inputId.startsWith('linear-combination-target-')
          ? 'combination'
          : 'edit',
      );
    }
    window.requestAnimationFrame(() => {
      const input = document.getElementById(firstIssue.inputId);
      if (input instanceof HTMLInputElement) {
        input.focus();
        input.select();
      }
    });
  }

  async function handleCopyShareUrl(): Promise<void> {
    try {
      if (!navigator.clipboard) {
        throw new Error('Clipboard API is unavailable.');
      }
      await navigator.clipboard.writeText(shareUrl);
      setShareFeedback({ kind: 'success', message: 'クリップボードにコピーしました。' });
    } catch {
      shareUrlFieldRef.current?.focus();
      shareUrlFieldRef.current?.select();
      setShareFeedback({
        kind: 'error',
        message: '自動でコピーできませんでした。選択されたURLを手動でコピーしてください。',
      });
    }
  }

  function handleDownloadShareUrl(): void {
    const blob = new Blob([createShareTextFileContents(shareUrl)], {
      type: 'text/plain;charset=utf-8',
    });
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = createShareTextFileName();
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(blobUrl), 0);
    setShareFeedback({
      kind: 'success',
      message: 'URLを記載したテキストファイルのダウンロードを開始しました。',
    });
  }

  function handleDownloadShareQrCode(): void {
    if (!shareQrCodeDataUrl) {
      setShareFeedback({
        kind: 'error',
        message: 'QRコードを保存できませんでした。URLのコピーまたはテキスト保存をご利用ください。',
      });
      return;
    }

    const link = document.createElement('a');
    link.href = shareQrCodeDataUrl;
    link.download = createShareQrCodeFileName();
    document.body.append(link);
    link.click();
    link.remove();
    setShareFeedback({
      kind: 'success',
      message: 'QRコードのPNG画像のダウンロードを開始しました。',
    });
  }

  function handleCloseShareDialog(): void {
    shareDialogRef.current?.close();
  }

  function handleShareDialogClick(event: ReactMouseEvent<HTMLDialogElement>): void {
    if (event.target === event.currentTarget) {
      handleCloseShareDialog();
    }
  }

  function handleInspectorTabKeyDown(
    event: ReactKeyboardEvent<HTMLButtonElement>,
  ): void {
    const currentIndex = availableInspectorTabs.findIndex((tab) => tab.id === activeInspectorTab);
    let nextIndex = currentIndex;

    if (event.key === 'ArrowRight') {
      nextIndex = (currentIndex + 1) % availableInspectorTabs.length;
    } else if (event.key === 'ArrowLeft') {
      nextIndex = (currentIndex - 1 + availableInspectorTabs.length) % availableInspectorTabs.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = availableInspectorTabs.length - 1;
    } else {
      return;
    }

    event.preventDefault();
    const nextTab = availableInspectorTabs[nextIndex];
    setActiveInspectorTab(nextTab.id);
    document.getElementById(`inspector-tab-${nextTab.id}`)?.focus();
  }

  function handleThreeDimensionalInspectorTabKeyDown(
    event: ReactKeyboardEvent<HTMLButtonElement>,
  ): void {
    const currentIndex = availableThreeDimensionalInspectorTabs.findIndex(
      (tab) => tab.id === activeThreeDimensionalInspectorTab,
    );
    let nextIndex = currentIndex;

    if (event.key === 'ArrowRight') {
      nextIndex = (currentIndex + 1) % availableThreeDimensionalInspectorTabs.length;
    } else if (event.key === 'ArrowLeft') {
      nextIndex = (
        currentIndex - 1 + availableThreeDimensionalInspectorTabs.length
      ) % availableThreeDimensionalInspectorTabs.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = availableThreeDimensionalInspectorTabs.length - 1;
    } else {
      return;
    }

    event.preventDefault();
    const nextTab = availableThreeDimensionalInspectorTabs[nextIndex];
    setActiveThreeDimensionalInspectorTab(nextTab.id);
    document.getElementById(`3d-inspector-tab-${nextTab.id}`)?.focus();
  }

  function handleDimensionTabKeyDown(
    event: ReactKeyboardEvent<HTMLButtonElement>,
  ): void {
    const currentIndex = dimensionTabs.findIndex(
      (tab) => tab.dimension === activeDimension,
    );
    let nextIndex = currentIndex;

    if (event.key === 'ArrowRight') {
      nextIndex = (currentIndex + 1) % dimensionTabs.length;
    } else if (event.key === 'ArrowLeft') {
      nextIndex = (currentIndex - 1 + dimensionTabs.length) % dimensionTabs.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = dimensionTabs.length - 1;
    } else {
      return;
    }

    event.preventDefault();
    const nextTab = dimensionTabs[nextIndex];
    handleDimensionChange(nextTab.dimension);
    document.getElementById(`dimension-tab-${nextTab.dimension}`)?.focus();
  }

  function handleDimensionChange(dimension: AppDimension): void {
    setActiveDimension(dimension);
    if (dimension === 3) {
      setHasActivatedThreeDimensions(true);
    }
  }

  function handleCoordinateChange(
    vectorId: string,
    coordinateIndex: number,
    input: string,
  ): void {
    setCoordinateDrafts((current) => ({
      ...current,
      [vectorId]: (current[vectorId] ?? []).map((value, index) =>
        index === coordinateIndex ? input : value,
      ),
    }));

    const parsed = parseCoordinateInput(input);
    if (!parsed.ok) {
      return;
    }

    setState((current) => ({
      ...current,
      vectors: current.vectors.map((vector) => {
        if (vector.id !== vectorId) {
          return vector;
        }

        return {
          ...vector,
          coordinates: vector.coordinates.map((coordinate, index) =>
            index === coordinateIndex ? parsed.value : coordinate,
          ),
        };
      }),
    }));
  }

  function handleThreeDimensionalCoordinateChange(
    vectorId: string,
    coordinateIndex: number,
    input: string,
  ): void {
    setThreeDimensionalCoordinateDrafts((current) => ({
      ...current,
      [vectorId]: (current[vectorId] ?? []).map((value, index) =>
        index === coordinateIndex ? input : value,
      ),
    }));

    const parsed = parseCoordinateInput(input);
    if (!parsed.ok) {
      return;
    }

    setThreeDimensionalState((current) => ({
      ...current,
      vectors: current.vectors.map((vector) => vector.id === vectorId
        ? {
            ...vector,
            coordinates: vector.coordinates.map((coordinate, index) =>
              index === coordinateIndex ? parsed.value : coordinate,
            ),
          }
        : vector),
    }));
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href={`#dimension-panel-${activeDimension}`}>
        教材の操作領域へ移動
      </a>
      <header className="site-header">
        <a
          className="brand"
          href={import.meta.env.BASE_URL}
          aria-label="Linear Algebra Visual Lab ホーム"
        >
          <span className="brand-mark" aria-hidden="true">
            LA
          </span>
          <span>{projectInfo.name}</span>
        </a>
        <span className="phase-badge">{projectInfo.phase}</span>
      </header>

      <main className="lab-page">
        <nav className="dimension-switcher" aria-label="教材の次元">
          <div className="dimension-tablist" role="tablist" aria-label="2Dと3Dの切替">
            {dimensionTabs.map((tab) => (
              <button
                key={tab.dimension}
                id={`dimension-tab-${tab.dimension}`}
                type="button"
                role="tab"
                aria-selected={activeDimension === tab.dimension}
                aria-controls={`dimension-panel-${tab.dimension}`}
                tabIndex={activeDimension === tab.dimension ? 0 : -1}
                onClick={() => handleDimensionChange(tab.dimension)}
                onKeyDown={handleDimensionTabKeyDown}
              >
                <span className="dimension-tab-label-wide">{tab.label}</span>
                <span className="dimension-tab-label-short">{tab.shortLabel}</span>
              </button>
            ))}
          </div>
          <p aria-live="polite">
            {activeDimension === 2
              ? '2次元の教材状態を表示しています。'
              : '3次元の教材状態を表示しています。'}
          </p>
        </nav>

        <section className="lab-intro" aria-labelledby="page-title">
          <div>
            <p className="eyebrow">ベクトル空間 / {activeDimension}D</p>
            <h1 id="page-title">ベクトルを変えて、生成する空間を見る。</h1>
          </div>
          <div className="lab-intro-side">
            <p className="lab-intro-copy">
              {activeDimension === 2 ? (
                <>
                  列ベクトルの成分を編集すると、座標平面と数学的な判定が連動します。
                  ベクトルを選ぶと、その集合が生成する空間を原点、直線、座標平面として比較できます。
                </>
              ) : (
                <>
                  3次元の教材状態は2次元とは独立して保持されます。
                  正投影の3D座標空間を回転・拡大・移動し、複数の視点からベクトルを観察できます。
                </>
              )}
            </p>
            <div className="lab-actions" aria-label="教材状態の操作">
              <button
                className="share-export-button"
                type="button"
                disabled={hasInvalidCoordinateDraft}
                aria-describedby={hasInvalidCoordinateDraft ? 'share-export-disabled-help' : undefined}
                onClick={handleOpenShareDialog}
              >
                共有URLをエクスポート
              </button>
              <button className="reset-button" type="button" onClick={handleReset}>
                Reset
              </button>
            </div>
            {hasInvalidCoordinateDraft ? (
              <div
                className="lab-action-help"
              >
                <p
                  id="share-export-disabled-help"
                  role="status"
                  aria-live="polite"
                >
                  未確定の成分が{activeCoordinateInputIssues.length}か所あります。
                  訂正するまで、表示と判定には各欄の直前の有効値を使い、エクスポートを停止します。
                </p>
                <button type="button" onClick={handleFocusFirstCoordinateIssue}>
                  入力欄を確認
                </button>
              </div>
            ) : null}
          </div>
        </section>

        {loadErrorMessage ? (
          <div className="page-alert" role="alert" aria-labelledby="load-error-title">
            <div>
              <strong id="load-error-title">共有URLを開けませんでした</strong>
              <p>{loadErrorMessage}</p>
            </div>
            <button
              type="button"
              aria-label="共有URLの読込エラーを閉じる"
              onClick={() => setLoadErrorMessage(null)}
            >
              閉じる
            </button>
          </div>
        ) : null}

        {exportErrorMessage ? (
          <div className="page-alert" role="alert" aria-labelledby="export-error-title">
            <div>
              <strong id="export-error-title">共有URLを生成できませんでした</strong>
              <p>{exportErrorMessage}</p>
            </div>
            <button
              type="button"
              aria-label="共有URLの生成エラーを閉じる"
              onClick={() => setExportErrorMessage(null)}
            >
              閉じる
            </button>
          </div>
        ) : null}

        <div
          className="lab-workspace"
          id="dimension-panel-2"
          role="tabpanel"
          aria-labelledby="dimension-tab-2"
          hidden={activeDimension !== 2}
          tabIndex={-1}
        >
          <section className="plot-card" aria-labelledby="plot-title">
            <div className="card-heading">
              <div>
                <p className="panel-kicker">Coordinate plane</p>
                <h2 id="plot-title">2次元座標平面</h2>
              </div>
              <div className="viewport-toolbar">
                <button
                  className="target-mode-button"
                  type="button"
                  aria-pressed={state.linearCombination.visible}
                  onClick={handleLinearCombinationVisibility}
                >
                  {state.linearCombination.visible
                    ? '一次結合モードを終了'
                    : '一次結合を調べる'}
                </button>
                <span className={`example-badge ${viewMode === 'manual' ? 'is-manual' : ''}`}>
                  {viewportLabel}
                </span>
                <div className="viewport-controls" role="group" aria-label="座標面の表示範囲">
                  <button
                    type="button"
                    aria-label="縮小して広い範囲を表示"
                    title="縮小"
                    onClick={() => handleButtonZoom(1.25)}
                  >
                    −
                  </button>
                  <button
                    type="button"
                    aria-label="拡大して狭い範囲を表示"
                    title="拡大"
                    onClick={() => handleButtonZoom(0.8)}
                  >
                    ＋
                  </button>
                  <button
                    className="fit-viewport-button"
                    type="button"
                    disabled={viewMode === 'auto'}
                    onClick={handleFitViewport}
                  >
                    全体を表示
                  </button>
                </div>
              </div>
            </div>
            {state.linearCombination.visible ? (
              <TargetEditor
                drafts={targetCoordinateDrafts}
                target={targetCoordinates}
                onCoordinateChange={handleTargetCoordinateChange}
                onClear={handleClearTarget}
              />
            ) : null}
            <VectorPlane2D
              vectors={state.vectors}
              colors={vectorColors}
              viewport={viewport}
              onViewportChange={handleManualViewportChange}
              onVectorDragStart={handleVectorDragStart}
              onVectorChange={handleVectorDrag}
              onVectorDragEnd={handleVectorDragEnd}
              parallelSnapTargetId={parallelSnapTargetId}
              spanVectors={spanVectors}
              spanDimension={spanAnalysis.rank}
              showSpan={state.visualization.showSpan}
              linearCombinationVisible={state.linearCombination.visible}
              target={targetCoordinates}
              linearCombinationCoefficients={linearCombinationCoefficients}
              targetSnapKind={targetSnapKind}
              onTargetPlacement={handleTargetPlacement}
              onTargetDragStart={handleTargetDragStart}
              onTargetChange={updateTargetFromPointer}
              onTargetDragEnd={handleTargetDragEnd}
            />
            <p className="viewport-help">
              {state.linearCombination.visible
                ? 'クリックまたはタップでターゲット v を配置し、v の先端をドラッグして変更できます。背景をドラッグすると表示範囲を移動できます。'
                : '矢印先端の丸をドラッグするとベクトルを変更できます。座標面の内側では1本指で移動、2本指で拡大・縮小できます。'}
              ページをスクロールするときは座標面の外側をスワイプしてください。
            </p>
          </section>

          <aside className="analysis-column" aria-label="ベクトル集合の編集と解析結果">
            <section className="analysis-summary" aria-labelledby="analysis-summary-title">
              <h2 className="visually-hidden" id="analysis-summary-title">現在の解析要約</h2>
              <button
                className="summary-tile summary-span"
                type="button"
                onClick={() => setActiveInspectorTab('span')}
              >
                <span className="summary-label">選択集合 <span className="math-set-name">S</span></span>
                <strong>{spanShape.summary}</strong>
                <span className="summary-math">
                  <MathOperator name="dim" />(<MathOperator name="span" />(<span className="math-set-name">S</span>))
                  {' = '}{spanAnalysis.spanDimension}
                </span>
              </button>
              <button
                className="summary-tile summary-all"
                type="button"
                onClick={() => setActiveInspectorTab('all')}
              >
                <span className="summary-label">表示中の全ベクトル</span>
                <strong>{isIndependent ? '一次独立' : '一次従属'}</strong>
                <span className="summary-math">
                  <MathOperator name="rank" />(<MathMatrixName />)
                  {' = '}{analysis.rank}
                </span>
              </button>
            </section>

            <div className="inspector-tablist" role="tablist" aria-label="編集・解析の詳細">
              {availableInspectorTabs.map((tab) => (
                <button
                  key={tab.id}
                  id={`inspector-tab-${tab.id}`}
                  type="button"
                  role="tab"
                  aria-selected={activeInspectorTab === tab.id}
                  aria-controls={`inspector-panel-${tab.id}`}
                  tabIndex={activeInspectorTab === tab.id ? 0 : -1}
                  onClick={() => setActiveInspectorTab(tab.id)}
                  onKeyDown={handleInspectorTabKeyDown}
                >
                  <span className="tab-label-wide">{tab.label}</span>
                  <span className="tab-label-short">{tab.shortLabel}</span>
                </button>
              ))}
            </div>

            <section
              className="vector-editor-card inspector-panel"
              id="inspector-panel-edit"
              role="tabpanel"
              aria-labelledby="inspector-tab-edit vector-editor-title"
              hidden={activeInspectorTab !== 'edit'}
            >
              <div className="vector-editor-heading">
                <div>
                  <p className="panel-kicker">Edit vectors</p>
                  <h2 id="vector-editor-title">列ベクトルの成分</h2>
                  <p className="editor-hint">
                    上段が第1成分、下段が第2成分です。追加したベクトルはspanの対象に含まれます。
                  </p>
                </div>
                <div className="vector-collection-controls">
                  <span aria-live="polite">{state.vectors.length} / {MAX_SHARE_VECTORS} 本</span>
                  <button
                    ref={addVectorButtonRef}
                    type="button"
                    disabled={state.vectors.length >= MAX_SHARE_VECTORS}
                    aria-describedby={state.vectors.length >= MAX_SHARE_VECTORS
                      ? 'vector-limit-help'
                      : undefined}
                    onClick={handleAddVector}
                  >
                    ＋ ベクトルを追加
                  </button>
                </div>
              </div>
              {state.vectors.length >= MAX_SHARE_VECTORS ? (
                <p
                  className="vector-limit-help"
                  id="vector-limit-help"
                  role="status"
                  aria-live="polite"
                >
                  共有状態の上限である{MAX_SHARE_VECTORS}本に達しています。
                </p>
              ) : null}
              <div className="vector-editor-list">
                {state.vectors.length === 0 ? (
                  <p className="empty-vector-editor">
                    ベクトルはありません。「ベクトルを追加」から始められます。Resetで読込時の状態へ戻せます。
                  </p>
                ) : null}
                {state.vectors.map((vector, vectorIndex) => {
                  const drafts = coordinateDrafts[vector.id] ?? vector.coordinates.map(String);
                  const results = drafts.map(parseCoordinateInput);
                  const firstError = results.find((result) => !result.ok);
                  const errorCount = results.filter((result) => !result.ok).length;
                  const errorId = `${vector.id}-coordinate-error`;
                  const spokenVectorName = formatVectorSpokenName(vector.name);

                  return (
                    <div className="vector-editor" key={vector.id}>
                      <span
                        className="vector-key"
                        style={{
                          '--vector-color': vectorColors[vectorIndex % vectorColors.length],
                        } as CSSProperties}
                        aria-hidden="true"
                      >
                        {vectorIndex + 1}
                      </span>
                      <MathVectorName name={vector.name} />
                      <span className="math-equals" aria-hidden="true">=</span>
                      <div className="editable-column-vector">
                        {drafts.map((draft, coordinateIndex) => {
                          const result = results[coordinateIndex];
                          const isInvalid = !result.ok;
                          const inputId = `${vector.id}-coordinate-${coordinateIndex}`;
                          const inputErrorId = `${inputId}-error`;

                          return (
                            <label className="coordinate-field" key={inputId} htmlFor={inputId}>
                              <span className="visually-hidden">
                                {`${spokenVectorName} の${coordinateNames[coordinateIndex]}`}
                              </span>
                              <input
                                id={inputId}
                                type="text"
                                inputMode="decimal"
                                autoComplete="off"
                                spellCheck={false}
                                value={draft}
                                aria-invalid={isInvalid}
                                aria-describedby={isInvalid ? inputErrorId : undefined}
                                onChange={(event) =>
                                  handleCoordinateChange(vector.id, coordinateIndex, event.target.value)
                                }
                              />
                              {!result.ok ? (
                                <span className="visually-hidden" id={inputErrorId}>
                                  {result.message} 座標面と判定には直前の有効値を使います。
                                </span>
                              ) : null}
                            </label>
                          );
                        })}
                      </div>
                      <div className="vector-editor-actions">
                        <label className="span-selection-control">
                          <input
                            type="checkbox"
                            checked={state.spanSelection.includes(vector.id)}
                            aria-label={`${spokenVectorName} を生成する空間の対象に含める`}
                            onChange={(event) =>
                              handleSpanSelection(vector.id, event.target.checked)
                            }
                          />
                          <span>
                            <MathOperator name="span" /> の対象に含める
                          </span>
                        </label>
                        <button
                          className="remove-vector-button"
                          type="button"
                          aria-label={`${spokenVectorName} を削除`}
                          onClick={() => handleRemoveVector(vector.id)}
                        >
                          削除
                        </button>
                      </div>
                      <p
                        className={`coordinate-feedback ${firstError ? 'has-error' : ''}`}
                        id={errorId}
                      >
                        {firstError && !firstError.ok
                          ? `${errorCount}か所が未確定です。${firstError.message} 座標面と判定には直前の有効値を使います。`
                          : '入力は表示と判定へすぐに反映されます。'}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>

            <section
              className={`span-card inspector-panel is-rank-${spanAnalysis.rank}`}
              id="inspector-panel-span"
              role="tabpanel"
              aria-labelledby="inspector-tab-span span-card-title"
              hidden={activeInspectorTab !== 'span'}
            >
              <div className="span-card-heading">
                <div>
                  <p className="panel-kicker">Selected span</p>
                  <h2 id="span-card-title">選択したベクトルが生成する空間</h2>
                </div>
                <label className="span-visibility-control">
                  <input
                    type="checkbox"
                    checked={state.visualization.showSpan}
                    onChange={(event) => handleShowSpan(event.target.checked)}
                  />
                  <span>座標平面に表示</span>
                </label>
              </div>

              <VectorSetDefinition vectors={spanVectors} />
              <SelectedMatrixDefinition vectors={spanVectors} />

              <div className="span-shape-result">
                <span className="span-shape-symbol" aria-hidden="true">
                  {spanAnalysis.rank === 0 ? '⊙' : spanAnalysis.rank === 1 ? '━' : '▧'}
                </span>
                <div>
                  <strong>{spanShape.heading}</strong>
                  <p>{spanShape.explanation}</p>
                </div>
              </div>

              <p className="span-relation">
                {spanVectors.length === 0
                  ? '空集合は一次独立で、生成する空間は零部分空間です。'
                  : spanAnalysis.isLinearlyIndependent
                    ? '選択したベクトルは一次独立です。'
                    : '選択したベクトルは一次従属です。'}
              </p>

              <dl className="span-metric-grid">
                <div>
                  <dt>選択数</dt>
                  <dd>{spanAnalysis.vectorCount}</dd>
                </div>
                <div>
                  <dt>
                    <MathOperator name="rank" />(<MathMatrixName name="A" />)
                  </dt>
                  <dd>{spanAnalysis.rank}</dd>
                </div>
                <div>
                  <dt>
                    <MathOperator name="dim" />(<MathOperator name="span" />(<span className="math-set-name">S</span>))
                  </dt>
                  <dd>{spanAnalysis.spanDimension}</dd>
                </div>
              </dl>
            </section>

            <LinearCombinationExplorer
              visible={state.linearCombination.visible}
              active={activeInspectorTab === 'combination'}
              target={targetCoordinates}
              vectors={spanVectors}
              analysis={linearCombinationAnalysis}
            />

            <section
              className={`result-card inspector-panel ${isIndependent ? 'is-independent' : 'is-dependent'}`}
              id="inspector-panel-all"
              role="tabpanel"
              aria-labelledby="inspector-tab-all"
              hidden={activeInspectorTab !== 'all'}
            >
              <p className="panel-kicker">All vectors</p>
              <MatrixDefinition vectors={state.vectors} />
              <p className="result-symbol" aria-hidden="true">{isIndependent ? '∥' : '≈'}</p>
              <h2>{allVectorRelation.heading}</h2>
              <p className="result-explanation">{allVectorRelation.explanation}</p>

              <dl className="metric-grid">
                <div>
                  <dt>ベクトル数</dt>
                  <dd>{analysis.vectorCount}</dd>
                </div>
                <div>
                  <dt>
                    <MathOperator name="rank" />
                    (<MathMatrixName />)
                  </dt>
                  <dd>{analysis.rank}</dd>
                </div>
                <div>
                  <dt>
                    生成する空間の次元
                    <small className="dimension-expression">
                      <MathOperator name="dim" />
                      (<MathOperator name="span" />(&#123;
                      {state.vectors.map((vector, index) => (
                        <span key={vector.id}>
                          {index > 0 ? ', ' : ''}
                          <MathVectorName name={vector.name} />
                        </span>
                      ))}
                      &#125;))
                    </small>
                  </dt>
                  <dd>{analysis.spanDimension}</dd>
                </div>
              </dl>
            </section>

            <p className="development-note">
              選択した集合が生成する空間と、表示中の全ベクトルの一次独立・一次従属を分けて表示しています。
            </p>
          </aside>
        </div>
        <section
          className="three-dimensional-workspace"
          id="dimension-panel-3"
          role="tabpanel"
          aria-labelledby="dimension-tab-3"
          hidden={activeDimension !== 3}
          tabIndex={-1}
        >
          <div className="three-dimensional-layout">
            {hasActivatedThreeDimensions ? (
              <Suspense fallback={<ThreeDimensionalLoading />}>
                <VectorSpace3D
                  vectors={threeDimensionalState.vectors}
                  colors={vectorColors}
                  spanVectors={threeDimensionalSpanVectors}
                  spanRank={threeDimensionalSpanAnalysis.rank}
                  showSpan={threeDimensionalState.visualization.showSpan}
                  linearCombinationVisible={threeDimensionalState.linearCombination.visible}
                  linearCombinationTarget={threeDimensionalTargetCoordinates}
                  linearCombinationCoefficients={
                    threeDimensionalLinearCombinationAnalysis?.particularSolution ?? null
                  }
                  active={activeDimension === 3}
                  resetKey={threeDimensionalCameraResetKey}
                  camera={threeDimensionalState.visualization.camera}
                  onCameraChange={handleThreeDimensionalCameraChange}
                  onVectorCoordinatesCommit={handleThreeDimensionalDirectCoordinatesCommit}
                  onLinearCombinationTargetPlacement={
                    handleThreeDimensionalTargetPlacement
                  }
                  onLinearCombinationVisibility={
                    handleThreeDimensionalLinearCombinationVisibility
                  }
                />
              </Suspense>
            ) : null}
            <ThreeDimensionalInspector
              state={threeDimensionalState}
              drafts={threeDimensionalCoordinateDrafts}
              analysis={threeDimensionalAnalysis}
              spanVectors={threeDimensionalSpanVectors}
              spanAnalysis={threeDimensionalSpanAnalysis}
              spanShape={threeDimensionalSpanShape}
              targetDrafts={threeDimensionalTargetCoordinateDrafts}
              target={threeDimensionalTargetCoordinates}
              linearCombinationAnalysis={threeDimensionalLinearCombinationAnalysis}
              allVectorRelation={threeDimensionalAllVectorRelation}
              activeTab={activeThreeDimensionalInspectorTab}
              addButtonRef={threeDimensionalAddVectorButtonRef}
              onTabChange={setActiveThreeDimensionalInspectorTab}
              onTabKeyDown={handleThreeDimensionalInspectorTabKeyDown}
              onCoordinateChange={handleThreeDimensionalCoordinateChange}
              onSpanSelection={handleThreeDimensionalSpanSelection}
              onShowSpan={handleThreeDimensionalShowSpan}
              onTargetCoordinateChange={handleThreeDimensionalTargetCoordinateChange}
              onClearTarget={handleThreeDimensionalClearTarget}
              onAddVector={handleThreeDimensionalAddVector}
              onRemoveVector={handleThreeDimensionalRemoveVector}
            />
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <p>
          {projectInfo.status} — {activeDimension === 2
            ? '有効な成分は座標平面と判定へ即時反映されます。'
            : '正投影の3D表示を回転・拡大・移動できます。'}
        </p>
      </footer>

      <dialog
        className="share-dialog"
        ref={shareDialogRef}
        aria-labelledby="share-dialog-title"
        aria-describedby="share-dialog-description"
        onClick={handleShareDialogClick}
        onClose={() => setShareFeedback(null)}
      >
        <div className="share-dialog-content">
          <p className="panel-kicker">Export current state</p>
          <h2 id="share-dialog-title">共有URLをエクスポート</h2>
          <p className="share-dialog-description" id="share-dialog-description">
            このURLを開くと、ベクトル、spanの選択、幾何表示、一次結合のターゲットが復元されます。
            {activeDimension === 2
              ? '表示範囲はベクトルと表示中のターゲット全体が見えるように自動調整されます。'
              : '3Dではカメラの向き、注視点、拡大率も同じ状態として復元されます。'}
          </p>
          <section
            className={`share-qr-code ${shareQrCodeErrorMessage ? 'has-error' : ''}`}
            aria-labelledby="share-qr-code-title"
            aria-busy={isShareQrCodeLoading}
          >
            <h3 id="share-qr-code-title">共有URLのQRコード</h3>
            <div className="share-qr-code-frame">
              {shareQrCodeDataUrl ? (
                <img
                  src={shareQrCodeDataUrl}
                  alt="現在の共有URLを表すQRコード"
                  width="768"
                  height="768"
                />
              ) : (
                <p role={shareQrCodeErrorMessage ? 'alert' : 'status'}>
                  {shareQrCodeErrorMessage ?? 'QRコードを生成しています。'}
                </p>
              )}
            </div>
            <p className="share-qr-code-help">
              スマートフォンのカメラで読み取ると、同じ教材状態を開けます。
            </p>
          </section>
          <label className="share-url-field">
            <span>共有URL</span>
            <textarea
              ref={shareUrlFieldRef}
              rows={5}
              readOnly
              value={shareUrl}
              spellCheck={false}
              aria-describedby="share-dialog-description share-dialog-feedback"
              onFocus={(event) => event.currentTarget.select()}
            />
          </label>
          <p
            className={`share-feedback ${shareFeedback?.kind === 'error' ? 'has-error' : ''}`}
            id="share-dialog-feedback"
            role={shareFeedback?.kind === 'error' ? 'alert' : 'status'}
            aria-live="polite"
          >
            {shareFeedback?.message ?? 'URLはドラッグして選択し、手動でもコピーできます。'}
          </p>
          <div className="share-dialog-actions">
            <button className="copy-share-button" type="button" onClick={handleCopyShareUrl}>
              クリップボードにコピー
            </button>
            <button
              type="button"
              disabled={!shareQrCodeDataUrl}
              onClick={handleDownloadShareQrCode}
            >
              QRコードを保存
            </button>
            <button type="button" onClick={handleDownloadShareUrl}>
              テキストで保存
            </button>
            <button type="button" onClick={handleCloseShareDialog}>
              閉じる
            </button>
          </div>
        </div>
      </dialog>
    </div>
  );
}

function ThreeDimensionalLoading() {
  return (
    <section className="three-dimensional-loading" aria-live="polite" aria-busy="true">
      <p className="panel-kicker">3D coordinate space</p>
      <h2>3次元表示を準備しています</h2>
      <p>初回だけ3D描画に必要なデータを読み込みます。</p>
    </section>
  );
}

function ThreeDimensionalInspector({
  state,
  drafts,
  analysis,
  spanVectors,
  spanAnalysis,
  spanShape,
  targetDrafts,
  target,
  linearCombinationAnalysis,
  allVectorRelation,
  activeTab,
  addButtonRef,
  onTabChange,
  onTabKeyDown,
  onCoordinateChange,
  onSpanSelection,
  onShowSpan,
  onTargetCoordinateChange,
  onClearTarget,
  onAddVector,
  onRemoveVector,
}: {
  readonly state: ShareState;
  readonly drafts: CoordinateDrafts;
  readonly analysis: VectorSetAnalysis;
  readonly spanVectors: readonly VectorValue[];
  readonly spanAnalysis: VectorSetAnalysis;
  readonly spanShape: SpanShapeDescription;
  readonly targetDrafts: TargetCoordinateDrafts;
  readonly target: readonly [number, number, number] | null;
  readonly linearCombinationAnalysis: LinearCombinationAnalysis | null;
  readonly allVectorRelation: ReturnType<typeof describeAllVectorRelation>;
  readonly activeTab: ThreeDimensionalInspectorTabId;
  readonly addButtonRef: RefObject<HTMLButtonElement | null>;
  readonly onTabChange: (tab: ThreeDimensionalInspectorTabId) => void;
  readonly onTabKeyDown: (event: ReactKeyboardEvent<HTMLButtonElement>) => void;
  readonly onCoordinateChange: (vectorId: string, coordinateIndex: number, input: string) => void;
  readonly onSpanSelection: (vectorId: string, selected: boolean) => void;
  readonly onShowSpan: (showSpan: boolean) => void;
  readonly onTargetCoordinateChange: (coordinateIndex: number, input: string) => void;
  readonly onClearTarget: () => void;
  readonly onAddVector: () => void;
  readonly onRemoveVector: (vectorId: string) => void;
}) {
  const availableTabs = state.linearCombination.visible
    ? threeDimensionalInspectorTabs
    : threeDimensionalInspectorTabs.filter((tab) => tab.id !== 'combination');

  return (
    <aside className="analysis-column three-dimensional-analysis" aria-label="3Dベクトル集合の編集と解析結果">
      <section className="analysis-summary" aria-labelledby="3d-analysis-summary-title">
        <h2 className="visually-hidden" id="3d-analysis-summary-title">現在の3D解析要約</h2>
        <button
          className="summary-tile summary-span"
          type="button"
          onClick={() => onTabChange('span')}
        >
          <span className="summary-label">選択集合 <span className="math-set-name">S</span></span>
          <strong>{spanShape.summary}</strong>
          <span className="summary-math">
            <MathOperator name="dim" />(<MathOperator name="span" />(<span className="math-set-name">S</span>))
            {' = '}{spanAnalysis.spanDimension}
          </span>
        </button>
        <button
          className="summary-tile summary-all"
          type="button"
          onClick={() => onTabChange('all')}
        >
          <span className="summary-label">表示中の全ベクトル</span>
          <strong>{analysis.isLinearlyIndependent ? '一次独立' : '一次従属'}</strong>
          <span className="summary-math">
            <MathOperator name="rank" />(<MathMatrixName />)
            {' = '}{analysis.rank}
          </span>
        </button>
      </section>

      <div className="inspector-tablist" role="tablist" aria-label="3D編集・解析の詳細">
        {availableTabs.map((tab) => (
          <button
            key={tab.id}
            id={`3d-inspector-tab-${tab.id}`}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`3d-inspector-panel-${tab.id}`}
            tabIndex={activeTab === tab.id ? 0 : -1}
            onClick={() => onTabChange(tab.id)}
            onKeyDown={onTabKeyDown}
          >
            <span className="tab-label-wide">{tab.label}</span>
            <span className="tab-label-short">{tab.shortLabel}</span>
          </button>
        ))}
      </div>

      <ThreeDimensionalVectorEditor
        state={state}
        drafts={drafts}
        active={activeTab === 'edit'}
        addButtonRef={addButtonRef}
        onCoordinateChange={onCoordinateChange}
        onSpanSelection={onSpanSelection}
        onAddVector={onAddVector}
        onRemoveVector={onRemoveVector}
      />

      <section
        className={`span-card inspector-panel is-rank-${spanAnalysis.rank}`}
        id="3d-inspector-panel-span"
        role="tabpanel"
        aria-labelledby="3d-inspector-tab-span 3d-span-card-title"
        hidden={activeTab !== 'span'}
      >
        <div className="span-card-heading">
          <div>
            <p className="panel-kicker">Selected span / 3D</p>
            <h2 id="3d-span-card-title">選択したベクトルが生成する空間</h2>
          </div>
          <label className="span-visibility-control">
            <input
              type="checkbox"
              checked={state.visualization.showSpan}
              onChange={(event) => onShowSpan(event.target.checked)}
            />
            <span>3D座標空間に表示</span>
          </label>
        </div>
        <VectorSetDefinition vectors={spanVectors} />
        <SelectedMatrixDefinition vectors={spanVectors} />
        <div className="span-shape-result">
          <span className="span-shape-symbol" aria-hidden="true">
            {spanAnalysis.rank === 3 ? (
              <svg
                className="span-cube-icon"
                viewBox="0 0 48 48"
                focusable="false"
              >
                <polygon
                  className="span-cube-face span-cube-face-top"
                  points="8,14 17,6 40,6 31,14"
                />
                <polygon
                  className="span-cube-face span-cube-face-front"
                  points="8,14 31,14 31,39 8,39"
                />
                <polygon
                  className="span-cube-face span-cube-face-right"
                  points="31,14 40,6 40,31 31,39"
                />
                <path
                  className="span-cube-hidden-edges"
                  d="M17 6 V31 H40 M17 31 L8 39"
                />
              </svg>
            ) : spanAnalysis.rank === 0 ? '⊙' : spanAnalysis.rank === 1 ? '━' : '▱'}
          </span>
          <div>
            <strong>{spanShape.heading}</strong>
            <p>{spanShape.explanation}</p>
          </div>
        </div>
        <p className="span-relation">
          {spanVectors.length === 0
            ? '空集合は一次独立で、生成する空間は零部分空間です。'
            : spanAnalysis.isLinearlyIndependent
              ? '選択したベクトルは一次独立です。'
              : '選択したベクトルは一次従属です。'}
        </p>
        <dl className="span-metric-grid">
          <div><dt>選択数</dt><dd>{spanAnalysis.vectorCount}</dd></div>
          <div><dt><MathOperator name="rank" />(<MathMatrixName />)</dt><dd>{spanAnalysis.rank}</dd></div>
          <div>
            <dt><MathOperator name="dim" />(<MathOperator name="span" />(<span className="math-set-name">S</span>))</dt>
            <dd>{spanAnalysis.spanDimension}</dd>
          </div>
        </dl>
        <p className="three-dimensional-span-note">
          灰色の原点・破線・半透明平面・半透明空間と外枠で次元を区別します。
          表示をオフにしても、選択集合と解析結果は維持されます。
        </p>
      </section>

      <LinearCombinationExplorer
        visible={state.linearCombination.visible}
        active={activeTab === 'combination'}
        target={target}
        vectors={spanVectors}
        analysis={linearCombinationAnalysis}
        ambientDimension={3}
        idPrefix="3d-"
        targetEditor={(
          <TargetEditor
            drafts={targetDrafts}
            target={target}
            dimension={3}
            inputIdPrefix="3d-"
            onCoordinateChange={onTargetCoordinateChange}
            onClear={onClearTarget}
          />
        )}
      />

      <section
        className={`result-card inspector-panel ${analysis.isLinearlyIndependent ? 'is-independent' : 'is-dependent'}`}
        id="3d-inspector-panel-all"
        role="tabpanel"
        aria-labelledby="3d-inspector-tab-all"
        hidden={activeTab !== 'all'}
      >
        <p className="panel-kicker">All vectors / 3D</p>
        <MatrixDefinition vectors={state.vectors} />
        <p className="result-symbol" aria-hidden="true">{analysis.isLinearlyIndependent ? '∥' : '≈'}</p>
        <h2>{allVectorRelation.heading}</h2>
        <p className="result-explanation">{allVectorRelation.explanation}</p>
        <dl className="metric-grid">
          <div><dt>ベクトル数</dt><dd>{analysis.vectorCount}</dd></div>
          <div><dt><MathOperator name="rank" />(<MathMatrixName />)</dt><dd>{analysis.rank}</dd></div>
          <div>
            <dt>
              生成する空間の次元
              <small className="dimension-expression">
                <MathOperator name="dim" />(<MathOperator name="span" />(&#123;
                {state.vectors.map((vector, index) => (
                  <span key={vector.id}>{index > 0 ? ', ' : ''}<MathVectorName name={vector.name} /></span>
                ))}
                &#125;))
              </small>
            </dt>
            <dd>{analysis.spanDimension}</dd>
          </div>
        </dl>
      </section>
      <p className="development-note">
        3Dでも、選択集合が生成する空間と全ベクトルの一次独立・一次従属を分けて表示しています。
      </p>
    </aside>
  );
}

function ThreeDimensionalVectorEditor({
  state,
  drafts,
  active,
  addButtonRef,
  onCoordinateChange,
  onSpanSelection,
  onAddVector,
  onRemoveVector,
}: {
  readonly state: ShareState;
  readonly drafts: CoordinateDrafts;
  readonly active: boolean;
  readonly addButtonRef: RefObject<HTMLButtonElement | null>;
  readonly onCoordinateChange: (vectorId: string, coordinateIndex: number, input: string) => void;
  readonly onSpanSelection: (vectorId: string, selected: boolean) => void;
  readonly onAddVector: () => void;
  readonly onRemoveVector: (vectorId: string) => void;
}) {
  return (
    <section
      className="vector-editor-card inspector-panel"
      id="3d-inspector-panel-edit"
      role="tabpanel"
      aria-labelledby="3d-inspector-tab-edit 3d-vector-editor-title"
      hidden={!active}
    >
      <div className="vector-editor-heading">
        <div>
          <p className="panel-kicker">Edit vectors / 3D</p>
          <h2 id="3d-vector-editor-title">列ベクトルの成分</h2>
          <p className="editor-hint">
            上から第1・第2・第3成分です。追加したベクトルはspanの対象に含まれます。
          </p>
        </div>
        <div className="vector-collection-controls">
          <span aria-live="polite">{state.vectors.length} / {MAX_SHARE_VECTORS} 本</span>
          <button
            ref={addButtonRef}
            type="button"
            disabled={state.vectors.length >= MAX_SHARE_VECTORS}
            aria-describedby={state.vectors.length >= MAX_SHARE_VECTORS ? '3d-vector-limit-help' : undefined}
            onClick={onAddVector}
          >
            ＋ ベクトルを追加
          </button>
        </div>
      </div>
      {state.vectors.length >= MAX_SHARE_VECTORS ? (
        <p className="vector-limit-help" id="3d-vector-limit-help" role="status" aria-live="polite">
          共有状態の上限である{MAX_SHARE_VECTORS}本に達しています。
        </p>
      ) : null}
      <div className="vector-editor-list">
        {state.vectors.length === 0 ? (
          <p className="empty-vector-editor">
            ベクトルはありません。「ベクトルを追加」から始められます。Resetで読込時の状態へ戻せます。
          </p>
        ) : null}
        {state.vectors.map((vector, vectorIndex) => {
          const vectorDrafts = drafts[vector.id] ?? vector.coordinates.map(String);
          const results = vectorDrafts.map(parseCoordinateInput);
          const firstError = results.find((result) => !result.ok);
          const errorCount = results.filter((result) => !result.ok).length;
          const spokenVectorName = formatVectorSpokenName(vector.name);

          return (
            <div className="vector-editor" key={vector.id}>
              <span
                className="vector-key"
                style={{ '--vector-color': vectorColors[vectorIndex % vectorColors.length] } as CSSProperties}
                aria-hidden="true"
              >
                {vectorIndex + 1}
              </span>
              <MathVectorName name={vector.name} />
              <span className="math-equals" aria-hidden="true">=</span>
              <div className="editable-column-vector">
                {vectorDrafts.map((draft, coordinateIndex) => {
                  const result = results[coordinateIndex];
                  const inputId = `3d-${vector.id}-coordinate-${coordinateIndex}`;
                  const inputErrorId = `${inputId}-error`;
                  return (
                    <label className="coordinate-field" key={inputId} htmlFor={inputId}>
                      <span className="visually-hidden">
                        {`${spokenVectorName} の${coordinateNames[coordinateIndex]}`}
                      </span>
                      <input
                        id={inputId}
                        type="text"
                        inputMode="decimal"
                        autoComplete="off"
                        spellCheck={false}
                        value={draft}
                        aria-invalid={!result.ok}
                        aria-describedby={!result.ok ? inputErrorId : undefined}
                        onChange={(event) => onCoordinateChange(vector.id, coordinateIndex, event.target.value)}
                      />
                      {!result.ok ? (
                        <span className="visually-hidden" id={inputErrorId}>
                          {result.message} 3D表示と判定には直前の有効値を使います。
                        </span>
                      ) : null}
                    </label>
                  );
                })}
              </div>
              <div className="vector-editor-actions">
                <label className="span-selection-control">
                  <input
                    type="checkbox"
                    checked={state.spanSelection.includes(vector.id)}
                    aria-label={`${spokenVectorName} を生成する空間の対象に含める`}
                    onChange={(event) => onSpanSelection(vector.id, event.target.checked)}
                  />
                  <span><MathOperator name="span" /> の対象に含める</span>
                </label>
                <button
                  className="remove-vector-button"
                  type="button"
                  aria-label={`${spokenVectorName} を削除`}
                  onClick={() => onRemoveVector(vector.id)}
                >
                  削除
                </button>
              </div>
              <p className={`coordinate-feedback ${firstError ? 'has-error' : ''}`}>
                {firstError && !firstError.ok
                  ? `${errorCount}か所が未確定です。${firstError.message} 3D表示と判定には直前の有効値を使います。`
                  : '入力は3D表示と判定へすぐに反映されます。'}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function TargetEditor({
  drafts,
  target,
  dimension = 2,
  inputIdPrefix = '',
  onCoordinateChange,
  onClear,
}: {
  readonly drafts: TargetCoordinateDrafts;
  readonly target: readonly number[] | null;
  readonly dimension?: AppDimension;
  readonly inputIdPrefix?: string;
  readonly onCoordinateChange: (coordinateIndex: number, input: string) => void;
  readonly onClear: () => void;
}) {
  const hasDraftInput = drafts.some((draft) => draft.trim().length > 0);
  const results = drafts.map(parseCoordinateInput);
  const invalidResults = hasDraftInput ? results.filter((result) => !result.ok) : [];
  const firstError = invalidResults[0];

  return (
    <section className="target-editor" aria-labelledby={`${inputIdPrefix}target-editor-title`}>
      <div className="target-editor-copy">
        <p className="panel-kicker">Linear combination target</p>
        <h3 id={`${inputIdPrefix}target-editor-title`}>
          ターゲット <MathVectorName name="v" />
        </h3>
        <p>
          {dimension === 2
            ? '座標面をクリックまたはタップして配置するか、成分を入力してください。'
            : '3D表示の背景を短くクリックまたはタップして、原点を通る現在の画面平行面上へ配置するか、3つの成分を入力してください。配置後は青い矢先のドラッグでも変更できます。'}
          選択集合 <span className="math-set-name">S</span> の一次結合で表せるかを
          {dimension === 2 ? '右側の「一次結合」タブ' : 'このカード'}に表示します。
        </p>
      </div>
      <div className="target-editor-controls">
        <MathVectorName name="v" />
        <span className="math-equals" aria-hidden="true">=</span>
        <div className="editable-column-vector target-column-vector">
          {drafts.map((draft, coordinateIndex) => {
            const result = results[coordinateIndex];
            const isInvalid = hasDraftInput && !result.ok;
            const inputId = `${inputIdPrefix}linear-combination-target-coordinate-${coordinateIndex}`;
            const errorId = `${inputId}-error`;

            return (
              <label className="coordinate-field" key={inputId} htmlFor={inputId}>
                <span className="visually-hidden">
                  {`ターゲット v の${coordinateNames[coordinateIndex]}`}
                </span>
                <input
                  id={inputId}
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="未配置"
                  value={draft}
                  aria-invalid={isInvalid}
                  aria-describedby={isInvalid ? errorId : undefined}
                  onChange={(event) => onCoordinateChange(coordinateIndex, event.target.value)}
                />
                {isInvalid && !result.ok ? (
                  <span className="visually-hidden" id={errorId}>
                    {result.message} ターゲットには直前の有効値を使います。
                  </span>
                ) : null}
              </label>
            );
          })}
        </div>
        <button
          className="clear-target-button"
          type="button"
          disabled={!target && !hasDraftInput}
          onClick={onClear}
        >
          ターゲットを消去
        </button>
      </div>
      <p
        className={`target-coordinate-feedback ${firstError ? 'has-error' : ''}`}
        role="status"
        aria-live="polite"
      >
        {firstError && !firstError.ok
          ? `${invalidResults.length}か所が未確定です。${firstError.message} ターゲットには直前の有効値を使います。`
          : target
            ? dimension === 2
              ? '入力と座標面上のターゲットは同期しています。'
              : '入力と3D座標空間のターゲットは同期しています。'
            : 'ターゲットは未配置です。この状態も共有できます。'}
      </p>
    </section>
  );
}

function LinearCombinationExplorer({
  visible,
  active,
  target,
  vectors,
  analysis,
  ambientDimension = 2,
  idPrefix = '',
  targetEditor = null,
}: {
  readonly visible: boolean;
  readonly active: boolean;
  readonly target: readonly number[] | null;
  readonly vectors: readonly VectorValue[];
  readonly analysis: LinearCombinationAnalysis | null;
  readonly ambientDimension?: AppDimension;
  readonly idPrefix?: string;
  readonly targetEditor?: ReactNode;
}) {
  const statusPresentation = analysis ? describeLinearCombinationStatus(analysis.status) : null;
  const showsGeneralTargetFormula = Boolean(
    ambientDimension === 2 && analysis && vectors.length === 2 && analysis.rank === 2,
  );
  const coefficientGeometryIsDegenerate = analysis?.particularSolution
    ? isCombinationGeometryDegenerate(
        vectors,
        analysis.particularSolution,
        ambientDimension,
      )
    : false;
  const panelId = `${idPrefix}inspector-panel-combination`;
  const tabId = `${idPrefix}inspector-tab-combination`;
  const titleId = `${idPrefix}linear-combination-title`;

  return (
    <section
      className={`linear-combination-card inspector-panel ${analysis ? `is-${analysis.status}` : 'is-empty'}`}
      id={panelId}
      role="tabpanel"
      aria-labelledby={`${tabId} ${titleId}`}
      hidden={!visible || !active}
    >
      <p className="panel-kicker">Linear combination explorer</p>
      <h2 id={titleId}>一次結合でターゲットを表す</h2>
      {targetEditor}
      <LinearCombinationDefinition vectors={vectors} />

      {!target || !analysis || !statusPresentation ? (
        <div className="linear-combination-empty">
          <span aria-hidden="true">◇</span>
          <div>
            <strong>ターゲットを配置してください</strong>
            <p>
              {ambientDimension === 2
                ? '座標面をクリック・タップするか、2つの成分を入力すると結果を表示します。'
                : '3D表示を短くクリックまたはタップするか、3つの成分を入力すると結果を表示します。'}
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="linear-combination-result">
            <span className="linear-combination-status-symbol" aria-hidden="true">
              {statusPresentation.symbol}
            </span>
            <div>
              <span className="linear-combination-status-term">{statusPresentation.term}</span>
              <strong>{statusPresentation.heading}</strong>
              <p>{statusPresentation.explanation}</p>
            </div>
          </div>

          <div className="linear-combination-ranks" aria-label="係数行列と拡大係数行列のランク">
            <span>
              <MathOperator name="rank" />(<MathMatrixName name="A" />)
              {' = '}{analysis.rank}
            </span>
            <span>
              <MathOperator name="rank" />([<MathMatrixName name="A" /> | <MathVectorName name="v" />])
              {' = '}{analysis.augmentedRank}
            </span>
          </div>

          {analysis.status === 'none' ? (
            <p className="linear-combination-obstruction">
              2つのrankが異なるため連立一次方程式は不能です。
              <MathVectorName name="v" /> は選択集合が生成する空間に含まれません。
            </p>
          ) : (
            <div className="linear-combination-solutions">
              <SolutionExample
                heading={analysis.status === 'unique' ? '唯一解' : '係数の例1'}
                coefficients={analysis.exampleSolutions[0] ?? analysis.particularSolution ?? []}
                vectors={vectors}
              />

              {analysis.status === 'infinite' && analysis.exampleSolutions[1] ? (
                <SolutionExample
                  heading="係数の例2"
                  coefficients={analysis.exampleSolutions[1]}
                  vectors={vectors}
                />
              ) : null}

              {analysis.status === 'infinite' ? (
                <details className="linear-combination-details">
                  <summary>自由係数を使った一般解を表示</summary>
                  <div className="linear-combination-detail-content">
                    <GeneralSolution analysis={analysis} vectors={vectors} />
                  </div>
                </details>
              ) : null}

              {vectors.length === 2 ? (
                <p className="parallelogram-note">
                  {ambientDimension === 2 ? '座標面' : '3D座標空間'}では
                  {' '}<CoefficientName index={1} /><MathVectorName name={vectors[0].name} /> と
                  {' '}<CoefficientName index={2} /><MathVectorName name={vectors[1].name} /> を原点からの2辺とする
                  {coefficientGeometryIsDegenerate ? '退化した平行四辺形' : '平行四辺形'}を重ねています。
                </p>
              ) : null}
              {ambientDimension === 3 && vectors.length === 3 ? (
                <p className="parallelogram-note">
                  3D座標空間では係数の例1について、3本の係数倍を原点からの3辺とする
                  {coefficientGeometryIsDegenerate ? '退化した平行六面体' : '平行六面体'}を重ねています。
                  無数解の場合、係数の例2と一般解は数式で比較してください。
                </p>
              ) : null}
              {ambientDimension === 3 && vectors.length >= 4 ? (
                <p className="parallelogram-note">
                  4本以上の係数は3D図形へ一意に対応させず、代数表示だけで示します。
                </p>
              ) : null}
            </div>
          )}

          {showsGeneralTargetFormula ? (
            <GeneralTargetFormula vectors={vectors as readonly [VectorValue, VectorValue]} />
          ) : null}
        </>
      )}
    </section>
  );
}

function LinearCombinationDefinition({ vectors }: { readonly vectors: readonly VectorValue[] }) {
  return (
    <div className="linear-combination-definition">
      <div
        className="linear-combination-system"
        aria-label={`ターゲット v は、行列 A と係数ベクトル c の積であり、${vectors.length}本のベクトルの組と係数列の積です。`}
      >
        <MathVectorName name="v" />
        <span className="math-equals" aria-hidden="true">=</span>
        <MathMatrixName name="A" />
        <MathVectorName name="c" />
        <span className="math-equals" aria-hidden="true">=</span>
        <VectorTuple vectors={vectors} />
        <SymbolicCoefficientVector count={vectors.length} />
      </div>
      <div className="coefficient-transpose-definition">
        <MathVectorName name="c" />
        <span aria-hidden="true">=</span>
        <MathTransposedRowVector
          ariaLabel={`係数 c 1 から c ${vectors.length} の転置列ベクトル`}
          values={Array.from({ length: vectors.length }, (_, index) => (
            <CoefficientName index={index + 1} />
          ))}
        />
      </div>
    </div>
  );
}

function VectorTuple({ vectors }: { readonly vectors: readonly VectorValue[] }) {
  return (
    <span className="vector-tuple" aria-label={`${vectors.length}本のベクトルの組`}>
      <span aria-hidden="true">(</span>
      {vectors.map((vector, index) => (
        <span key={vector.id}>
          {index > 0 ? <span aria-hidden="true">, </span> : null}
          <MathVectorName name={vector.name} />
        </span>
      ))}
      <span aria-hidden="true">)</span>
    </span>
  );
}

function SymbolicCoefficientVector({ count }: { readonly count: number }) {
  return (
    <MathColumnVector
      ariaLabel={`係数 c 1 から c ${count} の列ベクトル`}
      values={Array.from({ length: count }, (_, index) => (
        <CoefficientName index={index + 1} />
      ))}
    />
  );
}

function SolutionExample({
  heading,
  coefficients,
  vectors,
}: {
  readonly heading: string;
  readonly coefficients: readonly number[];
  readonly vectors: readonly VectorValue[];
}) {
  const formatted = coefficients.map((coefficient) => formatMathNumber(coefficient));
  const isApproximate = formatted.some((coefficient) => coefficient.approximate);

  return (
    <section className="solution-example">
      <h3>{heading}</h3>
      <div className="coefficient-vector-equation">
        <MathVectorName name="c" />
        <span aria-hidden="true">=</span>
        <SymbolicCoefficientVector count={coefficients.length} />
        <span aria-hidden="true">{isApproximate ? '≈' : '='}</span>
        <MathColumnVector
          ariaLabel={`係数の値 ${formatted.map((coefficient) => coefficient.text).join('、')}`}
          values={formatted.map((coefficient) => coefficient.text)}
        />
      </div>
      <div className="expanded-linear-combination">
        <div className="expanded-equation-line">
          <MathVectorName name="v" />
          <span aria-hidden="true">=</span>
          <LinearCombinationTerms vectors={vectors} />
        </div>
        {vectors.length > 0 ? (
          <div className="expanded-equation-line is-continuation">
            <span className="equation-lhs-placeholder" aria-hidden="true" />
            <span aria-hidden="true">{isApproximate ? '≈' : '='}</span>
            <LinearCombinationTerms
              vectors={vectors}
              coefficientTexts={formatted.map((coefficient) => coefficient.text)}
            />
          </div>
        ) : null}
      </div>
      {vectors.length === 0 ? (
        <p className="empty-sum-note">空和は零ベクトルです。係数を必要としない表し方だけが存在します。</p>
      ) : null}
    </section>
  );
}

function LinearCombinationTerms({
  vectors,
  coefficientTexts,
}: {
  readonly vectors: readonly VectorValue[];
  readonly coefficientTexts?: readonly string[];
}) {
  if (vectors.length === 0) {
    return <MathVectorName name="0" />;
  }

  return (
    <span className="linear-combination-terms">
      {vectors.map((vector, index) => (
        <span className="linear-combination-term" key={vector.id}>
          {index > 0 ? <span className="term-plus"> + </span> : null}
          {coefficientTexts ? (
            <span>({coefficientTexts[index] ?? '0'})</span>
          ) : (
            <CoefficientName index={index + 1} />
          )}
          <MathVectorName name={vector.name} />
        </span>
      ))}
    </span>
  );
}

function GeneralSolution({
  analysis,
  vectors,
}: {
  readonly analysis: LinearCombinationAnalysis;
  readonly vectors: readonly VectorValue[];
}) {
  const particular = (analysis.particularSolution ?? []).map((value) => formatMathNumber(value));
  const basis = analysis.nullspaceBasis.map((direction) =>
    direction.map((value) => formatMathNumber(value)),
  );
  const isApproximate = [
    ...particular,
    ...basis.flat(),
  ].some((value) => value.approximate);

  return (
    <section className="general-solution">
      <h3>自由係数を使った一般解</h3>
      <p>
        自由係数は{analysis.freeParameterCount}個です。任意の実数
        {analysis.freeParameterCount === 1 ? 'を動かすと、すべての表し方が得られます。' : 'の組を動かすと、すべての表し方が得られます。'}
      </p>
      <ol className="general-solution-derivation">
        <li>
          <strong>特解を1つ求める：</strong>
          自由係数をすべて0として <MathMatrixName name="A" /><MathVectorName name="c" />
          {' = '}<MathVectorName name="v" /> を解き、
          <MathVectorSymbol base="c" subscript="p" /> を得ます。
        </li>
        <li>
          <strong>ターゲットを変えない方向を求める：</strong>
          <MathMatrixName name="A" /><MathVectorSymbol base="n" subscript="j" />
          {' = '}<MathVectorName name="0" /> を満たす
          <MathVectorSymbol base="n" subscript="j" /> を同次方程式から求めます。
        </li>
      </ol>
      <p className="general-solution-reason">
        すると <MathMatrixName name="A" />(<MathVectorSymbol base="c" subscript="p" />
        {' + '}<span className="math-sum">Σ<sub>j</sub></span>
        <MathScalarSymbol base="t" subscript="j" /><MathVectorSymbol base="n" subscript="j" />)
        {' = '}<MathVectorName name="v" /> となるため、次がすべての解です。
      </p>
      <div className="general-solution-equation">
        <MathVectorName name="c" />
        <span aria-hidden="true">=</span>
        <MathVectorSymbol base="c" subscript="p" />
        {basis.map((_, index) => (
          <span className="symbolic-nullspace-term" key={`symbolic-nullspace-${index}`}>
            <span aria-hidden="true">+</span>
            <CoefficientName base="t" index={index + 1} />
            <MathVectorSymbol base="n" subscript={String(index + 1)} />
          </span>
        ))}
      </div>
      <div className="general-solution-equation is-values">
        <span className="equation-lhs-placeholder" aria-hidden="true" />
        <span aria-hidden="true">{isApproximate ? '≈' : '='}</span>
        <MathColumnVector
          ariaLabel={`特解 ${particular.map((value) => value.text).join('、')}`}
          values={particular.map((value) => value.text)}
        />
        {basis.map((direction, index) => (
          <span className="nullspace-term" key={`nullspace-${index}`}>
            <span aria-hidden="true">+</span>
            <CoefficientName base="t" index={index + 1} />
            <MathColumnVector
              ariaLabel={`同次解の方向 ${index + 1}、${direction.map((value) => value.text).join('、')}`}
              values={direction.map((value) => value.text)}
            />
          </span>
        ))}
      </div>
      <div className="expanded-general-combination">
        <MathVectorName name="v" />
        <span aria-hidden="true">{isApproximate ? '≈' : '='}</span>
        <span className="linear-combination-terms">
          {vectors.map((vector, coefficientIndex) => (
            <span className="linear-combination-term" key={vector.id}>
              {coefficientIndex > 0 ? <span className="term-plus"> + </span> : null}
              <span className="affine-coefficient">
                (<AffineCoefficientExpression
                  particular={analysis.particularSolution?.[coefficientIndex] ?? 0}
                  directions={analysis.nullspaceBasis.map((direction) => direction[coefficientIndex] ?? 0)}
                />)
              </span>
              <MathVectorName name={vector.name} />
            </span>
          ))}
        </span>
      </div>
      <p className="parameter-domain">
        {basis.map((_, index) => (
          <span key={`parameter-${index}`}>
            {index > 0 ? ', ' : ''}<CoefficientName base="t" index={index + 1} /> ∈ ℝ
          </span>
        ))}
      </p>
    </section>
  );
}

function AffineCoefficientExpression({
  particular,
  directions,
}: {
  readonly particular: number;
  readonly directions: readonly number[];
}) {
  return (
    <>
      {formatMathNumber(particular).text}
      {directions.map((direction, index) => {
        if (direction === 0) {
          return null;
        }
        const magnitude = Math.abs(direction);
        const magnitudeText = magnitude === 1 ? '' : formatMathNumber(magnitude).text;
        return (
          <span key={`affine-${index}`}>
            {direction < 0 ? ' − ' : ' + '}
            {magnitudeText}<CoefficientName base="t" index={index + 1} />
          </span>
        );
      })}
    </>
  );
}

function GeneralTargetFormula({
  vectors,
}: {
  readonly vectors: readonly [VectorValue, VectorValue];
}) {
  const [first, second] = vectors;
  const [p, q] = first.coordinates;
  const [r, s] = second.coordinates;
  const determinant = p * s - r * q;
  const displayedValues = [s, -r, -q, p, determinant].map((value) => formatMathNumber(value));
  const isApproximate = displayedValues.some((value) => value.approximate);

  return (
    <details className="general-target-formula">
      <summary>
        一般の <MathTransposedRowVector values={[
          <MathScalarSymbol base="a" />,
          <MathScalarSymbol base="b" />,
        ]} ariaLabel="a、b の転置列ベクトル" /> に対する係数公式
      </summary>
      <div className="general-target-content">
        <p>
          <MathVectorName name="v" /> = <MathTransposedRowVector values={[
            <MathScalarSymbol base="a" />,
            <MathScalarSymbol base="b" />,
          ]} ariaLabel="a、b の転置列ベクトル" /> とすると、<MathMatrixName name="A" /> の行列式は
          {' '}<MathOperator name="det" />(<MathMatrixName name="A" />)
          {displayedValues[4].approximate ? ' ≈ ' : ' = '}{displayedValues[4].text} ≠ 0 です。
          したがって係数は常に一意に定まります。
        </p>
        <div className="general-target-equation">
          <MathVectorName name="c" />
          <span aria-hidden="true">{isApproximate ? '≈' : '='}</span>
          <MathFraction
            numerator="1"
            denominator={displayedValues[4].text}
            ariaLabel={`1 を ${displayedValues[4].text} で割った値`}
          />
          <MathGridMatrix
            rows={[
              [displayedValues[0].text, displayedValues[1].text],
              [displayedValues[2].text, displayedValues[3].text],
            ]}
          />
          <MathColumnVector
            values={[
              <MathScalarSymbol base="a" />,
              <MathScalarSymbol base="b" />,
            ]}
            ariaLabel="a、b の列ベクトル"
          />
        </div>
        {isApproximate ? (
          <p className="approximation-note">座標の表示を有効数字6桁に丸めているため、式には近似記号を使っています。</p>
        ) : null}
      </div>
    </details>
  );
}

function MathColumnVector({
  values,
  ariaLabel,
}: {
  readonly values: readonly ReactNode[];
  readonly ariaLabel: string;
}) {
  return (
    <span className="display-column-vector" aria-label={ariaLabel}>
      {values.map((value, index) => (
        <span key={index}>{value}</span>
      ))}
    </span>
  );
}

function MathFraction({
  numerator,
  denominator,
  ariaLabel,
}: {
  readonly numerator: ReactNode;
  readonly denominator: ReactNode;
  readonly ariaLabel: string;
}) {
  return (
    <span className="math-fraction" aria-label={ariaLabel}>
      <span aria-hidden="true">{numerator}</span>
      <span aria-hidden="true">{denominator}</span>
    </span>
  );
}

function MathTransposedRowVector({
  values,
  ariaLabel,
}: {
  readonly values: readonly ReactNode[];
  readonly ariaLabel: string;
}) {
  return (
    <span className="transposed-row-vector" aria-label={ariaLabel}>
      <sup aria-hidden="true">t</sup>
      <span aria-hidden="true">[</span>
      {values.map((value, index) => (
        <span key={index}>
          {index > 0 ? <span aria-hidden="true">, </span> : null}
          {value}
        </span>
      ))}
      <span aria-hidden="true">]</span>
    </span>
  );
}

function MathGridMatrix({ rows }: { readonly rows: readonly (readonly string[])[] }) {
  return (
    <span className="display-grid-matrix" aria-label={`行列 ${rows.flat().join('、')}`}>
      {rows.flatMap((row, rowIndex) =>
        row.map((value, columnIndex) => (
          <span key={`${rowIndex}-${columnIndex}`}>{value}</span>
        )),
      )}
    </span>
  );
}

function CoefficientName({
  base = 'c',
  index,
}: {
  readonly base?: string;
  readonly index: number;
}) {
  return <MathScalarSymbol base={base} subscript={String(index)} />;
}

function MathScalarSymbol({
  base,
  subscript,
}: {
  readonly base: string;
  readonly subscript?: string;
}) {
  return (
    <span className="math-scalar">
      <span className="math-scalar-base">{base}</span>
      {subscript ? <sub>{subscript}</sub> : null}
    </span>
  );
}

function MathVectorName({ name }: { readonly name: string }) {
  const { base, subscript } = splitVectorName(name);

  return <MathVectorSymbol base={base} subscript={subscript} ariaLabel={formatVectorSpokenName(name)} />;
}

function MathVectorSymbol({
  base,
  subscript,
  ariaLabel,
}: {
  readonly base: string;
  readonly subscript?: string;
  readonly ariaLabel?: string;
}) {

  return (
    <span className="math-symbol math-vector" aria-label={ariaLabel}>
      <span className="math-vector-base" aria-hidden={ariaLabel ? true : undefined}>{base}</span>
      {subscript ? (
        <sub className="math-vector-subscript" aria-hidden={ariaLabel ? true : undefined}>{subscript}</sub>
      ) : null}
    </span>
  );
}

function MathMatrixName({ name = 'A' }: { readonly name?: string }) {
  return <span className="math-symbol math-matrix">{name}</span>;
}

function MathOperator({ name }: { readonly name: string }) {
  return <span className="math-operator">{name}</span>;
}

function MatrixDefinition({ vectors }: { readonly vectors: readonly VectorValue[] }) {
  const rowCount = vectors[0]?.coordinates.length ?? 0;
  const ariaDescription = vectors
    .map((vector) => `${formatVectorSpokenName(vector.name)} を第${vectors.indexOf(vector) + 1}列`)
    .join('、');
  const ariaLabel = vectors.length === 0
    ? '行列 A は列を持たない空行列です。'
    : `行列 A は、${ariaDescription}に並べた行列です。`;

  return (
    <div
      className="matrix-definition"
      aria-label={ariaLabel}
    >
      <MathMatrixName />
      <span className="math-equals" aria-hidden="true">=</span>
      <span className="matrix-bracket" aria-hidden="true">
        <span
          className="matrix-values"
          style={{ '--matrix-columns': vectors.length } as CSSProperties}
        >
          {Array.from({ length: rowCount }, (_, rowIndex) =>
            vectors.map((vector) => (
              <span key={`${vector.id}-${rowIndex}`}>
                {vector.coordinates[rowIndex]}
              </span>
            )),
          )}
        </span>
      </span>
      <span className="matrix-columns-note" aria-hidden="true">
        = [
        {vectors.map((vector, index) => (
          <span key={vector.id}>
            {index > 0 ? ' ' : ''}
            <MathVectorName name={vector.name} />
          </span>
        ))}
        ]
      </span>
    </div>
  );
}

function VectorSetDefinition({ vectors }: { readonly vectors: readonly VectorValue[] }) {
  const names = vectors.map((vector) => formatVectorSpokenName(vector.name)).join('、');

  return (
    <p
      className="span-set-definition"
      aria-label={vectors.length === 0 ? '集合 S は空集合です。' : `集合 S は ${names} からなる集合です。`}
    >
      <span className="math-set-name" aria-hidden="true">S</span>
      <span className="math-equals" aria-hidden="true">=</span>
      <span aria-hidden="true">{vectors.length === 0 ? '∅' : '{'}</span>
      {vectors.map((vector, index) => (
        <span key={vector.id} aria-hidden="true">
          {index > 0 ? ', ' : ''}
          <MathVectorName name={vector.name} />
        </span>
      ))}
      {vectors.length > 0 ? <span aria-hidden="true">&#125;</span> : null}
    </p>
  );
}

function SelectedMatrixDefinition({ vectors }: { readonly vectors: readonly VectorValue[] }) {
  const names = vectors.map((vector) => formatVectorSpokenName(vector.name)).join('、');

  return (
    <p
      className="span-matrix-definition"
      aria-label={vectors.length === 0
        ? '行列 A は列を持たない空行列です。'
        : `行列 A は ${names} を列に並べた行列です。`}
    >
      <MathMatrixName name="A" />
      <span className="math-equals" aria-hidden="true">=</span>
      <span aria-hidden="true">[</span>
      {vectors.map((vector, index) => (
        <span key={vector.id} aria-hidden="true">
          {index > 0 ? ' ' : ''}
          <MathVectorName name={vector.name} />
        </span>
      ))}
      <span aria-hidden="true">]</span>
    </p>
  );
}

function describeSpanShape(rank: number, ambientDimension: AppDimension): SpanShapeDescription {
  if (rank === 0) {
    return {
      heading: '原点だけです',
      explanation: '生成する空間は、零ベクトルだけからなる零部分空間です。',
      summary: '原点',
    };
  }

  if (rank === 1) {
    return {
      heading: '原点を通る直線です',
      explanation: '選択した非零ベクトルの実数倍が、この直線全体を作ります。',
      summary: '原点を通る直線',
    };
  }

  if (rank === 2) {
    return ambientDimension === 2
      ? {
          heading: '2次元座標平面全体です',
          explanation: '2本の一次独立な方向によって、平面上のすべてのベクトルを作れます。',
          summary: '2次元座標平面全体',
        }
      : {
          heading: '原点を通る平面です',
          explanation: '2本の一次独立な方向の一次結合が、3次元空間内の平面全体を作ります。',
          summary: '原点を通る平面',
        };
  }

  return {
    heading: '3次元座標空間全体です',
    explanation: '3本の一次独立な方向によって、空間内のすべてのベクトルを作れます。',
    summary: '3次元座標空間全体',
  };
}

function describeAllVectorRelation(
  vectorCount: number,
  isIndependent: boolean,
): { readonly heading: string; readonly explanation: string } {
  if (vectorCount === 0) {
    return {
      heading: '空集合は一次独立です',
      explanation: 'ベクトルを含まないため、一次関係は自明なものだけです。',
    };
  }

  return isIndependent
    ? {
        heading: '全ベクトルは一次独立です',
        explanation: 'どのベクトルも、他のベクトルの一次結合では表せません。',
      }
    : {
        heading: '全ベクトルは一次従属です',
        explanation: '少なくとも1本のベクトルが、他のベクトルの一次結合で表せます。',
      };
}

function isCombinationGeometryDegenerate(
  vectors: readonly VectorValue[],
  coefficients: readonly number[],
  dimension: AppDimension,
): boolean {
  if (vectors.length !== 2 && vectors.length !== 3) {
    return false;
  }
  const scaledVectors = vectors.map((vector, vectorIndex) => ({
    ...vector,
    coordinates: vector.coordinates.map((coordinate) => (
      coordinate * (coefficients[vectorIndex] ?? 0)
    )),
  }));
  return analyzeVectorSet({ dimension, vectors: scaledVectors }).rank < vectors.length;
}

function createCoordinateDrafts(vectors: readonly VectorValue[]): CoordinateDrafts {
  return Object.fromEntries(
    vectors.map((vector) => [vector.id, vector.coordinates.map(String)]),
  );
}

function createTargetCoordinateDrafts(
  target: readonly number[] | null,
  dimension: AppDimension,
): TargetCoordinateDrafts {
  const coordinates = target?.length === dimension ? target : null;
  return coordinates
    ? coordinatesToTargetDrafts(coordinates)
    : Array.from({ length: dimension }, () => '');
}

function coordinatesToTargetDrafts(
  coordinates: readonly number[],
): TargetCoordinateDrafts {
  return coordinates.map(String);
}

function toTwoDimensionalTarget(
  target: readonly number[] | null,
): readonly [number, number] | null {
  return target?.length === 2 ? [target[0], target[1]] : null;
}

function toThreeDimensionalTarget(
  target: readonly number[] | null,
): readonly [number, number, number] | null {
  return target?.length === 3 ? [target[0], target[1], target[2]] : null;
}

function collectCoordinateInputIssues(
  vectors: readonly VectorValue[],
  drafts: CoordinateDrafts,
  targetVisible: boolean,
  targetDrafts: TargetCoordinateDrafts,
  vectorInputIdPrefix = '',
  targetInputIdPrefix = 'linear-combination-target-coordinate-',
): readonly CoordinateInputIssue[] {
  const vectorIssues = collectVectorCoordinateInputIssues(
    vectors,
    drafts,
    vectorInputIdPrefix,
  );
  const hasTargetDraftInput = targetDrafts.some((draft) => draft.trim().length > 0);
  const targetIssues = targetVisible && hasTargetDraftInput
    ? targetDrafts.flatMap((draft, coordinateIndex) => (
        parseCoordinateInput(draft).ok
          ? []
          : [{ inputId: `${targetInputIdPrefix}${coordinateIndex}` }]
      ))
    : [];

  return [...vectorIssues, ...targetIssues];
}

function collectVectorCoordinateInputIssues(
  vectors: readonly VectorValue[],
  drafts: CoordinateDrafts,
  inputIdPrefix = '',
): readonly CoordinateInputIssue[] {
  return vectors.flatMap((vector) =>
    (drafts[vector.id] ?? vector.coordinates.map(String)).flatMap((draft, coordinateIndex) => {
      const result = parseCoordinateInput(draft);
      return result.ok
        ? []
        : [{ inputId: `${inputIdPrefix}${vector.id}-coordinate-${coordinateIndex}` }];
    }),
  );
}

function cameraStatesEqual(
  left: SharedCameraState | null,
  right: SharedCameraState,
): boolean {
  return left !== null
    && left.zoom === right.zoom
    && left.direction.every((value, index) => value === right.direction[index])
    && left.target.every((value, index) => value === right.target[index])
    && left.up.every((value, index) => value === right.up[index]);
}

function formatViewportNumber(value: number): string {
  return new Intl.NumberFormat('ja-JP', { maximumSignificantDigits: 4 }).format(value);
}

function clampDraggedCoordinate(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  const clamped = Math.min(MAX_ABSOLUTE_COORDINATE, Math.max(-MAX_ABSOLUTE_COORDINATE, value));
  return Object.is(clamped, -0) ? 0 : clamped;
}
