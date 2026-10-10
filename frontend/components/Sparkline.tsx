interface Props {
  values: number[];
  label: string;
  baseline?: number;
  color?: string;
  height?: number;
  max?: number;
}

export default function Sparkline({ values, label, baseline, color = "var(--lagoon)", height = 64, max }: Props) {
  const width = 360;
  if (values.length < 2) return <div className="muted small" style={{ height }}>Collecting readings...</div>;
  const top = (max ?? Math.max(...values, baseline ?? 0, 1)) * 1.1;
  const x = (i: number) => (i / (values.length - 1)) * width;
  const y = (v: number) => height - 3 - (Math.max(0, v) / top) * (height - 8);
  const line = values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} role="img" aria-label={label} preserveAspectRatio="none">
      {baseline !== undefined && (
        <line x1="0" x2={width} y1={y(baseline)} y2={y(baseline)} stroke="var(--mute)" strokeWidth="1" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
      )}
      <path d={`${line} L${width},${height} L0,${height} Z`} fill={color} opacity="0.12" />
      <path d={line} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
}
