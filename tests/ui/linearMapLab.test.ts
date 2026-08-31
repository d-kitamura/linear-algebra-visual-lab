import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const appSource = readFileSync(new URL('../../src/app/App.tsx', import.meta.url), 'utf8');
const menuSource = readFileSync(new URL('../../src/app/LabMenu.tsx', import.meta.url), 'utf8');
const labSource = readFileSync(
  new URL('../../src/labs/linear-map/LinearMapLab.tsx', import.meta.url),
  'utf8',
);
const planeSource = readFileSync(
  new URL('../../src/visualization/VectorPlane2D.tsx', import.meta.url),
  'utf8',
);
const cssSource = readFileSync(new URL('../../src/app/App.css', import.meta.url), 'utf8');

describe('9.3 2Dから2Dへの線形写像Lab', () => {
  it('adds the third Lab while preserving each mounted Lab state', () => {
    expect(menuSource).toContain("id: 'linear-map'");
    expect(menuSource).toContain("export type LabId = 'vector-space' | 'basis-dimension' | 'linear-map'");
    expect(appSource).toContain('<LinearMapLab active={activeLabId === \'linear-map\'} />');
    expect(appSource).toContain("hidden={activeLabId !== 'linear-map'}");
    expect(labSource).toContain('data-lab-id="linear-map"');
  });

  it('shows domain and codomain as separate responsive coordinate planes', () => {
    expect(labSource).toContain('定義域 <MathRealSpace name="U" />');
    expect(labSource).toContain('終域 <MathRealSpace name="V" />');
    expect(labSource).toContain('idPrefix="linear-map-domain-plane"');
    expect(labSource).toContain('idPrefix="linear-map-codomain-plane"');
    expect(cssSource).toMatch(/\.linear-map-diagram-grid,[\s\S]*?grid-template-columns:\s*repeat\(2,/su);
    expect(cssSource).toMatch(/@media \(max-width: 980px\)[\s\S]*?\.linear-map-diagram-grid,[\s\S]*?grid-template-columns:\s*1fr;/su);
  });

  it('edits u only in the domain and derives T(u) in the codomain', () => {
    expect(labSource).toContain('analyzeLinearMap(definition, scene.inputVector)');
    expect(labSource).toContain('onVectorChange={(_, coordinates) => handleInputDrag(coordinates)}');
    expect(labSource).toContain('name: \'T(u)\'');
    expect(labSource).toContain('<MathMapValue argument="u" /> は導出値なので直接編集しません');
    expect(labSource).not.toMatch(/idPrefix="linear-map-codomain-plane"[\s\S]{0,500}onVectorChange=/u);
  });

  it('connects matrix editing to the two standard-basis images', () => {
    expect(labSource).toContain('updateLinearMapMatrixEntry');
    expect(labSource).toContain("name: 'T(e1)'");
    expect(labSource).toContain("name: 'T(e2)'");
    expect(labSource).toContain('<MathMatrixName /> = (');
    expect(labSource).toContain('<MathMapValue argument="e" subscript="1" />');
    expect(labSource).toContain('<MathMapValue argument="e" subscript="2" />');
  });

  it('switches six representative maps and can hide the grid image', () => {
    expect(labSource).toContain('LINEAR_MAP_PRESETS.map');
    expect(labSource).toContain('setTransformedGridVisibility');
    expect(labSource).toContain('終域に格子の像を表示');
    expect(labSource).toContain('transformedGridSegments={transformedGridSegments}');
    expect(planeSource).toContain('className="linear-map-grid-image"');
    expect(cssSource).toContain('.linear-map-grid-image .is-first-coordinate');
    expect(cssSource).toContain('.linear-map-grid-image .is-second-coordinate');
  });

  it('keeps zoom, pan, pinch, fit, and mobile touch policy on both figures', () => {
    expect(labSource).toContain('onViewportChange={setDomainManualViewport}');
    expect(labSource).toContain('onViewportChange={setCodomainManualViewport}');
    expect(labSource).toContain('setDomainManualViewport(null)');
    expect(labSource).toContain('setCodomainManualViewport(null)');
    expect(cssSource).toMatch(/\.vector-plane\s*\{[^}]*touch-action:\s*none;/su);
  });
});
