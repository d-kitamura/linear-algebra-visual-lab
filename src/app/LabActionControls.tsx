interface LabActionControlsProps {
  readonly exportDisabled: boolean;
  readonly exportDescriptionId?: string;
  readonly onExport: () => void;
  readonly onReset: () => void;
}

export function LabActionControls({
  exportDisabled,
  exportDescriptionId,
  onExport,
  onReset,
}: LabActionControlsProps) {
  return (
    <div className="lab-actions" aria-label="現在のLabの教材状態を操作">
      <button
        className="share-export-button"
        type="button"
        disabled={exportDisabled}
        aria-describedby={exportDescriptionId}
        onClick={onExport}
      >
        共有URLをエクスポート
      </button>
      <button className="reset-button" type="button" onClick={onReset}>
        Reset
      </button>
    </div>
  );
}
