import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const lineSource = readFileSync(
  new URL('../../src/visualization/VectorLine1D.tsx', import.meta.url),
  'utf8',
);
const zeroSource = readFileSync(
  new URL('../../src/visualization/ZeroSpace0D.tsx', import.meta.url),
  'utf8',
);
const visualizationIndex = readFileSync(
  new URL('../../src/visualization/index.ts', import.meta.url),
  'utf8',
);
const cssSource = readFileSync(new URL('../../src/app/App.css', import.meta.url), 'utf8');

describe('0D・1D common visualization', () => {
  it('exports reusable components without connecting them to a specific Lab', () => {
    expect(visualizationIndex).toContain("export { VectorLine1D } from './VectorLine1D';");
    expect(visualizationIndex).toContain("export { ZeroSpace0D } from './ZeroSpace0D';");
    expect(lineSource).not.toContain('VectorSpaceLab');
    expect(zeroSource).not.toContain('BasisDimensionLab');
  });

  it('draws vectors, span, target, adaptive ticks, and math-formatted labels on a number line', () => {
    expect(lineSource).toContain('createAdaptiveTicks(viewport.min, viewport.max)');
    expect(lineSource).toContain('line-span-${spanDimension}');
    expect(lineSource).toContain('<LineTargetVector');
    expect(lineSource).toContain('<SvgVectorLabel name={vector.name} />');
    const labelSource = readFileSync(new URL('../../src/visualization/SvgVectorLabel.tsx', import.meta.url), 'utf8');
    expect(labelSource).toContain('className="svg-vector-subscript"');
    expect(labelSource).toContain('className="svg-map-symbol"');
    expect(lineSource).toContain('1次元数ベクトルの数直線表示');
  });

  it('provides drag, origin snap, wheel, pinch, pan, fit, and mobile touch ownership', () => {
    expect(lineSource).toContain('snapLineCoordinateToOrigin');
    expect(lineSource).toContain('lineSnapDistanceForViewWidth');
    expect(lineSource).toContain("svg.addEventListener('wheel', handleWheel, { passive: false })");
    expect(lineSource).toContain('previousDistance / currentDistance');
    expect(lineSource).toContain('panLineViewportBySvgDelta');
    expect(lineSource).toContain('createAutoFitLineViewport(fitValues)');
    expect(lineSource).toContain('全体を表示');
    expect(cssSource).toMatch(/\.vector-line\s*\{[^}]*touch-action:\s*none;/su);
    expect(cssSource).toMatch(/\.line-vector-drag-handle,[\s\S]*?touch-action:\s*none;/u);
  });

  it('keeps target tap distinct from pan and includes figure-independent descriptions', () => {
    expect(lineSource).toContain('TARGET_TAP_MOVEMENT_THRESHOLD');
    expect(lineSource).toContain("event.type === 'pointerup'");
    expect(lineSource).toContain('onTargetPlacement?.(');
    expect(lineSource).toContain('<desc id={`${idPrefix}-description`}>');
  });

  it('shows 0D as one fixed point rather than a shrunken coordinate plane', () => {
    expect(zeroSource).toContain('この空間にあるベクトルは零ベクトルだけです');
    expect(zeroSource).toContain('空の組がこの空間の基底です');
    expect(zeroSource).toContain('dim(');
    expect(zeroSource).not.toContain('onPointer');
    expect(zeroSource).not.toContain('coordinate-axes');
  });

  it('keeps controls and fixed-point explanation usable at 390px-class widths', () => {
    expect(cssSource).toMatch(/@media \(max-width: 640px\)[\s\S]*?\.one-dimensional-controls/u);
    expect(cssSource).toContain('.zero-dimensional-figure');
    expect(cssSource).toContain('width: 100%');
  });
});
