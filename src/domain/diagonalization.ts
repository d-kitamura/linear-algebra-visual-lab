import { analyzeEigenMap } from './eigen';
import { InvalidEigenInputError, type EigenMapAnalysis, type EigenMapDefinition } from './eigenTypes';
import { eigenResidual, EIGEN_RESIDUAL_TOLERANCE } from './eigenVectors';
import {
  agreementResidual, basisMetrics, DIAGONALIZATION_CONDITION_LIMIT, DIAGONALIZATION_COORDINATE_TOLERANCE,
  DIAGONALIZATION_INVERSE_TOLERANCE, equationResidual, factorBasis, inverseFromSolver,
  multiplyVector, normalizeColumn, numericalIssue,
} from './diagonalizationNumerics';
import {
  InvalidDiagonalizationInputError, type DiagonalizationAnalysis, type DiagonalizationBasis,
  type DiagonalizationCriterion, type DiagonalizationInputAnalysis, type DiagonalizationIssue,
} from './diagonalizationTypes';

// 結果は数値snapshotだけを公開。分解は非公開のWeakMapへ置き、共有JSONには混入させない。
const solvers = new WeakMap<DiagonalizationAnalysis, (rhs: readonly number[]) => number[]>();
const owned = new WeakSet<DiagonalizationAnalysis>();
function freeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze); Object.freeze(value);
  }
  return value;
}
function finish(value: DiagonalizationAnalysis): DiagonalizationAnalysis {
  owned.add(value); return freeze(value);
}
function requireAnalysis(analysis: DiagonalizationAnalysis): void {
  if (!owned.has(analysis)) throw new InvalidDiagonalizationInputError('INVALID_ANALYSIS', 'このAPIが返した解析結果を渡してください。保存値からは行列を再解析してください。');
}
function base(eigenAnalysis: EigenMapAnalysis, criterion: DiagonalizationCriterion, issues: readonly DiagonalizationIssue[] = []) {
  return { definition: eigenAnalysis.definition, eigenAnalysis, criterion,
    issues: [...new Set<DiagonalizationIssue>([...eigenAnalysis.issues, ...issues])] };
}
const undetermined = (reason: 'incomplete-eigenspaces' | 'inconsistent-analysis'): DiagonalizationCriterion =>
  ({ status: 'undetermined', reason, realSpaceDimensionSum: null });

