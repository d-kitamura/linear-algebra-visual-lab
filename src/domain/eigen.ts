import { add, characteristic, compare, div, EigenPrecisionLimit, fromNumber, isolateRoots, mul, neg, ONE,
  polynomialValue, rat, squareFreeFactors, toNumber, type Rational } from './eigenExact';
import { distinguishEigenSpaces, eigenResidual, findEigenSpace, spaceDistance, EIGEN_MEMBERSHIP_TOLERANCE, EIGEN_NONMEMBERSHIP_TOLERANCE } from './eigenVectors';
import { InvalidEigenInputError, type EigenInputAnalysis, type EigenIssue, type EigenMapAnalysis,
  type EigenMapDefinition, type RealEigenvalue } from './eigenTypes';

const MAX_ENTRY = 1_000_000;
function entry(value: number): void {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new InvalidEigenInputError('NON_FINITE_ENTRY', '有限の成分を入力してください。');
  if (Math.abs(value) > MAX_ENTRY) throw new InvalidEigenInputError('ENTRY_OUT_OF_RANGE', '成分の絶対値は100万以下にしてください。');
}
function validate(definition: EigenMapDefinition): void {
  if (!definition || ![0, 1, 2, 3].includes(definition.dimension)) throw new InvalidEigenInputError('INVALID_DIMENSION', '次元は0〜3です。');
  const n = definition.dimension;
  if (!Array.isArray(definition.matrix) || definition.matrix.length !== n) throw new InvalidEigenInputError('INVALID_MATRIX', '正方行列が必要です。');
  for (const row of definition.matrix) {
    if (!Array.isArray(row) || row.length !== n) throw new InvalidEigenInputError('INVALID_MATRIX', '行列の形状が一致しません。');
    for (const value of row) entry(value);
  }
}
function freeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze); Object.freeze(value);
  }
  return value;
}
interface Root { value: Rational; exact: boolean; multiplicity: number; radius?: Rational }

/** D-103: 実根の個数・重複はexact演算、図へ渡す値と空間は検証済みの数値。 */
export function analyzeEigenMap(input: EigenMapDefinition): EigenMapAnalysis {
  validate(input);
  const definition = { dimension: input.dimension, matrix: input.matrix.map((row) => [...row]) };
  const n = definition.dimension;
  let characteristicCoefficients: number[] | null = null;
  try {
    const matrix = definition.matrix.map((row) => row.map(fromNumber));
    const exactCoefficients = characteristic(matrix);
    const numbers = exactCoefficients.map(toNumber);
    const issues: EigenIssue[] = [];
    if (numbers.every((v, i) => Number.isFinite(v) && (v !== 0 || exactCoefficients[i].n === 0n))) characteristicCoefficients = numbers;
    else issues.push('unrepresentable-result');
    if (!n) return freeze({ definition, characteristicCoefficients, status: 'no-real-eigenvalues', spectrumComplete: true, nonRealRootCount: 0, realEigenvalues: [], issues });
    const scale = fromNumber(Math.max(...definition.matrix.flat().map(Math.abs)) || 1);
    const normalized = matrix.map((row) => row.map((v) => div(v, scale)));
    const p = characteristic(normalized);
    let roots: Root[] = [], realCount = 0, exhausted = false;
    const triangular = [1, -1].some((direction) => matrix.every((row, i) => row.every((v, j) => direction * (i - j) <= 0 || v.n === 0n)));
    if (triangular) {
      // 三角行列は対角成分が厳密な根。非常に小さい根も二分探索で失わない。
      for (let i = 0; i < n; i++) {
        const value = normalized[i][i], previous = roots.find((r) => compare(r.value, value) === 0);
        if (previous) previous.multiplicity++; else roots.push({ value, exact: true, multiplicity: 1 });
      }
      realCount = n;
    } else for (const factor of squareFreeFactors(p)) {
      const isolated = isolateRoots(factor.polynomial);
      realCount += isolated.realCount * factor.multiplicity;
      exhausted ||= isolated.exhausted;
      roots.push(...isolated.roots.map((r) => ({ ...r, multiplicity: factor.multiplicity })));
    }
    if (exhausted) issues.push('iteration-limit');
    roots = roots.sort((a, b) => compare(a.value, b.value));
    const realEigenvalues: RealEigenvalue[] = [];
    const converted = roots.map((root) => toNumber(mul(root.value, scale)));
    for (let i = 0; i < roots.length; i++) {
      const root = roots[i], value = converted[i], exactValue = mul(root.value, scale);
      if (!Number.isFinite(value) || (value === 0 && exactValue.n !== 0n)) { issues.push('unrepresentable-result'); continue; }
      if (converted[i - 1] === value || converted[i + 1] === value) { issues.push('unresolved-cluster'); continue; }
      // 根近似の多項式残差も確認する（重複度の根拠には使わない）。
      const x = div(fromNumber(value), scale);
      let bound = rat(0n), power = ONE;
      const ax = x.n < 0n ? neg(x) : x;
      for (const coefficient of p) { bound = add(bound, mul(coefficient.n < 0n ? neg(coefficient) : coefficient, power)); power = mul(power, ax); }
      const residual = polynomialValue(p, x);
      if (bound.n && Math.abs(toNumber(div(residual, bound))) > 1e-12) { issues.push('residual-too-large'); continue; }
      const eigenspace = findEigenSpace(definition.matrix, matrix, value, root.exact ? exactValue : null, root.multiplicity,
        root.radius ? toNumber(mul(root.radius, scale)) : 0);
      realEigenvalues.push({ value, algebraicMultiplicity: root.multiplicity, eigenspace, issues: eigenspace ? [] : ['unstable-nullity'] });
    }
    const spectrumComplete = !exhausted && realEigenvalues.reduce((s, r) => s + r.algebraicMultiplicity!, 0) === realCount;
    const spaces = realEigenvalues.flatMap((root) => root.eigenspace ? [root.eigenspace] : []);
    if (!distinguishEigenSpaces(spaces)) {
      // 根は別だと分かっても、ほぼ一致する方向を別の空間として案内しない。
      for (let i = 0; i < realEigenvalues.length; i++) {
        realEigenvalues[i] = { ...realEigenvalues[i], eigenspace: null, issues: ['unstable-nullity'] };
      }
    }
    if (!spectrumComplete) issues.push('incomplete-spectrum');
    issues.push(...realEigenvalues.flatMap((r) => r.issues));
    const status = !issues.length && spectrumComplete
      ? realEigenvalues.length ? 'ready' : 'no-real-eigenvalues' : 'inconclusive';
    return freeze({ definition, characteristicCoefficients, status, spectrumComplete, nonRealRootCount: n - realCount,
      realEigenvalues, issues: [...new Set(issues)] });
  } catch (error) {
    if (!(error instanceof EigenPrecisionLimit)) throw error;
    return freeze({ definition, characteristicCoefficients, status: 'numerical-failure', spectrumComplete: false,
      nonRealRootCount: null, realEigenvalues: [], issues: ['precision-limit'] });
  }
}

