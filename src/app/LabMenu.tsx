const labs = [
  {
    id: 'vector-space',
    name: 'ベクトル空間Lab',
    description: 'span・一次結合を2D／3Dで調べる',
    available: true,
  },
  {
    id: 'basis-dimension',
    name: '基底・次元Lab',
    description: 'フェーズ8で準備中',
    available: false,
  },
] as const;

export function LabMenu() {
  const activeLab = labs[0];

  return (
    <nav className="lab-menu" aria-label="教材Lab">
      <details>
        <summary aria-label={`教材Labを選択。現在は${activeLab.name}`}>
          <span className="lab-menu-caption">Lab</span>
          <strong>{activeLab.name}</strong>
          <span className="lab-menu-chevron" aria-hidden="true">⌄</span>
        </summary>
        <div className="lab-menu-popover">
          <p className="lab-menu-heading">教材Labを選択</p>
          <span
            className="lab-menu-item is-current"
            aria-current="page"
          >
            <span>
              <strong>{activeLab.name}</strong>
              <small>{activeLab.description}</small>
            </span>
            <span className="lab-menu-current" aria-hidden="true">表示中</span>
          </span>
          <span className="lab-menu-item is-unavailable" aria-disabled="true">
            <span>
              <strong>{labs[1].name}</strong>
              <small>{labs[1].description}</small>
            </span>
            <span className="lab-menu-soon">準備中</span>
          </span>
        </div>
      </details>
    </nav>
  );
}
