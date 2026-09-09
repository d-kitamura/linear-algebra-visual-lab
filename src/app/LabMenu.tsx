import { useRef } from 'react';

export type LabId = 'vector-space' | 'basis-dimension' | 'linear-map' | 'representation-matrix' | 'eigenspace';

const labs = [
  // 表示順は既存Labを維持し、追加単元は末尾へ置く。
  {
    id: 'vector-space',
    name: 'ベクトル空間Lab',
    description: 'span・一次結合を0D〜3Dで調べる',
  },
  {
    id: 'basis-dimension',
    name: '基底・次元Lab',
    description: '基底の2条件・次元・座標を0D〜3Dで調べる',
  },
  {
    id: 'linear-map',
    name: '線形写像Lab',
    description: '入力と像・行列の列・格子の変形を調べる',
  },
  {
    id: 'representation-matrix',
    name: '表現行列・基底変換Lab',
    description: '数ベクトル・多項式の基底と表現行列・座標を調べる（1D〜3D）',
  },
  {
    id: 'eigenspace',
    name: '固有値・固有空間Lab',
    description: '入力と像・実固有値・固有空間を調べる（0〜3D）',
  },
] as const;

interface LabMenuProps {
  readonly activeLabId: LabId;
  readonly onLabChange: (labId: LabId) => void;
}

export function LabMenu({ activeLabId, onLabChange }: LabMenuProps) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const activeLab = labs.find((lab) => lab.id === activeLabId) ?? labs[0];

  function handleLabChange(labId: LabId): void {
    onLabChange(labId);
    detailsRef.current?.removeAttribute('open');
  }

  return (
    <nav className="lab-menu" aria-label="教材Lab">
      <details ref={detailsRef}>
        <summary aria-label={`教材Labを選択。現在は${activeLab.name}`}>
          <span className="lab-menu-caption">Lab</span>
          <strong>{activeLab.name}</strong>
          <span className="lab-menu-chevron" aria-hidden="true">⌄</span>
        </summary>
        <div className="lab-menu-popover">
          <p className="lab-menu-heading">教材Labを選択</p>
          {labs.map((lab) => {
            const isCurrent = lab.id === activeLabId;
            return (
              <button
                key={lab.id}
                className={`lab-menu-item ${isCurrent ? 'is-current' : ''}`}
                type="button"
                aria-current={isCurrent ? 'page' : undefined}
                onClick={() => handleLabChange(lab.id)}
              >
                <span>
                  <strong>{lab.name}</strong>
                  <small>{lab.description}</small>
                </span>
                {isCurrent ? (
                  <span className="lab-menu-current" aria-hidden="true">表示中</span>
                ) : (
                  <span className="lab-menu-open" aria-hidden="true">開く</span>
                )}
              </button>
            );
          })}
        </div>
      </details>
    </nav>
  );
}
