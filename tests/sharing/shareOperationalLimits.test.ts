import { describe, expect, it } from 'vitest';
import {
  MAX_ABSOLUTE_CAMERA_TARGET,
  MAX_ABSOLUTE_COORDINATE,
  MAX_OPERATIONAL_SHARE_URL_LENGTH,
  buildShareUrl,
  createShareQrCodeDataUrl,
  type ShareState,
} from '../../src/sharing';
import {
  LINEAR_COMBINATION_TEACHING_SCENARIOS,
  THREE_DIMENSIONAL_LINEAR_COMBINATION_SCENARIOS,
  THREE_DIMENSIONAL_TEACHING_SCENARIOS,
  TWO_DIMENSIONAL_TEACHING_SCENARIOS,
} from '../../src/teaching';

const PRODUCTION_BASE_URL = 'https://d-kitamura.github.io/linear-algebra-visual-lab/';
const reachableBoundaryState: ShareState = {
  v: 3,
  lab: 'vector-space',
  dim: 3,
  vectors: Array.from({ length: 8 }, (_, index) => ({
    id: `a${index + 1}`,
    name: `a${'₁₂₃₄₅₆₇₈'[index]}`,
    coordinates: [
      index % 2 === 0 ? MAX_ABSOLUTE_COORDINATE : -MAX_ABSOLUTE_COORDINATE,
      index % 2 === 0 ? -999_999.999999 : 999_999.999999,
      index % 2 === 0 ? 0.000001 : -0.000001,
    ],
  })),
  spanSelection: Array.from({ length: 8 }, (_, index) => `a${index + 1}`),
  visualization: {
    showSpan: true,
    camera: {
      direction: [0.70710678, -0.70710678, 0],
      target: [
        MAX_ABSOLUTE_CAMERA_TARGET,
        -MAX_ABSOLUTE_CAMERA_TARGET,
        9_999_999.999999,
      ],
      up: [0, 0, 1],
      zoom: 100,
    },
  },
  linearCombination: {
    visible: true,
    target: [MAX_ABSOLUTE_COORDINATE, -999_999.999999, 0.000001],
  },
};

describe('共有URL・QRコードの運用上限', () => {
  it('代表例16件が本番URLで運用上限に収まる', () => {
    const scenarios = [
      ...TWO_DIMENSIONAL_TEACHING_SCENARIOS,
      ...LINEAR_COMBINATION_TEACHING_SCENARIOS,
      ...THREE_DIMENSIONAL_TEACHING_SCENARIOS,
      ...THREE_DIMENSIONAL_LINEAR_COMBINATION_SCENARIOS,
    ];
    const lengths = scenarios.map((scenario) => (
      buildShareUrl(PRODUCTION_BASE_URL, scenario.state).length
    ));

    expect(scenarios).toHaveLength(16);
    expect(Math.min(...lengths)).toBe(286);
    expect(Math.max(...lengths)).toBe(612);
    expect(Math.max(...lengths)).toBeLessThanOrEqual(MAX_OPERATIONAL_SHARE_URL_LENGTH);
  });

  it('画面から到達可能な8本・3D境界状態も運用上限に収まる', () => {
    const shareUrl = buildShareUrl(PRODUCTION_BASE_URL, reachableBoundaryState);

    expect(shareUrl).toHaveLength(1_309);
    expect(shareUrl.length).toBeLessThanOrEqual(MAX_OPERATIONAL_SHARE_URL_LENGTH);
  });

  it('8本・3D境界状態の完全URLを誤り訂正MのPNGへ変換できる', async () => {
    const shareUrl = buildShareUrl(PRODUCTION_BASE_URL, reachableBoundaryState);
    const dataUrl = await createShareQrCodeDataUrl(shareUrl);

    expect(dataUrl).toMatch(/^data:image\/png;base64,/u);
  });
});
