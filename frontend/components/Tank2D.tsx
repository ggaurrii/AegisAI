const WAVE = "M0 22 Q150 2 300 22 T600 22 T900 22 T1200 22 V40 H0 Z";

export default function Tank2D({ level }: { level: number }) {
  const pct = Math.max(0, Math.min(100, level));
  return (
    <div className="tank2" role="img" aria-label={`Tank level ${Math.round(pct)} percent`}>
      <div className="water" style={{ height: `${pct}%` }}>
        <svg className="wave" viewBox="0 0 1200 40" preserveAspectRatio="none" aria-hidden="true">
          <path d={WAVE} />
        </svg>
        <svg className="wave b" viewBox="0 0 1200 40" preserveAspectRatio="none" aria-hidden="true">
          <path d={WAVE} />
        </svg>
      </div>
    </div>
  );
}
