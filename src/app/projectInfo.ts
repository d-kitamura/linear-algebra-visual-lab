import packageMetadata from '../../package.json';

export const projectInfo = {
  name: 'Linear Algebra Visual Lab',
  version: packageMetadata.version,
  phase: `初版候補 v${packageMetadata.version}`,
  status: 'フェーズ6「共有と配布の仕上げ」',
  repositoryUrl: 'https://github.com/d-kitamura/linear-algebra-visual-lab',
} as const;
