import { useRef } from 'react';

export type LabId = 'vector-space' | 'basis-dimension';

const labs = [
  {
    id: 'vector-space',
    name: 'ベクトル空間Lab',
    description: 'span・一次結合を2D／3Dで調べる',
  },
  {
    id: 'basis-dimension',
    name: '基底・次元Lab',
    description: '基底の2条件と次元を2D／3Dで調べる',
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
