import packageMetadata from '../../package.json';

export const projectInfo = {
  name: 'Linear Algebra Visual Lab',
  version: packageMetadata.version,
  phase: `初版候補 v${packageMetadata.version}`,
  status: 'フェーズ8「複数Lab基盤と基底・次元Lab」',
  repositoryUrl: 'https://github.com/d-kitamura/linear-algebra-visual-lab',
} as const;
