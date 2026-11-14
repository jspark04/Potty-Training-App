/** 270° countdown arc that drains as the next try approaches. */
const R = 122;
const C = 150;
const pt = (deg: number) => {
  const a = (deg * Math.PI) / 180;
  return [C + R * Math.cos(a), C + R * Math.sin(a)];
};
const [sx, sy] = pt(135);
const [ex, ey] = pt(45);
const ARC = `M ${sx} ${sy} A ${R} ${R} 0 1 1 ${ex} ${ey}`;

export function Gauge({ fraction, tone, children }: { fraction: number; tone: string; children: React.ReactNode }) {
  const f = Math.min(1, Math.max(0, fraction));
  const [dx, dy] = pt(135 + 270 * f);
  return (
    <div className={`gauge ${tone}`}>
      <svg viewBox="0 0 300 300" aria-hidden>
        <path d={ARC} className="gauge-track" />
        <path d={ARC} className="gauge-fill" pathLength={100} strokeDasharray={`${f * 100} 100`} />
        {f > 0.01 && <circle cx={dx} cy={dy} r="9" className="gauge-dot" />}
      </svg>
      <div className="gauge-body">{children}</div>
    </div>
  );
}
