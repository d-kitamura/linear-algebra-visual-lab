import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const appCss = readFileSync(new URL('../../src/app/App.css', import.meta.url), 'utf8');

const spanGeometrySelectors = [
  '.span-plane-fill',
  '.span-plane-hatch',
  '.span-line',
  '.span-origin circle',
  '.span-origin path',
  '.span-geometry-label rect',
] as const;

describe('span geometry colors', () => {
  it('defines a neutral gray palette independently from vector colors', () => {
    expect(appCss).toMatch(/--span-neutral-strong:\s*#[0-9a-f]{6};/iu);
    expect(appCss).toMatch(/--span-neutral:\s*#[0-9a-f]{6};/iu);
    expect(appCss).toMatch(/--span-neutral-soft:\s*#[0-9a-f]{6};/iu);
  });

  it('does not reuse the red-orange accent in coordinate-plane span geometry', () => {
    for (const selector of spanGeometrySelectors) {
      const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
      const rule = new RegExp(`${escapedSelector}\\s*\\{(?<body>[^}]*)\\}`, 'su').exec(appCss);

      expect(rule?.groups?.body, `${selector} should have a CSS rule`).toBeDefined();
      expect(rule?.groups?.body).not.toContain('var(--accent');
    }
  });
});
