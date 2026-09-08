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
import { createRepresentationInitialization, createRepresentationShareState } from '../../src/labs/representation-matrix/representationSharing';
import { activeRepresentationScene, activeRepresentationViews, resetRepresentationWorkspace, updateActiveRepresentationScene, representationChangeId } from '../../src/labs/representation-matrix/representationWorkspace';
import { editRepresentationValue } from '../../src/labs/representation-matrix/representationMatrixState';
import {
  BASIS_DIMENSION_TEACHING_SCENARIOS,
  LINEAR_COMBINATION_TEACHING_SCENARIOS,
  LINEAR_MAP_TEACHING_SCENARIOS,
  THREE_DIMENSIONAL_LINEAR_COMBINATION_SCENARIOS,
  THREE_DIMENSIONAL_TEACHING_SCENARIOS,
  TWO_DIMENSIONAL_TEACHING_SCENARIOS,
  LOW_DIMENSIONAL_TEACHING_SCENARIOS,
  REPRESENTATION_MATRIX_TEACHING_SCENARIOS,
} from '../../src/teaching';
import vectorSpaceFixture from '../fixtures/share-url-v3.json';
import basisDimensionFixture from '../fixtures/share-url-basis-dimension-v1.json';
import linearMapFixture from '../fixtures/share-url-linear-map-v1.json';
import representationFixture from '../fixtures/share-url-representation-matrix-v1.json';

const PRODUCTION_BASE_URL = 'https://d-kitamura.github.io/linear-algebra-visual-lab/';

const fixtures = [
  {
    lab: 'representation-matrix',
    url: representationFixture.url,
    state: validateSharedState(representationFixture.expectedState),
  },
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

describe('フェーズ9.7・10.8・11.9 複数Lab統合回帰', () => {
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

      for (const [lab, source] of Object.entries(sources)) {
        expect(source).toBe(lab === fixture.lab ? 'shared' : 'default');
      }
      const representation = createRepresentationInitialization(fixture.url);
      if (fixture.lab !== 'representation-matrix') {
        expect(representation).toEqual(createRepresentationInitialization(PRODUCTION_BASE_URL));
      } else {
        expect(representation.errorMessage).toBeNull();
        const workspace = representation.initialWorkspace;
        expect(createRepresentationShareState(activeRepresentationScene(workspace), activeRepresentationViews(workspace))).toEqual(fixture.state);
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
      } else if (fixture.state.lab === 'linear-map') {
        const initialization = createLinearMapInitialization(fixture.url);
        resetState = createLinearMapShareState(
          initialization.initialStates[initialization.activeShapeId],
        );
      } else {
        const initial = createRepresentationInitialization(fixture.url).initialWorkspace;
        // UIのResetと同じ経路で編集後に戻す。共有時の基底順序・視点も比較する。
        const edited = updateActiveRepresentationScene(initial, (scene) => editRepresentationValue(scene, 'input', 0, 0, 91));
        const restored = resetRepresentationWorkspace(edited, initial);
        resetState = createRepresentationShareState(activeRepresentationScene(restored), activeRepresentationViews(restored), restored.mode, restored.changeDirections[representationChangeId(restored)]);
      }

      expect(resetState).toEqual(fixture.state);
      expect(readShareStateFromUrl(buildShareUrl(PRODUCTION_BASE_URL, resetState))).toEqual({ status: 'success', state: fixture.state });
    });
  }

  it('4つの固定共有URLをローカルでQRコードへ変換できる', async () => {
    for (const fixture of fixtures) {
      const qrCode = await createShareQrCodeDataUrl(fixture.url);
      expect(qrCode).toMatch(/^data:image\/png;base64,/u);
    }
  });

  it('既存28例・低次元13例・第四Lab11例の計52例を維持し、他Labへ状態を漏らさない', () => {
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
    const allFourLabs = [...includingLowDimensions, ...REPRESENTATION_MATRIX_TEACHING_SCENARIOS];
    expect(allFourLabs).toHaveLength(52);
    expect(new Set(allFourLabs.map((scenario) => scenario.id)).size).toBe(52);
    // 代表例はMarkdownから開く。URLの他Labへの漏出を4つの初期化APIで検証する。
    const initializers = {
      'vector-space': createAppInitialization,
      'basis-dimension': createBasisDimensionInitialization,
      'linear-map': createLinearMapInitialization,
      'representation-matrix': createRepresentationInitialization,
    };
    for (const scenario of allFourLabs) {
      const url = buildShareUrl(PRODUCTION_BASE_URL, scenario.state);
      expect(readShareStateFromUrl(url)).toEqual({ status: 'success', state: validateSharedState(scenario.state) });
      for (const [lab, initialize] of Object.entries(initializers)) {
        if (lab !== scenario.state.lab) expect(initialize(url)).toEqual(initialize(PRODUCTION_BASE_URL));
      }
    }
  });
});
