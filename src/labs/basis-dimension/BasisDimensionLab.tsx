import {
  lazy,
  Suspense,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react';
import {
  analyzeBasisCoordinates,
  analyzeBasisCandidate,
  createPolynomialTerms,
  formatPolynomialExpression,
  polynomialCoefficientLabel,
  type BasisCandidateAnalysis,
  type BasisCoordinateAnalysis,
  type VectorDimension,
  type VectorSpaceDimension,
  type VectorValue,
} from '../../domain';
import {
  ShareUrlBuildError,
  buildShareUrl,
  createShareQrCodeDataUrl,
  createShareQrCodeFileName,
  createShareTextFileContents,
  createShareTextFileName,
  type BasisRepresentation,
  type SharedCameraState,
} from '../../sharing';
import {
  parallelSnapDistanceForViewWidth,
  parseCoordinateInput,
  snapTargetToSelectedSpan,
  type TargetSnapKind,
} from '../../state';
import { VectorPlane2D } from '../../visualization/VectorPlane2D';
import { VectorLine1D } from '../../visualization/VectorLine1D';
import { ZeroSpace0D } from '../../visualization/ZeroSpace0D';
import {
  createAutoFitLineViewport,
  zoomLineViewportAtCenter,
  type LineViewport,
} from '../../visualization/lineGeometry';
import {
  DEFAULT_PLANE_VIEWPORT,
  createAutoFitViewport,
  type PlaneViewport,
} from '../../visualization/planeGeometry';
import { LabActionControls } from '../../app/LabActionControls';
import {
  createCoordinateDrafts,
  createDefaultBasisScene,
  moveBasisCandidate,
  toggleBasisCandidate,
  updateBasisTarget,
  updateBasisVectorCoordinates,
  updateBasisPlaneVectorDrag,
  type BasisDimensionScene,
} from './basisDimensionState';
import {
  createBasisDimensionInitialization,
  createBasisDimensionShareState,
} from './basisDimensionInitialization';

const VectorSpace3D = lazy(async () => {
  const module = await import('../../visualization/VectorSpace3D');
  return { default: module.VectorSpace3D };
});

const VECTOR_COLORS = [
  '#d95838',
  '#0f8b82',
  '#7257b2',
  '#c98b19',
  '#2f6690',
  '#a64b78',
  '#4c7a3e',
  '#86553c',
] as const;

const DIMENSION_TABS = [
  { dimension: 0 as const, label: '0次元', shortLabel: '0D' },
  { dimension: 1 as const, label: '1次元', shortLabel: '1D' },
  { dimension: 2 as const, label: '2次元', shortLabel: '2D' },
  { dimension: 3 as const, label: '3次元', shortLabel: '3D' },
];

const POLYNOMIAL_AXIS_LABELS_3D = ['b₀', 'b₁', 'b₂'] as const;

const BASIS_INSPECTOR_TABS = [
  { id: 'vectors', label: '全ベクトルの集合', shortLabel: '成分' },
  { id: 'polynomial', label: '多項式と係数ベクトル', shortLabel: '多項式' },
  { id: 'basis', label: '基底・次元の判定', shortLabel: '判定' },
  { id: 'combination', label: '一次結合', shortLabel: '一次結合' },
] as const;

type BasisInspectorTabId = typeof BASIS_INSPECTOR_TABS[number]['id'];
type BasisLabDimension = VectorSpaceDimension;
type ShareFeedback = {
  readonly kind: 'success' | 'error';
  readonly message: string;
} | null;

interface BasisDimensionLabProps {
  readonly active: boolean;
}

export function BasisDimensionLab({ active }: BasisDimensionLabProps) {
  const [initialization] = useState(() => createBasisDimensionInitialization(window.location.href));
  const initial2DState = initialization.initialStates[2];
  const initial3DState = initialization.initialStates[3];
  const initial0DScene = createDefaultBasisScene(0);
  const initial1DScene = createDefaultBasisScene(1);
  const [activeDimension, setActiveDimension] = useState<BasisLabDimension>(
    initialization.activeDimension,
  );
  const [representations, setRepresentations] = useState<
    Record<BasisLabDimension, BasisRepresentation>
  >({
    0: 'coordinate',
    1: 'coordinate',
    2: initial2DState.representation,
    3: initial3DState.representation,
  });
  const [linearCombinationVisibility, setLinearCombinationVisibility] = useState<
    Record<BasisLabDimension, boolean>
  >({
    0: false,
    1: false,
    2: initial2DState.linearCombinationVisible,
    3: initial3DState.linearCombinationVisible,
  });
  const [scenes, setScenes] = useState<Record<BasisLabDimension, BasisDimensionScene>>({
    0: initial0DScene,
    1: initial1DScene,
    2: initial2DState.scene,
    3: initial3DState.scene,
  });
  const [coordinateDrafts, setCoordinateDrafts] = useState<
    Record<BasisLabDimension, Readonly<Record<string, readonly string[]>>>
  >({
    0: {},
    1: createCoordinateDrafts(initial1DScene.vectors),
    2: createCoordinateDrafts(initial2DState.scene.vectors),
    3: createCoordinateDrafts(initial3DState.scene.vectors),
  });
  const [targetDrafts, setTargetDrafts] = useState<Record<BasisLabDimension, readonly string[]>>({
    0: [],
    1: createBasisTargetDrafts(initial1DScene),
    2: createBasisTargetDrafts(initial2DState.scene),
    3: createBasisTargetDrafts(initial3DState.scene),
  });
  const [comparisonBasisIds, setComparisonBasisIds] = useState<
    Record<BasisLabDimension, readonly string[] | null>
  >({
    0: null,
    1: null,
    2: initial2DState.comparisonBasisIds,
    3: initial3DState.comparisonBasisIds,
  });
  const [activeInspectorTabs, setActiveInspectorTabs] = useState<
    Record<BasisLabDimension, BasisInspectorTabId>
  >({
    0: 'basis',
    1: 'vectors',
    2: initial2DState.linearCombinationVisible ? 'combination' : 'vectors',
    3: initial3DState.linearCombinationVisible ? 'combination' : 'vectors',
  });
  const [planeViewport, setPlaneViewport] = useState<PlaneViewport>(() => (
    initialization.source === 'shared' && initialization.activeDimension === 2
      ? createBasisAutoFitViewport(
          initial2DState.scene,
          initial2DState.linearCombinationVisible,
        )
      : DEFAULT_PLANE_VIEWPORT
  ));
  const [parallelSnapTargetId, setParallelSnapTargetId] = useState<string | null>(null);
  const [targetSnapKind, setTargetSnapKind] = useState<TargetSnapKind>(null);
  const [lineViewport, setLineViewport] = useState<LineViewport>(() => (
    createBasisAutoFitLineViewport(initial1DScene, false)
  ));
  const [camera, setCamera] = useState<SharedCameraState>(initial3DState.camera);
  const [spaceResetKey, setSpaceResetKey] = useState(0);
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
  const scene = scenes[activeDimension];
  const representation = representations[activeDimension];
  const polynomialMode = representation === 'polynomial';
  const linearCombinationVisible = linearCombinationVisibility[activeDimension];
  const availableInspectorTabs = BASIS_INSPECTOR_TABS.filter((tab) => (
    (tab.id !== 'polynomial' || polynomialMode)
    && (tab.id !== 'combination' || linearCombinationVisible)
  ));
  const analysis = useMemo(
    () => analyzeBasisCandidate(scene, scene.candidateVectorIds),
    [scene],
  );
  const candidateVectors = useMemo(
    () => resolveVectors(scene.vectors, scene.candidateVectorIds),
    [scene],
  );
  const coordinateAnalysis = useMemo(
    () => scene.target
      ? analyzeBasisCoordinates(scene, scene.candidateVectorIds, scene.target)
      : null,
    [scene],
  );
  const comparisonAnalysis = useMemo(() => {
    const ids = comparisonBasisIds[activeDimension];
    return ids && scene.target ? analyzeBasisCoordinates(scene, ids, scene.target) : null;
  }, [activeDimension, comparisonBasisIds, scene]);
  const invalidDraftCount = useMemo(() => {
    const vectorIssueCount = Object.values(coordinateDrafts[activeDimension])
      .flat()
      .filter((draft) => !parseCoordinateInput(draft).ok).length;
    const activeTargetDrafts = targetDrafts[activeDimension];
    const targetIssueCount = linearCombinationVisible
      && activeTargetDrafts.some((draft) => draft.trim().length > 0)
      ? activeTargetDrafts.filter((draft) => !parseCoordinateInput(draft).ok).length
      : 0;
    return vectorIssueCount + targetIssueCount;
  }, [activeDimension, coordinateDrafts, linearCombinationVisible, targetDrafts]);
  const hasInvalidCoordinateDraft = invalidDraftCount > 0;

  function updateScene(
    dimension: BasisLabDimension,
    update: (current: BasisDimensionScene) => BasisDimensionScene,
  ): void {
    setScenes((current) => ({ ...current, [dimension]: update(current[dimension]) }));
  }

  function handleDimensionChange(dimension: BasisLabDimension): void {
    setParallelSnapTargetId(null);
    setTargetSnapKind(null);
    setActiveDimension(dimension);
  }

  function handleDimensionTabKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>): void {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
      return;
    }
    event.preventDefault();
    const currentIndex = DIMENSION_TABS.findIndex((tab) => tab.dimension === activeDimension);
    const nextIndex = event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? DIMENSION_TABS.length - 1
        : event.key === 'ArrowRight'
          ? (currentIndex + 1) % DIMENSION_TABS.length
          : (currentIndex - 1 + DIMENSION_TABS.length) % DIMENSION_TABS.length;
    const nextDimension = DIMENSION_TABS[nextIndex].dimension;
    handleDimensionChange(nextDimension);
    document.getElementById(`basis-dimension-tab-${nextDimension}`)?.focus();
  }

  function setActiveInspectorTab(tab: BasisInspectorTabId): void {
    setActiveInspectorTabs((current) => ({ ...current, [activeDimension]: tab }));
  }

  function setRepresentation(nextRepresentation: BasisRepresentation): void {
    setRepresentations((current) => ({
      ...current,
      [activeDimension]: nextRepresentation,
    }));
    if (nextRepresentation === 'coordinate' && activeInspectorTabs[activeDimension] === 'polynomial') {
      setActiveInspectorTab('vectors');
    }
  }

  function handleLinearCombinationVisibility(): void {
    const nextVisible = !linearCombinationVisible;
    setLinearCombinationVisibility((current) => ({
      ...current,
      [activeDimension]: nextVisible,
    }));
    setTargetSnapKind(null);
    setActiveInspectorTabs((current) => ({
      ...current,
      [activeDimension]: nextVisible
        ? 'combination'
        : current[activeDimension] === 'combination'
          ? 'basis'
          : current[activeDimension],
    }));
  }

  function handleInspectorTabKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>): void {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
      return;
    }
    event.preventDefault();
    const activeTab = activeInspectorTabs[activeDimension];
    const currentIndex = availableInspectorTabs.findIndex((tab) => tab.id === activeTab);
    const nextIndex = event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? availableInspectorTabs.length - 1
        : event.key === 'ArrowRight'
          ? (currentIndex + 1) % availableInspectorTabs.length
          : (currentIndex - 1 + availableInspectorTabs.length) % availableInspectorTabs.length;
    const nextTab = availableInspectorTabs[nextIndex];
    setActiveInspectorTab(nextTab.id);
    document.getElementById(`basis-inspector-tab-${nextTab.id}`)?.focus();
  }

  function handleCandidateToggle(vectorId: string): void {
    updateScene(activeDimension, (current) => ({
      ...current,
      candidateVectorIds: toggleBasisCandidate(current.candidateVectorIds, vectorId),
    }));
  }

  function handleCandidateMove(vectorId: string, offset: -1 | 1): void {
    updateScene(activeDimension, (current) => ({
      ...current,
      candidateVectorIds: moveBasisCandidate(current.candidateVectorIds, vectorId, offset),
    }));
  }

  function commitVectorCoordinates(vectorId: string, coordinates: readonly number[]): void {
    updateScene(activeDimension, (current) =>
      updateBasisVectorCoordinates(current, vectorId, coordinates));
    setCoordinateDrafts((current) => ({
      ...current,
      [activeDimension]: {
        ...current[activeDimension],
        [vectorId]: coordinates.map(formatCoordinate),
      },
    }));
  }

  function handlePlaneVectorDrag(
    vectorId: string,
    coordinates: readonly [number, number],
  ): void {
    const result = updateBasisPlaneVectorDrag(
      scenes[2],
      vectorId,
      coordinates,
      planeViewport.maxX - planeViewport.minX,
    );
    setScenes((current) => ({ ...current, 2: result.scene }));
    setCoordinateDrafts((current) => ({
      ...current,
      2: {
        ...current[2],
        [vectorId]: result.coordinates.map(formatCoordinate),
      },
    }));
    setParallelSnapTargetId(result.snapTargetVectorId);
  }

  function handleLineVectorDrag(vectorId: string, coordinates: readonly [number]): void {
    commitVectorCoordinates(vectorId, coordinates);
  }

  function handleCoordinateChange(vectorId: string, coordinateIndex: number, value: string): void {
    const nextDrafts = [...(coordinateDrafts[activeDimension][vectorId] ?? [])];
    nextDrafts[coordinateIndex] = value;
    setCoordinateDrafts((current) => ({
      ...current,
      [activeDimension]: { ...current[activeDimension], [vectorId]: nextDrafts },
    }));

    const parsed = nextDrafts.map(parseCoordinateInput);
    if (parsed.every((result) => result.ok)) {
      updateScene(activeDimension, (current) => updateBasisVectorCoordinates(
        current,
        vectorId,
        parsed.map((result) => result.ok ? result.value : 0),
      ));
    }
  }

  function handleCoordinateBlur(vector: VectorValue, coordinateIndex: number): void {
    const draft = coordinateDrafts[activeDimension][vector.id]?.[coordinateIndex] ?? '';
    if (parseCoordinateInput(draft).ok) {
      return;
    }
    const nextDrafts = [...(coordinateDrafts[activeDimension][vector.id] ?? [])];
    nextDrafts[coordinateIndex] = formatCoordinate(vector.coordinates[coordinateIndex]);
    setCoordinateDrafts((current) => ({
      ...current,
      [activeDimension]: { ...current[activeDimension], [vector.id]: nextDrafts },
    }));
  }

  function commitTarget(target: readonly number[]): void {
    updateScene(activeDimension, (current) => updateBasisTarget(current, target));
    setTargetDrafts((current) => ({
      ...current,
      [activeDimension]: target.map(formatCoordinate),
    }));
  }

  function updatePlaneTargetFromPointer(coordinates: readonly [number, number]): void {
    const snapResult = snapTargetToSelectedSpan(
      coordinates,
      candidateVectors,
      analysis.candidateRank,
      parallelSnapDistanceForViewWidth(planeViewport.maxX - planeViewport.minX),
    );
    commitTarget(snapResult.coordinates);
    setTargetSnapKind(snapResult.snapKind);
  }

  function handlePlaneTargetPlacement(coordinates: readonly [number, number]): void {
    updatePlaneTargetFromPointer(coordinates);
    setTargetSnapKind(null);
  }

  function handleLineTargetChange(coordinate: number): void {
    commitTarget([coordinate]);
  }

  function handleTargetCoordinateChange(coordinateIndex: number, value: string): void {
    const nextDrafts = [...targetDrafts[activeDimension]];
    nextDrafts[coordinateIndex] = value;
    setTargetDrafts((current) => ({ ...current, [activeDimension]: nextDrafts }));
    if (nextDrafts.every((draft) => draft.trim().length === 0)) {
      updateScene(activeDimension, (current) => ({ ...current, target: null }));
      return;
    }
    const parsed = nextDrafts.map(parseCoordinateInput);
    if (parsed.every((result) => result.ok)) {
      updateScene(activeDimension, (current) => updateBasisTarget(
        current,
        parsed.map((result) => result.ok ? result.value : 0),
      ));
    }
  }

  function handleTargetCoordinateBlur(coordinateIndex: number): void {
    const draft = targetDrafts[activeDimension][coordinateIndex] ?? '';
    if (parseCoordinateInput(draft).ok) {
      return;
    }
    const nextDrafts = [...targetDrafts[activeDimension]];
    nextDrafts[coordinateIndex] = scene.target
      ? formatCoordinate(scene.target[coordinateIndex])
      : '';
    setTargetDrafts((current) => ({ ...current, [activeDimension]: nextDrafts }));
  }

  function handleClearTarget(): void {
    updateScene(activeDimension, (current) => ({ ...current, target: null }));
    setTargetDrafts((current) => ({
      ...current,
      [activeDimension]: Array.from({ length: activeDimension }, () => ''),
    }));
    setTargetSnapKind(null);
  }

  function saveComparisonBasis(): void {
    setComparisonBasisIds((current) => ({
      ...current,
      [activeDimension]: [...scene.candidateVectorIds],
    }));
  }

  function handleReset(): void {
    if (activeDimension === 0 || activeDimension === 1) {
      const resetScene = createDefaultBasisScene(activeDimension);
      setScenes((current) => ({ ...current, [activeDimension]: resetScene }));
      setCoordinateDrafts((current) => ({
        ...current,
        [activeDimension]: createCoordinateDrafts(resetScene.vectors),
      }));
      setTargetDrafts((current) => ({
        ...current,
        [activeDimension]: createBasisTargetDrafts(resetScene),
      }));
      setComparisonBasisIds((current) => ({ ...current, [activeDimension]: null }));
      setActiveInspectorTabs((current) => ({
        ...current,
        [activeDimension]: activeDimension === 0 ? 'basis' : 'vectors',
      }));
      setRepresentations((current) => ({ ...current, [activeDimension]: 'coordinate' }));
      setLinearCombinationVisibility((current) => ({ ...current, [activeDimension]: false }));
      if (activeDimension === 1) {
        setLineViewport(createBasisAutoFitLineViewport(resetScene, false));
      }
      setExportErrorMessage(null);
      setTargetSnapKind(null);
      return;
    }

    const initialState = initialization.initialStates[activeDimension];
    const resetScene = initialState.scene;
    setScenes((current) => ({ ...current, [activeDimension]: resetScene }));
    setCoordinateDrafts((current) => ({
      ...current,
      [activeDimension]: createCoordinateDrafts(resetScene.vectors),
    }));
    setTargetDrafts((current) => ({
      ...current,
      [activeDimension]: createBasisTargetDrafts(resetScene),
    }));
    setComparisonBasisIds((current) => ({
      ...current,
      [activeDimension]: initialState.comparisonBasisIds,
    }));
    setActiveInspectorTabs((current) => ({
      ...current,
      [activeDimension]: initialState.linearCombinationVisible ? 'combination' : 'vectors',
    }));
    setRepresentations((current) => ({
      ...current,
      [activeDimension]: initialState.representation,
    }));
    setLinearCombinationVisibility((current) => ({
      ...current,
      [activeDimension]: initialState.linearCombinationVisible,
    }));
    if (activeDimension === 2) {
      setPlaneViewport(createBasisAutoFitViewport(
        resetScene,
        initialState.linearCombinationVisible,
      ));
      setParallelSnapTargetId(null);
      setTargetSnapKind(null);
    } else {
      setCamera(initialState.camera);
      setSpaceResetKey((current) => current + 1);
    }
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
    if (hasInvalidCoordinateDraft || activeDimension <= 1) {
      return;
    }

    try {
      const shareScene: BasisDimensionScene<VectorDimension> = activeDimension === 2
        ? { ...scenes[2], dimension: 2 }
        : { ...scenes[3], dimension: 3 };
      const nextShareUrl = buildShareUrl(window.location.href, createBasisDimensionShareState({
        scene: shareScene,
        representation: representations[activeDimension],
        linearCombinationVisible: linearCombinationVisibility[activeDimension],
        comparisonBasisIds: comparisonBasisIds[activeDimension],
        camera,
      }));
      const requestId = shareQrCodeRequestIdRef.current + 1;
      shareQrCodeRequestIdRef.current = requestId;
      setShareUrl(nextShareUrl);
      setShareQrCodeDataUrl('');
      setShareQrCodeErrorMessage(null);
      setIsShareQrCodeLoading(true);
      setShareFeedback(null);
      setExportErrorMessage(null);
      shareDialogRef.current?.showModal();
      void createShareQrCodeDataUrl(nextShareUrl)
        .then((dataUrl) => {
          if (shareQrCodeRequestIdRef.current === requestId) {
            setShareQrCodeDataUrl(dataUrl);
            setIsShareQrCodeLoading(false);
          }
        })
        .catch((error: unknown) => {
          if (shareQrCodeRequestIdRef.current !== requestId) {
            return;
          }
          setShareQrCodeErrorMessage(error instanceof Error
            ? error.message
            : '共有URLからQRコードを生成できませんでした。');
          setIsShareQrCodeLoading(false);
        });
      window.requestAnimationFrame(() => {
        shareUrlFieldRef.current?.focus();
        shareUrlFieldRef.current?.select();
      });
    } catch (error) {
      setExportErrorMessage(error instanceof ShareUrlBuildError
        ? error.message
        : '共有URLを生成できませんでした。入力内容を確認してください。');
    }
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
    downloadBlobUrl(URL.createObjectURL(blob), createShareTextFileName(), true);
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
    downloadBlobUrl(shareQrCodeDataUrl, createShareQrCodeFileName(), false);
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

  return (
    <div className="basis-dimension-lab" data-lab-id="basis-dimension">
      <a className="skip-link" href={`#basis-dimension-panel-${activeDimension}`}>
        基底候補の操作領域へ移動
      </a>
      <main className="lab-page">
        <nav className="dimension-switcher" aria-label="基底・次元Labの次元">
          <div className="dimension-tablist" role="tablist" aria-label="0D・1D・2D・3Dの切替">
            {DIMENSION_TABS.map((tab) => (
              <button
                key={tab.dimension}
                id={`basis-dimension-tab-${tab.dimension}`}
                type="button"
                role="tab"
                aria-selected={activeDimension === tab.dimension}
                aria-controls={`basis-dimension-panel-${tab.dimension}`}
                tabIndex={activeDimension === tab.dimension ? 0 : -1}
                onClick={() => handleDimensionChange(tab.dimension)}
                onKeyDown={handleDimensionTabKeyDown}
              >
                <span className="dimension-tab-label-wide">{tab.label}</span>
                <span className="dimension-tab-label-short">{tab.shortLabel}</span>
              </button>
            ))}
          </div>
          {activeDimension > 0 ? (
            <div className="basis-representation-switcher" role="group" aria-label="対象の見方">
              <span>対象の見方</span>
              <button
                type="button"
                aria-pressed={!polynomialMode}
                onClick={() => setRepresentation('coordinate')}
              >数ベクトル</button>
              <button
                type="button"
                aria-pressed={polynomialMode}
                onClick={() => setRepresentation('polynomial')}
              >多項式</button>
            </div>
          ) : null}
          <p aria-live="polite">
            {activeDimension === 0
              ? '零ベクトルだけからなる空間と、ベクトルを1本も含まない空の基底を調べています。'
              : polynomialMode
              ? `高々${activeDimension - 1}次の実数係数多項式を、${activeDimension}個の係数で調べています。`
              : `${activeDimension}次元の数ベクトルとして基底候補と座標を調べています。`}
          </p>
        </nav>

        <section className="lab-intro" aria-labelledby="basis-dimension-title">
          <div>
            <p className="eyebrow">
              基底・次元 / {activeDimension === 0
                ? '0D'
                : polynomialMode
                ? <MathPolynomialSpace degree={activeDimension - 1} />
                : `${activeDimension}D`}
            </p>
            <h1 id="basis-dimension-title">基底を選んで、座標を読み解く。</h1>
          </div>
          <div className="lab-intro-side">
            <p className="lab-intro-copy">
              {activeDimension === 0 ? (
                <>
                  零ベクトル空間 <MathSpaceName /> = &#123;<MathVectorName name="0" />&#125; では、
                  ベクトルを1本も含まない空の組が基底になります。2つの基底条件から次元0の意味を確かめます。
                </>
              ) : polynomialMode ? (
                <>
                  集合 <MathSetName /> の多項式をベクトルとして扱い、順序付きの基底候補 <MathBasisName /> を選びます。
                  係数ベクトルとの対応から、基底と座標の関係を調べます。
                  {linearCombinationVisible
                    ? <> 配置したターゲット <MathVectorName name="v" /> = <MathFunctionName target /> の一次結合を確認できます。</>
                    : null}
                </>
              ) : (
                <>
                  集合 <MathSetName /> のベクトルから順序付きの基底候補 <MathBasisName /> を選びます。
                  2つの基底条件を確かめ、基底の選び方と順序による違いを比べます。
                  {linearCombinationVisible
                    ? <> 配置したターゲット <MathVectorName name="v" /> の一次結合と座標を確認できます。</>
                    : null}
                </>
              )}
            </p>
            <LabActionControls
              exportDisabled={hasInvalidCoordinateDraft || activeDimension <= 1}
              exportDescriptionId={activeDimension <= 1
                ? 'basis-low-dimensional-share-help'
                : hasInvalidCoordinateDraft
                ? 'basis-share-disabled-help'
                : undefined}
              onExport={handleOpenShareDialog}
              onReset={handleReset}
            />
            {hasInvalidCoordinateDraft ? (
              <p className="lab-action-help" id="basis-share-disabled-help" role="status">
                未確定の成分が{invalidDraftCount}か所あります。訂正すると共有URLを作成できます。
              </p>
            ) : null}
            {activeDimension <= 1 ? (
              <p className="lab-action-help" id="basis-low-dimensional-share-help" role="status">
                0D・1Dの共有URLは、3つのLabの共有形式を更新する10.7で有効になります。
              </p>
            ) : null}
          </div>
        </section>

        {loadErrorMessage ? (
          <div className="page-alert" role="alert" aria-labelledby="basis-load-error-title">
            <div>
              <strong id="basis-load-error-title">共有URLを開けませんでした</strong>
              <p>{loadErrorMessage}</p>
            </div>
            <button type="button" onClick={() => setLoadErrorMessage(null)}>閉じる</button>
          </div>
        ) : null}

        {exportErrorMessage ? (
          <div className="page-alert" role="alert" aria-labelledby="basis-export-error-title">
            <div>
              <strong id="basis-export-error-title">共有URLを作成できませんでした</strong>
              <p>{exportErrorMessage}</p>
            </div>
            <button type="button" onClick={() => setExportErrorMessage(null)}>閉じる</button>
          </div>
        ) : null}

        <div
          className="basis-dimension-workspace"
          id={`basis-dimension-panel-${activeDimension}`}
          role="tabpanel"
          aria-labelledby={`basis-dimension-tab-${activeDimension}`}
          tabIndex={-1}
        >
          {activeDimension === 0 ? (
            <ZeroDimensionalBasisWorkspace />
          ) : (
            <>
          <div className="basis-visual-column">
            {activeDimension === 1 ? (
              <section className="plot-card" aria-labelledby="basis-line-title">
                <div className="card-heading">
                  <div>
                    <p className="panel-kicker">Candidate span</p>
                    <h2 id="basis-line-title">
                      {polynomialMode
                        ? '基底候補の係数が生成する係数空間'
                        : '基底候補の数ベクトルが生成する空間'}
                    </h2>
                  </div>
                  <div className="viewport-toolbar">
                    <button
                      className="target-mode-button"
                      type="button"
                      aria-pressed={linearCombinationVisible}
                      onClick={handleLinearCombinationVisibility}
                    >
                      {linearCombinationVisible ? '一次結合モードを終了' : '一次結合を調べる'}
                    </button>
                    <div className="viewport-controls" role="group" aria-label="数直線の表示範囲">
                      <button
                        type="button"
                        aria-label="縮小して広い範囲を表示"
                        onClick={() => setLineViewport(zoomLineViewportAtCenter(lineViewport, 1.25))}
                      >−</button>
                      <button
                        type="button"
                        aria-label="拡大して狭い範囲を表示"
                        onClick={() => setLineViewport(zoomLineViewportAtCenter(lineViewport, 0.8))}
                      >＋</button>
                      <button
                        className="fit-viewport-button"
                        type="button"
                        onClick={() => setLineViewport(createBasisAutoFitLineViewport(
                          scene,
                          linearCombinationVisible,
                        ))}
                      >全体を表示</button>
                    </div>
                  </div>
                </div>
                <VectorLine1D
                  idPrefix="basis-vector-line"
                  axisLabel={polynomialMode ? 'b₀' : 'x'}
                  vectors={scene.vectors}
                  colors={VECTOR_COLORS}
                  viewport={lineViewport}
                  onViewportChange={setLineViewport}
                  onVectorChange={handleLineVectorDrag}
                  spanDimension={analysis.candidateRank as 0 | 1}
                  showSpan
                  spanVectorIds={scene.candidateVectorIds}
                  spanLabel="基底候補が生成する空間"
                  linearCombinationVisible={linearCombinationVisible}
                  target={scene.target?.[0] ?? null}
                  onTargetPlacement={handleLineTargetChange}
                  onTargetChange={handleLineTargetChange}
                  showViewportControls={false}
                />
                <p className="viewport-help">
                  {polynomialMode
                    ? <>矢印は定数多項式の係数ベクトルです。灰色は基底候補 <MathBasisName /> が生成する係数空間です。</>
                    : <>灰色は基底候補 <MathBasisName /> が生成する空間です。</>}
                  {' '}{linearCombinationVisible
                    ? <>クリックまたはタップでターゲット <MathVectorName name="v" /> を配置し、矢先をドラッグできます。</>
                    : '矢印先端の丸をドラッグすると数ベクトルを変更できます。'}
                </p>
              </section>
            ) : activeDimension === 2 ? (
              <section className="plot-card" aria-labelledby="basis-plane-title">
                <div className="card-heading">
                  <div>
                    <p className="panel-kicker">Candidate span</p>
                    <h2 id="basis-plane-title">
                      {polynomialMode
                        ? '基底候補の係数が生成する係数空間'
                        : '基底候補の数ベクトルが生成する空間'}
                    </h2>
                  </div>
                  <div className="viewport-toolbar">
                    <button
                      className="target-mode-button"
                      type="button"
                      aria-pressed={linearCombinationVisible}
                      onClick={handleLinearCombinationVisibility}
                    >
                      {linearCombinationVisible ? '一次結合モードを終了' : '一次結合を調べる'}
                    </button>
                    <button
                      className="basis-fit-button"
                      type="button"
                      onClick={() => setPlaneViewport(createBasisAutoFitViewport(
                        scene,
                        linearCombinationVisible,
                      ))}
                    >
                      全体を表示
                    </button>
                  </div>
                </div>
                <VectorPlane2D
                  idPrefix="basis-vector-plane"
                  axisLabels={polynomialMode ? ['b₀', 'b₁'] : undefined}
                  vectors={scene.vectors}
                  colors={VECTOR_COLORS}
                  viewport={planeViewport}
                  onViewportChange={setPlaneViewport}
                  onVectorDragStart={() => setParallelSnapTargetId(null)}
                  onVectorChange={handlePlaneVectorDrag}
                  onVectorDragEnd={() => setParallelSnapTargetId(null)}
                  parallelSnapTargetId={parallelSnapTargetId}
                  spanVectors={candidateVectors}
                  spanDimension={analysis.candidateRank}
                  showSpan
                  linearCombinationVisible={linearCombinationVisible}
                  target={scene.target as readonly [number, number] | null}
                  targetSnapKind={targetSnapKind}
                  linearCombinationCoefficients={
                    coordinateAnalysis?.status === 'coordinate-vector'
                    && coordinateAnalysis.coordinateVector?.length === 2
                      ? coordinateAnalysis.coordinateVector as readonly [number, number]
                      : null
                  }
                  onTargetPlacement={handlePlaneTargetPlacement}
                  onTargetDragStart={() => setTargetSnapKind(null)}
                  onTargetChange={updatePlaneTargetFromPointer}
                  onTargetDragEnd={() => setTargetSnapKind(null)}
                />
                <p className="viewport-help">
                  {polynomialMode
                    ? <>矢印は多項式の係数ベクトルです。灰色は基底候補 <MathBasisName /> の多項式が生成する範囲に対応します。</>
                    : <>灰色は基底候補 <MathBasisName /> が生成する空間です。</>}
                  {' '}{linearCombinationVisible
                    ? <>クリックまたはタップでターゲット <MathVectorName name="v" /> を配置し、矢先をドラッグできます。</>
                    : '矢印先端の丸をドラッグすると数ベクトルを変更できます。'}
                </p>
              </section>
            ) : (
              <Suspense fallback={<BasisSpaceLoading />}>
                <VectorSpace3D
                  idPrefix="basis-space-3d"
                  axisLabels={polynomialMode ? POLYNOMIAL_AXIS_LABELS_3D : undefined}
                  spaceTitle={polynomialMode ? '3次元係数空間' : undefined}
                  vectors={scene.vectors}
                  colors={VECTOR_COLORS}
                  spanVectors={candidateVectors}
                  spanRank={analysis.candidateRank}
                  showSpan
                  linearCombinationVisible={linearCombinationVisible}
                  linearCombinationTarget={scene.target as readonly [number, number, number] | null}
                  linearCombinationCoefficients={
                    coordinateAnalysis?.status === 'coordinate-vector'
                      ? coordinateAnalysis.coordinateVector
                      : null
                  }
                  active={active && activeDimension === 3}
                  resetKey={spaceResetKey}
                  camera={camera}
                  onCameraChange={setCamera}
                  onVectorCoordinatesCommit={commitVectorCoordinates}
                  onLinearCombinationTargetPlacement={commitTarget}
                  onLinearCombinationVisibility={handleLinearCombinationVisibility}
                  assistiveDescription={polynomialMode
                    ? '3D矢印は高々2次多項式の定数項、xの係数、xの2乗の係数を表す係数ベクトルです。多項式、候補の判定、ターゲットの座標は、この後のカードでも確認できます。'
                    : 'ベクトルの座標、候補の一次独立性、生成条件、ターゲットの座標ベクトルは、この後の数値入力と判定カードでも確認できます。3D表示を利用できない場合も、候補選択、数値入力、座標判定、Resetは利用できます。'}
                  unavailableFallbackDescription="候補選択、数値入力、基底と座標の判定カード、Resetはそのまま利用できます。"
                />
              </Suspense>
            )}

          </div>

          <aside className="basis-analysis-column" aria-label="基底候補の選択、判定、座標の比較">
            <CandidateSelector
              vectors={scene.vectors}
              candidateVectorIds={scene.candidateVectorIds}
              polynomialMode={polynomialMode}
              onToggle={handleCandidateToggle}
              onMove={handleCandidateMove}
            />
            <div className="inspector-tablist basis-inspector-tablist" role="tablist" aria-label="基底・次元Labの編集・解析の詳細">
              {availableInspectorTabs.map((tab) => (
                <button
                  key={tab.id}
                  id={`basis-inspector-tab-${tab.id}`}
                  type="button"
                  role="tab"
                  aria-selected={activeInspectorTabs[activeDimension] === tab.id}
                  aria-controls={`basis-inspector-panel-${tab.id}`}
                  tabIndex={activeInspectorTabs[activeDimension] === tab.id ? 0 : -1}
                  onClick={() => setActiveInspectorTab(tab.id)}
                  onKeyDown={handleInspectorTabKeyDown}
                >
                  <span className="tab-label-wide">{tab.label}</span>
                  <span className="tab-label-short">{tab.shortLabel}</span>
                </button>
              ))}
            </div>

            <VectorSourceEditor
              scene={scene}
              drafts={coordinateDrafts[activeDimension]}
              polynomialMode={polynomialMode}
              active={activeInspectorTabs[activeDimension] === 'vectors'}
              onCoordinateChange={handleCoordinateChange}
              onCoordinateBlur={handleCoordinateBlur}
            />
            {polynomialMode ? (
              <PolynomialCorrespondenceCard
                scene={scene}
                active={activeInspectorTabs[activeDimension] === 'polynomial'}
                showTarget={linearCombinationVisible}
              />
            ) : null}
            <BasisAnalysisCard
              scene={scene}
              analysis={analysis}
              polynomialMode={polynomialMode}
              active={activeInspectorTabs[activeDimension] === 'basis'}
            />
            <CoordinateExplorerCard
              scene={scene}
              analysis={coordinateAnalysis}
              targetDrafts={targetDrafts[activeDimension]}
              comparisonBasisIds={comparisonBasisIds[activeDimension]}
              comparisonAnalysis={comparisonAnalysis}
              polynomialMode={polynomialMode}
              onTargetCoordinateChange={handleTargetCoordinateChange}
              onTargetCoordinateBlur={handleTargetCoordinateBlur}
              onClearTarget={handleClearTarget}
              onSaveComparisonBasis={saveComparisonBasis}
              active={linearCombinationVisible
                && activeInspectorTabs[activeDimension] === 'combination'}
            />
          </aside>
            </>
          )}
        </div>
      </main>

      <dialog
        className="share-dialog"
        ref={shareDialogRef}
        aria-labelledby="basis-share-dialog-title"
        aria-describedby="basis-share-dialog-description"
        onClick={handleShareDialogClick}
        onClose={() => setShareFeedback(null)}
      >
        <div className="share-dialog-content">
          <p className="panel-kicker">Export current state</p>
          <h2 id="basis-share-dialog-title">共有URLをエクスポート</h2>
          <p className="share-dialog-description" id="basis-share-dialog-description">
            このURLを開くと、次元、全ベクトル、順序付き基底候補、対象の見方、一次結合のターゲット、比較用基底が復元されます。
            {activeDimension === 2
              ? '表示範囲は教材状態全体が見えるように自動調整されます。'
              : '3Dではカメラの向き、注視点、拡大率も復元されます。'}
          </p>
          <section
            className={`share-qr-code ${shareQrCodeErrorMessage ? 'has-error' : ''}`}
            aria-labelledby="basis-share-qr-code-title"
            aria-busy={isShareQrCodeLoading}
          >
            <h3 id="basis-share-qr-code-title">共有URLのQRコード</h3>
            <div className="share-qr-code-frame">
              {shareQrCodeDataUrl ? (
                <img
                  src={shareQrCodeDataUrl}
                  alt="現在の基底・次元Lab共有URLを表すQRコード"
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
              aria-describedby="basis-share-dialog-description basis-share-dialog-feedback"
              onFocus={(event) => event.currentTarget.select()}
            />
          </label>
          <p
            className={`share-feedback ${shareFeedback?.kind === 'error' ? 'has-error' : ''}`}
            id="basis-share-dialog-feedback"
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
            <button type="button" onClick={handleCloseShareDialog}>閉じる</button>
          </div>
        </div>
      </dialog>
    </div>
  );
}

function PolynomialCorrespondenceCard({
  scene,
  active,
  showTarget,
}: {
  readonly scene: BasisDimensionScene;
  readonly active: boolean;
  readonly showTarget: boolean;
}) {
  const standardBasis = Array.from({ length: scene.dimension }, (_, degree) => (
    degree === 0 ? '1' : degree === 1 ? 'x' : `x${degree}`
  ));
  const genericCoefficients = Array.from(
    { length: scene.dimension },
    (_, degree) => degree,
  );

  return (
    <section
      className="basis-polynomial-card inspector-panel"
      id="basis-inspector-panel-polynomial"
      role="tabpanel"
      aria-labelledby="basis-inspector-tab-polynomial basis-polynomial-title"
      hidden={!active}
    >
      <p className="panel-kicker">Polynomial view</p>
      <h2 id="basis-polynomial-title">多項式と係数ベクトル</h2>
      <div className="basis-polynomial-summary">
        <p>
          <MathSpaceName /> = <MathPolynomialSpace degree={scene.dimension - 1} />
        </p>
        <p>
          <strong>標準基底：</strong>
          <MathPolynomialTuple terms={standardBasis} />
        </p>
        <p className="basis-polynomial-mapping">
          <MathFunctionName /> = <GenericPolynomial dimension={scene.dimension} />
          <span aria-hidden="true"> ⇔ </span>
          <MathSymbolicTransposedRowVector degrees={genericCoefficients} />
          <span> ∈ </span><MathRealCoordinateSpace dimension={scene.dimension} />
        </p>
      </div>
      <div className="basis-polynomial-list">
        {scene.vectors.map((vector, index) => (
          <PolynomialVectorIdentity key={vector.id} vector={vector} functionIndex={index + 1} />
        ))}
        {showTarget && scene.target ? <PolynomialTargetIdentity target={scene.target} /> : null}
      </div>
      <p className="basis-card-note">
        係数を定数項から昇べき順に並べれば、数ベクトル版と同じrank・基底・座標の計算を使えます。
      </p>
    </section>
  );
}

function VectorSourceEditor({
  scene,
  drafts,
  polynomialMode,
  active,
  onCoordinateChange,
  onCoordinateBlur,
}: {
  readonly scene: BasisDimensionScene;
  readonly drafts: Readonly<Record<string, readonly string[]>>;
  readonly polynomialMode: boolean;
  readonly active: boolean;
  readonly onCoordinateChange: (vectorId: string, index: number, value: string) => void;
  readonly onCoordinateBlur: (vector: VectorValue, index: number) => void;
}) {
  return (
    <section
      className="basis-source-card inspector-panel"
      id="basis-inspector-panel-vectors"
      role="tabpanel"
      aria-labelledby="basis-inspector-tab-vectors basis-source-title"
      hidden={!active}
    >
      <p className="panel-kicker">Vector set</p>
      <h2 id="basis-source-title">
        {polynomialMode ? '全多項式の集合 ' : '全ベクトルの集合 '}<MathSetName />
      </h2>
      <div className="basis-vector-input-grid">
        {scene.vectors.map((vector, vectorIndex) => (
          <div className="basis-vector-input" key={vector.id}>
            <span className="basis-vector-number" style={{ background: VECTOR_COLORS[vectorIndex] }}>
              {vectorIndex + 1}
            </span>
            <MathVectorName name={vector.name} />
            <span aria-hidden="true">=</span>
            <span
              className="basis-coordinate-inputs"
              aria-label={polynomialMode ? `f${vectorIndex + 1}(x)の係数` : `${vector.name}の成分`}
            >
              {vector.coordinates.map((coordinate, coordinateIndex) => {
                const draft = drafts[vector.id]?.[coordinateIndex] ?? formatCoordinate(coordinate);
                const valid = parseCoordinateInput(draft).ok;
                return (
                  <input
                    key={coordinateIndex}
                    value={draft}
                    inputMode="decimal"
                    aria-label={polynomialMode
                      ? `f${vectorIndex + 1}(x)の${polynomialCoefficientLabel(coordinateIndex)}`
                      : `${vector.name}の第${coordinateIndex + 1}成分`}
                    aria-invalid={!valid}
                    onChange={(event) =>
                      onCoordinateChange(vector.id, coordinateIndex, event.target.value)}
                    onBlur={() => onCoordinateBlur(vector, coordinateIndex)}
                  />
                );
              })}
            </span>
            {polynomialMode ? (
              <span className="basis-polynomial-preview">
                <PolynomialVectorIdentity vector={vector} functionIndex={vectorIndex + 1} />
              </span>
            ) : null}
          </div>
        ))}
      </div>
      <p className="basis-card-note">
        {polynomialMode
          ? '係数は定数項から昇べき順です。係数を変えると、多項式と候補の判定を同時に再計算します。'
          : '成分を変えると、対象空間と候補の判定を同時に再計算します。'}
      </p>
    </section>
  );
}

function CandidateSelector({
  vectors,
  candidateVectorIds,
  polynomialMode,
  onToggle,
  onMove,
}: {
  readonly vectors: readonly VectorValue[];
  readonly candidateVectorIds: readonly string[];
  readonly polynomialMode: boolean;
  readonly onToggle: (vectorId: string) => void;
  readonly onMove: (vectorId: string, offset: -1 | 1) => void;
}) {
  return (
    <section className="basis-candidate-card" aria-labelledby="basis-candidate-title">
      <p className="panel-kicker">Ordered candidate</p>
      <h2 id="basis-candidate-title">基底候補 <MathBasisName /></h2>
      <div className="basis-tuple" aria-live="polite">
        <p><MathSetName /> = <VectorCollection vectors={vectors} /></p>
        <p><MathBasisName /> = <VectorTuple ids={candidateVectorIds} vectors={vectors} /></p>
      </div>
      <div className="basis-candidate-options">
        {vectors.map((vector, vectorIndex) => {
          const orderIndex = candidateVectorIds.indexOf(vector.id);
          const selected = orderIndex >= 0;
          return (
            <div className={`basis-candidate-option ${selected ? 'is-selected' : ''}`} key={vector.id}>
              <label>
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => onToggle(vector.id)}
                />
                <MathVectorName name={vector.name} />
                <small className="basis-candidate-coordinates">
                  {polynomialMode
                    ? <><MathFunctionName index={vectorIndex + 1} /> = <MathPolynomial coefficients={vector.coordinates} /></>
                    : <MathTransposedRowVector values={vector.coordinates.map(formatCoordinate)} />}
                </small>
              </label>
              {selected ? (
                <div className="basis-order-controls" aria-label={`${vector.name}の候補内の順序`}>
                  <span>{orderIndex + 1}番目</span>
                  <button
                    type="button"
                    aria-label={`${vector.name}を前へ移動`}
                    disabled={orderIndex === 0}
                    onClick={() => onMove(vector.id, -1)}
                  >↑</button>
                  <button
                    type="button"
                    aria-label={`${vector.name}を後ろへ移動`}
                    disabled={orderIndex === candidateVectorIds.length - 1}
                    onClick={() => onMove(vector.id, 1)}
                  >↓</button>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      <p className="basis-card-note">
        基底は集合ではなく順序付きの組です。矢印で順序を変更できます。
        {polynomialMode ? ' 多項式もベクトルであり、係数に同じ判定を適用します。' : ''}
      </p>
    </section>
  );
}

function BasisAnalysisCard({
  scene,
  analysis,
  polynomialMode,
  active,
}: {
  readonly scene: BasisDimensionScene;
  readonly analysis: BasisCandidateAnalysis;
  readonly polynomialMode: boolean;
  readonly active: boolean;
}) {
  return (
    <section
      className={`basis-result-card inspector-panel ${analysis.isBasis ? 'is-basis' : 'is-not-basis'}`}
      id="basis-inspector-panel-basis"
      role="tabpanel"
      aria-labelledby="basis-inspector-tab-basis basis-result-title"
      hidden={!active}
    >
      <p className="panel-kicker">Basis &amp; dimension</p>
      <h2 id="basis-result-title">
        {analysis.isBasis ? 'この候補は基底です' : 'この候補は基底ではありません'}
      </h2>

      <div className="basis-target-summary">
        <p>
          <strong>対象としている空間：</strong>
          <MathSpaceName /> = {polynomialMode
            ? <MathPolynomialSpace degree={scene.dimension - 1} />
            : <MathRealCoordinateSpace dimension={scene.dimension} />}
        </p>
        <p>
          <strong>現在選んでいるベクトルの組：</strong>
          <MathBasisName /> = <VectorTuple ids={scene.candidateVectorIds} vectors={scene.vectors} />
        </p>
      </div>

      <div className="basis-condition-list">
        <ConditionResult
          success={analysis.isLinearlyIndependent}
          title="条件1：一次独立である"
          detail={`候補${analysis.candidateVectorCount}本のrankは${analysis.candidateRank}です。`}
        />
        <ConditionResult
          success={analysis.spansTargetSpace}
          title={<>条件2：対象空間 <MathSpaceName /> を生成する</>}
          detail={`候補のrank ${analysis.candidateRank} と対象のrank ${analysis.sourceRank}を比較します。`}
        />
      </div>

      {!analysis.isBasis ? (
        <ul className="basis-failure-reasons">
          {analysis.failureReasons.includes('linearly-dependent') ? (
            <li>候補に重複する方向があり、一次従属です。</li>
          ) : null}
          {analysis.failureReasons.includes('does-not-span-target') ? (
            <li>候補だけでは対象空間 <MathSpaceName /> 全体を生成できません。</li>
          ) : null}
        </ul>
      ) : null}

      <div className="basis-example">
        <p><strong>基底の一例</strong></p>
        <p><MathBasisName />₀ = <VectorTuple ids={analysis.basisExampleVectorIds} vectors={scene.vectors} /></p>
        <small>
          これは入力順から得た一例です。この例以外にも基底の取り方があり得る可能性があります。
          <MathSetName />から選べる一次独立なベクトルの最大個数は{analysis.maximumIndependentCount}本です。
        </small>
      </div>
    </section>
  );
}

function CoordinateExplorerCard({
  scene,
  analysis,
  targetDrafts,
  comparisonBasisIds,
  comparisonAnalysis,
  polynomialMode,
  onTargetCoordinateChange,
  onTargetCoordinateBlur,
  onClearTarget,
  onSaveComparisonBasis,
  active,
}: {
  readonly scene: BasisDimensionScene;
  readonly analysis: BasisCoordinateAnalysis | null;
  readonly targetDrafts: readonly string[];
  readonly comparisonBasisIds: readonly string[] | null;
  readonly comparisonAnalysis: BasisCoordinateAnalysis | null;
  readonly polynomialMode: boolean;
  readonly onTargetCoordinateChange: (index: number, value: string) => void;
  readonly onTargetCoordinateBlur: (index: number) => void;
  readonly onClearTarget: () => void;
  readonly onSaveComparisonBasis: () => void;
  readonly active: boolean;
}) {
  const coordinateValues = analysis?.coordinateVector?.map(formatCoordinate) ?? [];
  const particularValues = analysis?.combinationAnalysis.particularSolution
    ?.map(formatCoordinate) ?? [];
  const canSaveComparison = analysis?.status === 'coordinate-vector';

  return (
    <section
      className={`basis-coordinate-card inspector-panel is-${analysis?.status ?? 'empty'}`}
      id="basis-inspector-panel-combination"
      role="tabpanel"
      aria-labelledby="basis-inspector-tab-combination basis-coordinate-title"
      hidden={!active}
    >
      <p className="panel-kicker">Linear combination</p>
      <h2 id="basis-coordinate-title">一次結合</h2>
      <p className="basis-coordinate-intro">
        同じターゲット <MathVectorName name="v" />
        {polynomialMode ? <> = <MathFunctionName target /></> : null}
        でも、基底の選び方と順序によって座標ベクトルは変わります。
      </p>

      <div className="basis-target-editor">
        <div>
          <strong>ターゲット</strong>
          <small>グラフ上の矢先ドラッグまたは成分入力で変更できます。</small>
          {polynomialMode && scene.target ? (
            <span className="basis-target-polynomial">
              <MathFunctionName target /> = <MathPolynomial coefficients={scene.target} />
            </span>
          ) : null}
        </div>
        <span className="basis-target-equation">
          <MathVectorName name="v" /><span aria-hidden="true"> = </span>
          <span className="basis-coordinate-inputs" aria-label="ターゲットvの成分">
            {Array.from({ length: scene.dimension }, (_, index) => {
              const coordinate = scene.target?.[index];
              const draft = targetDrafts[index] ?? (coordinate === undefined
                ? ''
                : formatCoordinate(coordinate));
              const valid = draft.trim().length === 0 || parseCoordinateInput(draft).ok;
              return (
                <input
                  key={index}
                  value={draft}
                  inputMode="decimal"
                  aria-label={`ターゲットvの第${index + 1}成分`}
                  aria-invalid={!valid}
                  onChange={(event) => onTargetCoordinateChange(index, event.target.value)}
                  onBlur={() => onTargetCoordinateBlur(index)}
                />
              );
            })}
          </span>
          <button
            className="clear-target-button"
            type="button"
            disabled={!scene.target && targetDrafts.every((draft) => draft.trim().length === 0)}
            onClick={onClearTarget}
          >
            ターゲットを消去
          </button>
        </span>
      </div>

      <div className="basis-coordinate-current" aria-live="polite">
        <p className="basis-coordinate-basis-line">
          <strong>現在の候補：</strong>
          <MathBasisName /> = <VectorTuple ids={scene.candidateVectorIds} vectors={scene.vectors} />
        </p>
        {scene.target && analysis ? (
          <CoordinateResult
            scene={scene}
            target={scene.target}
            analysis={analysis}
            coordinateValues={coordinateValues}
            particularValues={particularValues}
            polynomialMode={polynomialMode}
          />
        ) : (
          <p className="basis-coordinate-empty">
            グラフをクリックまたはタップするか、成分を入力してターゲット <MathVectorName name="v" /> を配置してください。
          </p>
        )}
      </div>

      <div className="basis-coordinate-comparison">
        <div className="basis-comparison-heading">
          <div>
            <strong>別の基底と比較</strong>
            <small>現在の基底を記録してから、候補の選択または順序を変えてください。</small>
          </div>
          <button
            type="button"
            disabled={!canSaveComparison}
            onClick={onSaveComparisonBasis}
          >
            現在の基底を比較用に記録
          </button>
        </div>
        {comparisonBasisIds && comparisonAnalysis ? (
          <div className="basis-coordinate-saved">
            <p>
              <MathBasisName comparison /> = <VectorTuple ids={comparisonBasisIds} vectors={scene.vectors} />
            </p>
            {comparisonAnalysis.status === 'coordinate-vector' ? (
              <>
                <p className="basis-coordinate-formula">
                  <MathVectorName name="c" /> ={' '}
                  <MathColumnVector values={comparisonAnalysis.coordinateVector?.map(formatCoordinate) ?? []} />
                </p>
                <small className="basis-coordinate-identity">
                  この係数ベクトル <MathVectorName name="c" /> が <MathCoordinateName comparison /> です。
                </small>
              </>
            ) : (
              <p className="basis-coordinate-warning">
                記録した組は現在のベクトル成分では基底でないため、比較用の座標を定義できません。
              </p>
            )}
          </div>
        ) : (
          <p className="basis-coordinate-empty">比較用の基底はまだ記録されていません。</p>
        )}
      </div>
    </section>
  );
}

function CoordinateResult({
  scene,
  target,
  analysis,
  coordinateValues,
  particularValues,
  polynomialMode,
}: {
  readonly scene: BasisDimensionScene;
  readonly target: readonly number[];
  readonly analysis: BasisCoordinateAnalysis;
  readonly coordinateValues: readonly string[];
  readonly particularValues: readonly string[];
  readonly polynomialMode: boolean;
}) {
  switch (analysis.status) {
    case 'coordinate-vector':
      return (
        <div className="basis-coordinate-success">
          <strong>座標ベクトルが唯一に定まります</strong>
          {polynomialMode ? <PolynomialTargetIdentity target={target} /> : null}
          <p className="basis-coordinate-formula">
            <MathVectorName name="c" /> = <MathColumnVector values={coordinateValues} />
          </p>
          <p className="basis-coordinate-formula is-expansion">
            <MathVectorName name="v" /> ={' '}
            <VectorTuple ids={scene.candidateVectorIds} vectors={scene.vectors} />
            <MathVectorName name="c" />
          </p>
          <small>
            候補が基底なので、この一意な係数ベクトル <MathVectorName name="c" /> が{' '}
            <MathCoordinateName /> です。
          </small>
        </div>
      );
    case 'not-representable':
      return (
        <div className="basis-coordinate-warning">
          <strong>この組の一次結合ではターゲットを表現できません</strong>
          <p><MathVectorName name="v" /> は現在の候補が生成する空間に含まれません。</p>
          <small>表現係数が存在しないため、座標ベクトルも定義できません。</small>
        </div>
      );
    case 'non-unique':
      return (
        <div className="basis-coordinate-warning">
          <strong>一次結合係数が無数にあります</strong>
          <p>係数の例：</p>
          <div className="basis-coordinate-examples">
            {analysis.combinationAnalysis.exampleSolutions.map((values, index) => (
              <span key={index}>
                例{index + 1}：<MathVectorName name="c" /> ={' '}
                <MathColumnVector values={values.map(formatCoordinate)} />
              </span>
            ))}
          </div>
          <small>候補が一次従属なので係数が一意でなく、これを基底に関する座標とは呼びません。</small>
        </div>
      );
    case 'not-a-basis':
      return (
        <div className="basis-coordinate-warning">
          <strong>このターゲットには一意な係数がありますが、座標とは呼べません</strong>
          <p className="basis-coordinate-formula">
            <MathVectorName name="c" /> = <MathColumnVector values={particularValues} />
          </p>
          <small>現在の候補は対象空間の基底ではないため、他のベクトルには同じ表現規則を使えません。</small>
        </div>
      );
  }
}

function ConditionResult({ success, title, detail }: {
  readonly success: boolean;
  readonly title: ReactNode;
  readonly detail: string;
}) {
  return (
    <div className={`basis-condition ${success ? 'is-success' : 'is-failure'}`}>
      <span className="basis-condition-icon" aria-hidden="true">{success ? '✓' : '×'}</span>
      <div>
        <strong>{title}</strong>
        <small>{detail}</small>
      </div>
    </div>
  );
}

function ZeroDimensionalBasisWorkspace() {
  return (
    <>
      <div className="basis-visual-column">
        <section className="plot-card" aria-labelledby="basis-zero-title">
          <div className="card-heading">
            <div>
              <p className="panel-kicker">Zero vector space</p>
              <h2 id="basis-zero-title">0次元零ベクトル空間</h2>
            </div>
          </div>
          <ZeroSpace0D idPrefix="basis-zero-space" />
        </section>
      </div>
      <aside className="basis-analysis-column" aria-label="0次元空間の空の基底と次元">
        <section className="basis-candidate-card zero-basis-candidate-card">
          <p className="panel-kicker">Empty basis</p>
          <h2>空の基底 <MathBasisName /></h2>
          <div className="basis-tuple">
            <p><MathSetName /> = ∅</p>
            <p><MathBasisName /> = ()</p>
          </div>
          <p>
            <MathSpaceName /> = &#123;<MathVectorName name="0" />&#125; では、基底に選ぶベクトルは1本もありません。
            空の組 <MathBasisName /> = () が基底です。
          </p>
          <p className="basis-card-note">
            空集合 ∅ と、零ベクトルを1本含む集合 &#123;<MathVectorName name="0" />&#125; は異なります。
          </p>
        </section>

        <section className="basis-result-card inspector-panel is-basis zero-basis-result-card">
          <p className="panel-kicker">Basis &amp; dimension</p>
          <h2>空の組は基底です</h2>
          <div className="basis-target-summary">
            <p><strong>対象としている空間：</strong><MathSpaceName /> = &#123;<MathVectorName name="0" />&#125;</p>
            <p><strong>現在選んでいるベクトルの組：</strong><MathBasisName /> = ()</p>
          </div>
          <div className="basis-condition-list">
            <ConditionResult
              success
              title="条件1：一次独立である"
              detail="一次従属にする非自明な係数の選び方がないため、空の組は一次独立です。"
            />
            <ConditionResult
              success
              title={<>条件2：対象空間 <MathSpaceName /> を生成する</>}
              detail="ベクトルを1本も足さない空和を零ベクトルと定めるため、零ベクトル空間全体を生成します。"
            />
          </div>
          <div className="basis-example zero-basis-conclusion">
            <p><MathOperator name="span" />(∅) = &#123;<MathVectorName name="0" />&#125; = <MathSpaceName /></p>
            <p><MathOperator name="dim" />(<MathSpaceName />) = 0</p>
            <small>
              基底が必ず1本以上のベクトルを含むとは限りません。0次元空間では、基底の本数が0本なので次元も0です。
            </small>
          </div>
          <p className="basis-card-note">
            ターゲットの座標は成分を持たない空の係数列になりますが、通常の列ベクトル入力には押し込まず、ここでは「係数を1つも必要としない」と説明します。
          </p>
        </section>
      </aside>
    </>
  );
}

function BasisSpaceLoading() {
  return (
    <section className="three-dimensional-loading" aria-live="polite">
      <p className="panel-kicker">3D coordinate space</p>
      <h2>3D表示を準備しています</h2>
      <p>端末内で3D描画機能を読み込んでいます。</p>
    </section>
  );
}

function PolynomialVectorIdentity({
  vector,
  functionIndex,
}: {
  readonly vector: VectorValue;
  readonly functionIndex: number;
}) {
  return (
    <span className="basis-polynomial-identity">
      <MathVectorName name={vector.name} />
      <span aria-hidden="true"> = </span>
      <MathFunctionName index={functionIndex} />
      <span aria-hidden="true"> = </span>
      <MathPolynomial coefficients={vector.coordinates} />
    </span>
  );
}

function PolynomialTargetIdentity({ target }: { readonly target: readonly number[] }) {
  return (
    <span className="basis-polynomial-identity is-target">
      <MathVectorName name="v" />
      <span aria-hidden="true"> = </span>
      <MathFunctionName target />
      <span aria-hidden="true"> = </span>
      <MathPolynomial coefficients={target} />
    </span>
  );
}

function MathFunctionName({
  index,
  target = false,
}: {
  readonly index?: number;
  readonly target?: boolean;
}) {
  const base = target ? 'g' : 'f';
  const accessibleName = index ? `${base}${index}(x)` : `${base}(x)`;
  return (
    <span className="basis-function-name" aria-label={accessibleName}>
      <span aria-hidden="true" className="math-scalar-base">{base}</span>
      {index ? <sub aria-hidden="true">{index}</sub> : null}
      <span aria-hidden="true">(</span><span aria-hidden="true" className="math-scalar-base">x</span><span aria-hidden="true">)</span>
    </span>
  );
}

function MathPolynomial({ coefficients }: { readonly coefficients: readonly number[] }) {
  const terms = createPolynomialTerms(coefficients);
  return (
    <span className="basis-polynomial" aria-label={formatPolynomialExpression(coefficients)}>
      {terms.map((term, index) => {
        const negative = term.coefficient < 0;
        const absolute = Math.abs(term.coefficient);
        const showCoefficient = term.degree === 0 || absolute !== 1;
        return (
          <span key={term.degree} aria-hidden="true">
            {index === 0 ? (negative ? '−' : '') : (negative ? ' − ' : ' + ')}
            {showCoefficient ? formatCoordinate(absolute) : null}
            {term.degree > 0 ? <span className="math-scalar-base">x</span> : null}
            {term.degree > 1 ? <sup>{term.degree}</sup> : null}
          </span>
        );
      })}
    </span>
  );
}

function GenericPolynomial({ dimension }: { readonly dimension: VectorSpaceDimension }) {
  return (
    <span className="basis-polynomial" aria-label={`b0からb${dimension - 1}までを係数とする多項式`}>
      {Array.from({ length: dimension }, (_, degree) => (
        <span key={degree} aria-hidden="true">
          {degree > 0 ? ' + ' : ''}
          <MathPolynomialCoefficientName degree={degree} />
          {degree > 0 ? <span className="math-scalar-base">x</span> : null}
          {degree > 1 ? <sup>{degree}</sup> : null}
        </span>
      ))}
    </span>
  );
}

function MathPolynomialTuple({ terms }: { readonly terms: readonly string[] }) {
  return (
    <span className="basis-math basis-polynomial-tuple" aria-label={`標準基底 ${terms.join('、')}`}>
      (<span aria-hidden="true">{terms.map((term, index) => {
        const match = /^x(\d+)$/u.exec(term);
        return (
          <span key={term}>
            {index > 0 ? ', ' : ''}
            {match ? <><span className="math-scalar-base">x</span><sup>{match[1]}</sup></> : term === 'x' ? <span className="math-scalar-base">x</span> : term}
          </span>
        );
      })}</span>)
    </span>
  );
}

function MathVectorName({ name }: { readonly name: string }) {
  const match = /^([A-Za-z]+)(\d+)$/u.exec(name);
  return (
    <span className="math-symbol math-vector">
      <span className="math-vector-base">{match?.[1] ?? name}</span>
      {match?.[2] ? <sub className="math-vector-subscript">{match[2]}</sub> : null}
    </span>
  );
}

function MathBasisName({ comparison = false }: { readonly comparison?: boolean }) {
  return (
    <span className="basis-math basis-script-symbol">
      ℬ{comparison ? <sub className="basis-comparison-subscript">0</sub> : null}
    </span>
  );
}

function MathSetName() {
  return <MathScalarName name="S" />;
}

function MathSpaceName() {
  return <MathScalarName name="V" />;
}

function MathOperator({ name }: { readonly name: string }) {
  return <span className="math-operator">{name}</span>;
}

function MathScalarName({ name }: { readonly name: string }) {
  return (
    <span className="math-scalar">
      <span className="math-scalar-base">{name}</span>
    </span>
  );
}

function VectorTuple({ ids, vectors }: {
  readonly ids: readonly string[];
  readonly vectors: readonly VectorValue[];
}) {
  if (ids.length === 0) {
    return <span className="basis-math">()</span>;
  }
  return (
    <span className="basis-math basis-vector-tuple">
      (<span>{ids.map((id, index) => {
        const vector = vectors.find((item) => item.id === id);
        return (
          <span key={id}>
            {index > 0 ? ', ' : ''}<MathVectorName name={vector?.name ?? id} />
          </span>
        );
      })}</span>)
    </span>
  );
}

function VectorCollection({ vectors }: { readonly vectors: readonly VectorValue[] }) {
  return (
    <span className="basis-math basis-vector-tuple">
      {'{'}{vectors.map((vector, index) => (
        <span key={vector.id}>
          {index > 0 ? ', ' : ''}<MathVectorName name={vector.name} />
        </span>
      ))}{'}'}
    </span>
  );
}

function MathRealCoordinateSpace({ dimension }: { readonly dimension: VectorSpaceDimension }) {
  return (
    <span className="basis-coordinate-space" aria-label={`${dimension}次元実数ベクトル空間`}>
      <span aria-hidden="true">ℝ</span><sup aria-hidden="true">{dimension}</sup>
    </span>
  );
}

function MathPolynomialSpace({ degree }: { readonly degree: number }) {
  return (
    <span className="basis-coordinate-space" aria-label={`高々${degree}次の実数係数多項式空間`}>
      <span aria-hidden="true">ℝ[</span><span aria-hidden="true" className="math-scalar-base">x</span><span aria-hidden="true">]</span>
      <sub aria-hidden="true">{degree}</sub>
    </span>
  );
}

function MathPolynomialCoefficientName({ degree }: { readonly degree: number }) {
  return (
    <span className="basis-coefficient-name">
      <span className="math-scalar-base">b</span><sub>{degree}</sub>
    </span>
  );
}

function MathSymbolicTransposedRowVector({ degrees }: { readonly degrees: readonly number[] }) {
  return (
    <span
      className="transposed-row-vector"
      aria-label={`転置した行表示 ${degrees.map((degree) => `b${degree}`).join('、')}`}
    >
      <sup aria-hidden="true">t</sup>
      <span aria-hidden="true">[</span>
      {degrees.map((degree, index) => (
        <span key={degree} aria-hidden="true">
          {index > 0 ? ', ' : null}<MathPolynomialCoefficientName degree={degree} />
        </span>
      ))}
      <span aria-hidden="true">]</span>
    </span>
  );
}

function MathTransposedRowVector({ values }: { readonly values: readonly string[] }) {
  return (
    <span className="transposed-row-vector" aria-label={`転置した行表示 ${values.join('、')}`}>
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

function MathCoordinateName({ comparison = false }: { readonly comparison?: boolean }) {
  return (
    <span className="basis-coordinate-name" aria-label={`vの基底${comparison ? 'B0' : 'B'}に関する座標`}>
      [<MathVectorName name="v" />]<sub><MathBasisName comparison={comparison} /></sub>
    </span>
  );
}

function MathColumnVector({ values }: { readonly values: readonly string[] }) {
  return (
    <span
      className="display-column-vector basis-column-vector"
      aria-label={`列ベクトル ${values.join('、')}`}
    >
      {values.length === 0 ? <span aria-hidden="true"> </span> : values.map((value, index) => (
        <span key={index} aria-hidden="true">{value}</span>
      ))}
    </span>
  );
}

function resolveVectors(
  vectors: readonly VectorValue[],
  ids: readonly string[],
): readonly VectorValue[] {
  const byId = new Map(vectors.map((vector) => [vector.id, vector]));
  return ids.flatMap((id) => {
    const vector = byId.get(id);
    return vector ? [vector] : [];
  });
}

function createBasisAutoFitViewport(
  scene: BasisDimensionScene,
  includeTarget = true,
): PlaneViewport {
  return createAutoFitViewport([
    ...scene.vectors,
    ...(includeTarget && scene.target
      ? [{ id: '__basis_coordinate_target__', name: 'v', coordinates: scene.target }]
      : []),
  ]);
}

function createBasisAutoFitLineViewport(
  scene: BasisDimensionScene,
  includeTarget = true,
): LineViewport {
  return createAutoFitLineViewport([
    ...scene.vectors.map((vector) => vector.coordinates[0] ?? 0),
    ...(includeTarget && scene.target ? [scene.target[0] ?? 0] : []),
  ]);
}

function createBasisTargetDrafts(scene: BasisDimensionScene): readonly string[] {
  return scene.target
    ? scene.target.map(formatCoordinate)
    : Array.from({ length: scene.dimension }, () => '');
}

function downloadBlobUrl(url: string, fileName: string, revoke: boolean): void {
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  if (revoke) {
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

function formatCoordinate(value: number): string {
  return String(Number(value.toPrecision(10)));
}
