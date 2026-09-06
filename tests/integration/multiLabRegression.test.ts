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
  validateSharedState,
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
  LOW_DIMENSIONAL_TEACHING_SCENARIOS,
} from '../../src/teaching';
import vectorSpaceFixture from '../fixtures/share-url-v3.json';
import basisDimensionFixture from '../fixtures/share-url-basis-dimension-v1.json';
import linearMapFixture from '../fixtures/share-url-linear-map-v1.json';

const PRODUCTION_BASE_URL = 'https://d-kitamura.github.io/linear-algebra-visual-lab/';

const fixtures = [
  {
    lab: 'vector-space',
    url: vectorSpaceFixture.url,
    state: validateSharedState(vectorSpaceFixture.expectedState),
  },
  {
    lab: 'basis-dimension',
    url: basisDimensionFixture.url,
    state: validateSharedState(basisDimensionFixture.expectedState),
  },
  {
    lab: 'linear-map',
    url: linearMapFixture.url,
    state: validateSharedState(linearMapFixture.expectedState),
  },
] as const;

describe('フェーズ9.7・10.8 複数Lab統合回帰', () => {
  it('低次元の13共有例は対象Lab・次元だけを置換し、他のInitialStateを維持する', () => {
    const defaults = {
      vector: createAppInitialization(PRODUCTION_BASE_URL),
      basis: createBasisDimensionInitialization(PRODUCTION_BASE_URL),
      map: createLinearMapInitialization(PRODUCTION_BASE_URL),
    };
    for (const example of LOW_DIMENSIONAL_TEACHING_SCENARIOS) {
      const state = example.state;
      const url = buildShareUrl(PRODUCTION_BASE_URL, state);
      const initial = {
        vector: createAppInitialization(url),
        basis: createBasisDimensionInitialization(url),
        map: createLinearMapInitialization(url),
      };
      for (const key of ['vector', 'basis', 'map'] as const) {
        const isTargetLab = state.lab === ({ vector: 'vector-space', basis: 'basis-dimension', map: 'linear-map' } as const)[key];
        expect(initial[key].source).toBe(isTargetLab ? 'shared' : 'default');
        const selectedKey = state.lab === 'linear-map'
          ? `${state.sourceDimension}-to-${state.targetDimension}` : String(state.dim);
        for (const [dimension, value] of Object.entries(initial[key].initialStates)) {
          if (!isTargetLab || dimension !== selectedKey) {
            expect(value).toEqual(Object.entries(defaults[key].initialStates).find(([id]) => id === dimension)?.[1]);
          }
        }
      }
    }
  });

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
      expect(readShareStateFromUrl(buildShareUrl(PRODUCTION_BASE_URL, resetState))).toEqual({ status: 'success', state: fixture.state });
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
    const includingLowDimensions = [...allScenarios, ...LOW_DIMENSIONAL_TEACHING_SCENARIOS];
    expect(includingLowDimensions).toHaveLength(41);
    expect(new Set(includingLowDimensions.map((scenario) => scenario.id)).size).toBe(41);
  });
});
