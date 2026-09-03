import { describe, expect, it } from 'vitest';
import {
  createBasisDimensionInitialization,
  createBasisDimensionShareState,
} from '../../src/labs/basis-dimension/basisDimensionInitialization';
import {
  createLinearMapInitialization,
  createLinearMapShareState,
} from '../../src/labs/linear-map/linearMapInitialization';
import {
  buildShareUrl,
  createShareQrCodeDataUrl,
  readShareStateFromUrl,
  type SharedState,
} from '../../src/sharing';
import { createAppInitialization } from '../../src/state';
import {
  BASIS_DIMENSION_TEACHING_SCENARIOS,
  LINEAR_COMBINATION_TEACHING_SCENARIOS,
  LINEAR_MAP_TEACHING_SCENARIOS,
  THREE_DIMENSIONAL_LINEAR_COMBINATION_SCENARIOS,
  THREE_DIMENSIONAL_TEACHING_SCENARIOS,
  TWO_DIMENSIONAL_TEACHING_SCENARIOS,
} from '../../src/teaching';
import vectorSpaceFixture from '../fixtures/share-url-v3.json';
import basisDimensionFixture from '../fixtures/share-url-basis-dimension-v1.json';
import linearMapFixture from '../fixtures/share-url-linear-map-v1.json';

const PRODUCTION_BASE_URL = 'https://d-kitamura.github.io/linear-algebra-visual-lab/';

const fixtures = [
  {
    lab: 'vector-space',
    url: vectorSpaceFixture.url,
    state: vectorSpaceFixture.expectedState as SharedState,
  },
  {
    lab: 'basis-dimension',
    url: basisDimensionFixture.url,
    state: basisDimensionFixture.expectedState as SharedState,
  },
  {
    lab: 'linear-map',
    url: linearMapFixture.url,
    state: linearMapFixture.expectedState as SharedState,
  },
] as const;

describe('フェーズ9.7 複数Lab統合回帰', () => {
  for (const fixture of fixtures) {
    it(`${fixture.lab}の固定URLは対象Labだけを共有InitialStateにする`, () => {
      expect(readShareStateFromUrl(fixture.url)).toEqual({
        status: 'success',
        state: fixture.state,
      });

      const sources = {
        'vector-space': createAppInitialization(fixture.url).source,
        'basis-dimension': createBasisDimensionInitialization(fixture.url).source,
        'linear-map': createLinearMapInitialization(fixture.url).source,
      };

      expect(sources[fixture.lab]).toBe('shared');
      for (const [lab, source] of Object.entries(sources)) {
        if (lab !== fixture.lab) {
          expect(source).toBe('default');
        }
      }
    });

    it(`${fixture.lab}の共有InitialStateはResetの基準状態として再生成できる`, () => {
      let resetState: SharedState;
      if (fixture.state.lab === 'vector-space') {
        const initialization = createAppInitialization(fixture.url);
        resetState = initialization.initialStates[fixture.state.dim];
      } else if (fixture.state.lab === 'basis-dimension') {
        const initialization = createBasisDimensionInitialization(fixture.url);
        resetState = createBasisDimensionShareState(
          initialization.initialStates[fixture.state.dim],
        );
      } else {
        const initialization = createLinearMapInitialization(fixture.url);
        resetState = createLinearMapShareState(
          initialization.initialStates[initialization.activeShapeId],
        );
      }

      expect(resetState).toEqual(fixture.state);
      expect(buildShareUrl(PRODUCTION_BASE_URL, resetState)).toBe(fixture.url);
    });
  }

  it('3つの固定共有URLをすべてブラウザ内でQRコードへ変換できる', async () => {
    for (const fixture of fixtures) {
      const qrCode = await createShareQrCodeDataUrl(fixture.url);
      expect(qrCode).toMatch(/^data:image\/png;base64,/u);
    }
  });

  it('3つのLabに計28件の重複しない代表例を維持する', () => {
    const vectorSpaceScenarios = [
      ...TWO_DIMENSIONAL_TEACHING_SCENARIOS,
      ...LINEAR_COMBINATION_TEACHING_SCENARIOS,
      ...THREE_DIMENSIONAL_TEACHING_SCENARIOS,
      ...THREE_DIMENSIONAL_LINEAR_COMBINATION_SCENARIOS,
    ];
    const allScenarios = [
      ...vectorSpaceScenarios,
      ...BASIS_DIMENSION_TEACHING_SCENARIOS,
      ...LINEAR_MAP_TEACHING_SCENARIOS,
    ];

    expect(vectorSpaceScenarios).toHaveLength(16);
    expect(BASIS_DIMENSION_TEACHING_SCENARIOS).toHaveLength(4);
    expect(LINEAR_MAP_TEACHING_SCENARIOS).toHaveLength(8);
    expect(allScenarios).toHaveLength(28);
    expect(new Set(allScenarios.map((scenario) => scenario.id))).toHaveProperty('size', 28);
  });
});