/** 入力だけの変更では根を再計算しない。零・選択空間・全固有空間の判定は独立。 */
export function analyzeEigenInput(analysis: EigenMapAnalysis, input: readonly number[], selectedEigenvalueIndex: number | null = null): EigenInputAnalysis {
  if (!Array.isArray(input) || input.length !== analysis.definition.dimension) throw new InvalidEigenInputError('INVALID_INPUT', '入力の次元が一致しません。');
  for (const value of input) entry(value);
  if (selectedEigenvalueIndex !== null && (!Number.isInteger(selectedEigenvalueIndex) || selectedEigenvalueIndex < 0 || selectedEigenvalueIndex > 2)) throw new InvalidEigenInputError('INVALID_SELECTION', '固有値の選択序数が不正です。');
  const zero = input.every((v) => v === 0), issues: EigenIssue[] = [];
  const image = analysis.definition.matrix.map((row) => row.reduce((s, a, i) => {
    const product = a * input[i];
    if (a !== 0 && input[i] !== 0 && product === 0) issues.push('unrepresentable-result');
    return s + product;
  }, 0));
  if (!image.every(Number.isFinite)) issues.push('non-finite-result');
  const relations = analysis.realEigenvalues.map((root) => {
    const residual = eigenResidual(analysis.definition.matrix, root.value, input);
    const distance = root.eigenspace ? spaceDistance(input, root.eigenspace.basis) : null;
    const relation: EigenInputAnalysis['selectionRelation'] = distance === null ? 'inconclusive'
      : distance <= EIGEN_MEMBERSHIP_TOLERANCE && residual <= EIGEN_MEMBERSHIP_TOLERANCE ? 'member'
      : distance >= EIGEN_NONMEMBERSHIP_TOLERANCE ? 'not-member' : 'inconclusive';
    return { residual, distance, relation };
  });
  const selected = selectedEigenvalueIndex === null ? undefined : relations[selectedEigenvalueIndex];
  const matches = relations.flatMap((r, i) => r.relation === 'member' ? [i] : []);
  const ambiguousMembership = !zero && matches.length > 1;
  const complete = analysis.spectrumComplete && relations.every((r) => r.relation === 'not-member');
  if (ambiguousMembership || relations.some((r) => r.relation === 'inconclusive')) issues.push('unstable-nullity');
  if (!analysis.spectrumComplete) issues.push('incomplete-spectrum');
  const failed = issues.includes('unrepresentable-result') || issues.includes('non-finite-result');
  return freeze<EigenInputAnalysis>({ status: failed ? 'numerical-failure' : 'ready', inputVector: [...input], imageVector: failed ? null : image,
    zeroStatus: zero ? 'zero' : 'nonzero', selectionRelation: failed || ambiguousMembership ? 'inconclusive' : selected?.relation ?? 'no-selection',
    eigenvectorStatus: zero ? 'zero-input' : failed || ambiguousMembership ? 'inconclusive' : matches.length ? 'eigenvector' : complete ? 'not-eigenvector' : 'inconclusive',
    matchingEigenvalueIndices: zero || failed || ambiguousMembership ? [] : matches, selectedRelativeResidual: selected?.residual ?? null,
    selectedRelativeDistance: selected?.distance ?? null, issues: [...new Set(issues)] });
}
