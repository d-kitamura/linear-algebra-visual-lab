export interface ZeroSpace0DProps {
  readonly idPrefix?: string;
  readonly spaceLabel?: string;
  readonly spaceName?: 'U' | 'V';
}

/** 0Dを縮退した座標面ではなく、零ベクトルだけからなる一点の空間として示す。 */
export function ZeroSpace0D({
  idPrefix = 'zero-space',
  spaceLabel = '零ベクトル空間',
  spaceName = 'V',
}: ZeroSpace0DProps) {
  return (
    <figure
      className="zero-dimensional-figure"
      role="img"
      aria-labelledby={`${idPrefix}-title ${idPrefix}-description`}
    >
      <figcaption id={`${idPrefix}-title`}>{spaceLabel}</figcaption>
      <svg className="zero-dimensional-space" viewBox="0 0 640 240" aria-hidden="true" focusable="false">
        <circle className="zero-space-halo" cx="320" cy="120" r="42" />
        <circle className="zero-space-point" cx="320" cy="120" r="9" />
        <text className="zero-space-vector-label" x="338" y="108">
          <tspan className="svg-vector-base">0</tspan>
        </text>
        <g className="zero-space-formula" transform="translate(320 190)">
          <text textAnchor="middle">
            <tspan className="zero-space-scalar">{spaceName}</tspan>
            <tspan> = {'{'}</tspan>
            <tspan className="svg-vector-base">0</tspan>
            <tspan>{'}'}</tspan>
            <tspan>，dim(</tspan>
            <tspan className="zero-space-scalar">{spaceName}</tspan>
            <tspan>) = 0</tspan>
          </text>
        </g>
      </svg>
      <p id={`${idPrefix}-description`}>
        この空間にあるベクトルは零ベクトルだけです。方向や長さを変える編集対象はなく、空の組がこの空間の基底です。
      </p>
    </figure>
  );
}
