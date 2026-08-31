import packageMetadata from '../../package.json';

export const projectInfo = {
  name: 'Linear Algebra Visual Lab',
  version: packageMetadata.version,
  phase: `初版候補 v${packageMetadata.version}`,
  status: 'フェーズ9「線形写像Lab」',
  repositoryUrl: 'https://github.com/d-kitamura/linear-algebra-visual-lab',
} as const;