/** 実数上の次元条件と安定したP/D構成を分離する。固有値APIや既存rankは変更しない。 */
export function analyzeDiagonalization(definition: EigenMapDefinition): DiagonalizationAnalysis {
  const eigen = analyzeEigenMap(definition), n = eigen.definition.dimension;
  if (n === 0) return construct(eigen, { status: 'satisfied', reason: 'empty-space', realSpaceDimensionSum: 0 }, [], [], []);
  if (eigen.nonRealRootCount !== null && (!Number.isInteger(eigen.nonRealRootCount) || eigen.nonRealRootCount < 0 || eigen.nonRealRootCount > n)) {
    return finish({ ...base(eigen, undetermined('inconsistent-analysis'), ['inconsistent-analysis']), status: 'numerical-failure', basis: null });
  }
  // 確定した非実根は、他の空間が未確認でも「実数上では不可」の根拠になる。
  if (eigen.nonRealRootCount !== null && eigen.nonRealRootCount > 0) {
    return finish({ ...base(eigen, { status: 'not-satisfied', reason: 'non-real-spectrum', realSpaceDimensionSum: null }, ['non-real-spectrum']),
      status: 'not-diagonalizable', basis: null });
  }
  const roots = eigen.realEigenvalues;
  if (!eigen.spectrumComplete || eigen.nonRealRootCount !== 0 || roots.some(r => !r.eigenspace || r.algebraicMultiplicity === null)) {
    return finish({ ...base(eigen, undetermined('incomplete-eigenspaces'), ['incomplete-eigenspaces']),
      status: eigen.status === 'numerical-failure' ? 'numerical-failure' : 'inconclusive', basis: null });
  }
  const dimensionSum = roots.reduce((s, r) => s + r.eigenspace!.dimension, 0);
  const consistent = roots.reduce((s, r) => s + r.algebraicMultiplicity!, 0) === n
    && dimensionSum <= n && roots.every((r, i) => {
      const space = r.eigenspace!;
      return Number.isFinite(r.value) && (i === 0 || roots[i - 1].value < r.value)
        && Number.isInteger(r.algebraicMultiplicity) && r.algebraicMultiplicity! > 0
        && Number.isInteger(space.dimension) && space.dimension > 0 && space.dimension <= r.algebraicMultiplicity!
        && space.basis.length === space.dimension
        && space.basis.every(column => column.length === n && column.every(Number.isFinite));
    });
  if (!consistent) return finish({ ...base(eigen, undetermined('inconsistent-analysis'), ['inconsistent-analysis']), status: 'numerical-failure', basis: null });
  if (dimensionSum < n) {
    return finish({ ...base(eigen, { status: 'not-satisfied', reason: 'insufficient-eigenvectors', realSpaceDimensionSum: dimensionSum }, ['insufficient-eigenvectors']),
      status: 'not-diagonalizable', basis: null });
  }
  const columns = roots.flatMap(r => r.eigenspace!.basis);
  const indices = roots.flatMap((r, i) => r.eigenspace!.basis.map(() => i));
  return construct(eigen, { status: 'satisfied', reason: 'full-eigenbasis', realSpaceDimensionSum: n }, columns, indices, columns.map((_, i) => i));
}

function construct(eigen: EigenMapAnalysis, criterion: DiagonalizationCriterion, columns: readonly (readonly number[])[], indices: readonly number[], order: readonly number[], normalized = false): DiagonalizationAnalysis {
  const resultBase = base(eigen, criterion);
  const fail = (status: 'inconclusive' | 'numerical-failure', issue: DiagonalizationIssue) =>
    finish({ ...base(eigen, criterion, [issue]), status, basis: null });
  try {
    const n = eigen.definition.dimension;
    const canonicalColumns = columns.map(column => normalized ? [...column] : normalizeColumn(column));
    const eigenColumns = canonicalColumns.map((column, i) => eigenResidual(eigen.definition.matrix, eigen.realEigenvalues[indices[i]].value, column));
    if (eigenColumns.some(r => !Number.isFinite(r) || r > EIGEN_RESIDUAL_TOLERANCE)) return fail('inconclusive', 'residual-too-large');
    const p = Array.from({ length: n }, (_, i) => order.map(j => canonicalColumns[j][i]));
    const d = order.map((column, i) => order.map((_, j) => i === j ? eigen.realEigenvalues[indices[column]].value : 0));
    const solve = factorBasis(p), inverseP = inverseFromSolver(n, solve);
    const metrics = basisMetrics(eigen.definition.matrix, p, d, inverseP);
    if (!Number.isFinite(metrics.conditionInfinity)) return fail('numerical-failure', 'unrepresentable-result');
    if (metrics.conditionInfinity > DIAGONALIZATION_CONDITION_LIMIT) return fail('inconclusive', 'ill-conditioned-basis');
    if (!Number.isFinite(metrics.intertwining) || metrics.intertwining > EIGEN_RESIDUAL_TOLERANCE
      || !Number.isFinite(metrics.leftInverse) || metrics.leftInverse > DIAGONALIZATION_INVERSE_TOLERANCE
      || !Number.isFinite(metrics.rightInverse) || metrics.rightInverse > DIAGONALIZATION_INVERSE_TOLERANCE) return fail('inconclusive', 'residual-too-large');
    const basis: DiagonalizationBasis = { canonicalColumns, eigenvalueIndices: [...indices], order: [...order], p, d, inverseP,
      conditionInfinity: metrics.conditionInfinity, residuals: { eigenColumns, intertwining: metrics.intertwining,
        leftInverse: metrics.leftInverse, rightInverse: metrics.rightInverse } };
    const result = finish({ ...resultBase, status: 'ready', basis });
    solvers.set(result, solve);
    return result;
  } catch (error) {
    const issue = numericalIssue(error);
    if (!issue) throw error;
    return fail(issue === 'basis-solve-failed' ? 'inconclusive' : 'numerical-failure', issue);
  }
}

