import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const appCss = readFileSync(new URL('../../src/app/App.css', import.meta.url), 'utf8');
const vectorPlaneSource = readFileSync(
  new URL('../../src/visualization/VectorPlane2D.tsx', import.meta.url),
  'utf8',
);
const indexHtml = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');

describe('mobile gesture policy', () => {
  it('keeps pan, pinch, and vector dragging inside the complete coordinate plane', () => {
    expect(appCss).toMatch(/\.vector-plane\s*\{[^}]*touch-action:\s*none;/su);
  });

  it('does not disable page zoom outside the coordinate plane', () => {
    expect(indexHtml).toContain('width=device-width, initial-scale=1.0');
    expect(indexHtml).not.toMatch(/user-scalable\s*=\s*no|maximum-scale\s*=\s*1/iu);
  });

  it('distinguishes a target tap from pan and pinch while keeping the target tip draggable', () => {
    expect(vectorPlaneSource).toContain('TARGET_TAP_MOVEMENT_THRESHOLD');
    expect(vectorPlaneSource).toContain('pointerPositionsRef.current.size === 1');
    expect(vectorPlaneSource).toContain("event.type === 'pointerup'");
    expect(vectorPlaneSource).toContain('onTargetPlacement?.(');
    expect(appCss).toMatch(/\.target-drag-handle\s*\{[^}]*touch-action:\s*none;/su);
  });
});
