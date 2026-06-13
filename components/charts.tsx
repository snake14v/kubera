"use client";

export function KpiTile({
  label,
  value,
  sub,
  accent = false,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-sm border border-cream/10 bg-forest-850 p-5 transition-colors duration-300 hover:border-gold-500/30">
      <p className="font-body text-[10px] font-bold uppercase tracking-brand text-cream/45">{label}</p>
      <p className={`mt-2 font-display text-3xl font-bold tabular-nums ${accent ? "text-gold-400" : "text-cream"}`}>
        {value}
      </p>
      {sub && <p className="mt-1 font-body text-xs text-cream/45">{sub}</p>}
    </div>
  );
}

export function BarChart({
  data,
  color = "#B59556",
  height = 170,
}: {
  data: { label: string; value: number }[];
  color?: string;
  height?: number;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const barsH = height - 22; // leave room for hour labels
  return (
    <div className="flex items-end gap-1.5" style={{ height }}>
      {data.map((d, i) => (
        <div key={d.label + i} className="flex flex-1 flex-col items-center justify-end">
          <div
            className="w-full rounded-[2px] transition-opacity duration-300 hover:opacity-80"
            style={{ backgroundColor: color, height: Math.max(2, (d.value / max) * barsH) }}
          />
          <span className="mt-2 font-body text-[9px] text-cream/40">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

type Series = { name: string; color: string; data: number[] };

export function LineChart({
  labels,
  series,
  height = 190,
}: {
  labels: string[];
  series: Series[];
  height?: number;
}) {
  const W = 600;
  const H = 200;
  const pad = { l: 8, r: 8, t: 12, b: 22 };
  const max = Math.max(1, ...series.flatMap((s) => s.data));
  const n = labels.length;
  const x = (i: number) => pad.l + (i * (W - pad.l - pad.r)) / Math.max(1, n - 1);
  const y = (v: number) => pad.t + (1 - v / max) * (H - pad.t - pad.b);

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height }} preserveAspectRatio="none">
        {[0.25, 0.5, 0.75].map((g) => (
          <line key={g} x1={pad.l} x2={W - pad.r} y1={pad.t + g * (H - pad.t - pad.b)} y2={pad.t + g * (H - pad.t - pad.b)} stroke="#E8DFC9" strokeOpacity="0.07" />
        ))}
        {series.map((s) => {
          const d = s.data.map((v, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(v)}`).join(" ");
          return (
            <g key={s.name}>
              <path d={d} fill="none" stroke={s.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              {s.data.map((v, i) => (
                <circle key={i} cx={x(i)} cy={y(v)} r="2.5" fill={s.color} />
              ))}
            </g>
          );
        })}
        {labels.map((l, i) => (
          <text key={l + i} x={x(i)} y={H - 6} textAnchor="middle" fontSize="9" fill="#E8DFC9" fillOpacity="0.4">{l}</text>
        ))}
      </svg>
      <div className="mt-2 flex gap-4">
        {series.map((s) => (
          <span key={s.name} className="flex items-center gap-2 font-body text-[11px] text-cream/55">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
            {s.name}
          </span>
        ))}
      </div>
    </div>
  );
}

export function Gauge({ value, label }: { value: number; label: string }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value)) / 100;
  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 140 140" className="h-36 w-36">
        <circle cx="70" cy="70" r={r} fill="none" stroke="#E8DFC9" strokeOpacity="0.1" strokeWidth="10" />
        <circle
          cx="70" cy="70" r={r} fill="none" stroke="#B59556" strokeWidth="10" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct)} transform="rotate(-90 70 70)"
        />
        <text x="70" y="68" textAnchor="middle" fontSize="30" fontWeight="700" fill="#D6B693" className="font-display">{value}</text>
        <text x="70" y="86" textAnchor="middle" fontSize="10" fill="#E8DFC9" fillOpacity="0.45">/ 100</text>
      </svg>
      <p className="mt-1 font-body text-[11px] font-bold uppercase tracking-brand text-cream/50">{label}</p>
    </div>
  );
}