/** orderは必ず基準順への絶対的な置換。根の再解析なしでP/Dを並べ替え、再検算する。 */
export function reorderDiagonalization(analysis: DiagonalizationAnalysis, order: readonly number[]): DiagonalizationAnalysis {
  requireAnalysis(analysis);
  const n = analysis.definition.dimension;
  if (!Array.isArray(order) || order.length !== n || new Set(order).size !== n
    || !Array.from(order).every(i => Number.isInteger(i) && i >= 0 && i < n)) {
    throw new InvalidDiagonalizationInputError('INVALID_ORDER', '列順は0〜n−1の完全な置換で指定してください。');
  }
  if (!analysis.basis) throw new InvalidDiagonalizationInputError('UNAVAILABLE_BASIS', '構成できた基底がないため、列順を交換できません。');
  return construct(analysis.eigenAnalysis, analysis.criterion, analysis.basis.canonicalColumns, analysis.basis.eigenvalueIndices, order, true);
}

/** 行列解析時の分解を再利用し、uとAuを別々に解く。失敗しても行列の判定は変えない。 */
export function analyzeDiagonalizationInput(analysis: DiagonalizationAnalysis, input: readonly number[]): DiagonalizationInputAnalysis {
  requireAnalysis(analysis);
  if (!Array.isArray(input) || input.length !== analysis.definition.dimension) throw new InvalidEigenInputError('INVALID_INPUT', '入力の次元が一致しません。');
  for (const x of input) {
    if (typeof x !== 'number' || !Number.isFinite(x)) throw new InvalidEigenInputError('NON_FINITE_ENTRY', '有限の成分を入力してください。');
    if (Math.abs(x) > 1_000_000) throw new InvalidEigenInputError('ENTRY_OUT_OF_RANGE', '成分の絶対値は100万以下にしてください。');
  }
  const inputVector = [...input];
  let imageVector: number[] | null = null;
  const fail = (status: 'numerical-failure' | 'inconclusive' | 'unavailable-basis', issues: readonly DiagonalizationIssue[]): DiagonalizationInputAnalysis =>
    freeze({ status, inputVector, imageVector, coordinates: null, issues });
  try {
    imageVector = multiplyVector(analysis.definition.matrix, input);
    if (!analysis.basis) return fail('unavailable-basis', analysis.issues);
    const solve = solvers.get(analysis)!;
    const { p, d } = analysis.basis;
    const c = solve(input), imageCoordinates = solve(imageVector);
    const dc = multiplyVector(d, c), pc = multiplyVector(p, c), pdc = multiplyVector(p, dc);
    const residuals = { input: equationResidual(p, c, input), image: equationResidual(p, dc, imageVector),
      solvedImage: equationResidual(p, imageCoordinates, imageVector), coordinateAgreement: agreementResidual(imageCoordinates, dc) };
    if (Object.values(residuals).some(r => !Number.isFinite(r) || r > DIAGONALIZATION_COORDINATE_TOLERANCE)) return fail('inconclusive', ['residual-too-large']);
    return freeze({ status: 'ready', inputVector, imageVector, issues: [], coordinates: { inputCoordinates: c,
      imageCoordinates, imageCoordinatesViaDiagonal: dc, inputViaCoordinates: pc, imageViaCoordinates: pdc, residuals } });
  } catch (error) {
    const issue = numericalIssue(error);
    if (!issue) throw error;
    return fail(issue === 'basis-solve-failed' ? 'inconclusive' : 'numerical-failure', [issue]);
  }
}
