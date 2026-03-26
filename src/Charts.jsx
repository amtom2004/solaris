import { useState } from "react";

// ═══════════════════════════════════════════════════════
//  Reusable SVG chart components
//  — axis labels on both axes
//  — hover crosshair + tooltip
// ═══════════════════════════════════════════════════════

// Shared tooltip box
function Tooltip({ x, y, lines, w: tw = 110 }) {
  const th = lines.length * 14 + 10;
  const flip = x > 380; // flip left if near right edge
  const tx = flip ? x - tw - 8 : x + 8;
  const ty = Math.max(4, y - th / 2);
  return (
    <g style={{ pointerEvents: "none" }}>
      <rect x={tx} y={ty} width={tw} height={th} rx={5}
        fill="#0f172a" stroke="#334155" strokeWidth={1} opacity={0.97} />
      {lines.map(({ text, color }, i) => (
        <text key={i} x={tx + 8} y={ty + 13 + i * 14} fontSize="9" fontWeight="600" fill={color || "#e2e8f0"}>
          {text}
        </text>
      ))}
    </g>
  );
}

// ── LineChart ─────────────────────────────────────────
export function LineChart({
  data, dataKey, color,
  w = 520, h = 160,
  threshold, yDom,
  xKey = "hour", label,
  xLabel, areaFill = true,
}) {
  const [hov, setHov] = useState(null);
  if (!data || !data.length) return null;

  const vals = data.map((d) => d[dataKey]);
  const mn = yDom ? yDom[0] : Math.min(...vals) * 0.85;
  const mx = yDom ? yDom[1] : Math.max(...vals) * 1.15 || 1;
  const pad = { t: 16, r: 16, b: 36, l: 54 };
  const cw = w - pad.l - pad.r;
  const ch = h - pad.t - pad.b;

  const sx = (i) => pad.l + (i / (data.length - 1)) * cw;
  const sy = (v) => pad.t + ch - ((v - mn) / (mx - mn || 1)) * ch;

  const linePts = data
    .map((d, i) => `${i === 0 ? "M" : "L"}${sx(i).toFixed(1)},${sy(d[dataKey]).toFixed(1)}`)
    .join(" ");
  const areaPath = `${linePts} L${sx(data.length - 1).toFixed(1)},${pad.t + ch} L${pad.l},${pad.t + ch} Z`;
  const uid = `g-${dataKey}-${color.replace("#", "")}`;
  const step = Math.max(1, Math.floor(data.length / 8));

  const handleMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mx_ = ((e.clientX - rect.left) / rect.width) * w;
    const idx = Math.max(0, Math.min(data.length - 1, Math.round((mx_ - pad.l) / cw * (data.length - 1))));
    setHov(idx);
  };

  const hovD = hov !== null ? data[hov] : null;
  const hovX = hov !== null ? sx(hov) : 0;
  const hovY = hovD ? sy(hovD[dataKey]) : 0;
  const xLbl = hovD ? (typeof hovD[xKey] === "number" ? `${String(Math.round(hovD[xKey])).padStart(2,"0")}:00` : hovD[xKey]) : "";

  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ display: "block", overflow: "visible" }}
      onMouseMove={handleMove} onMouseLeave={() => setHov(null)}>
      <defs>
        <linearGradient id={uid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0.01" />
        </linearGradient>
      </defs>

      {/* Y-axis label */}
      {label && (
        <text transform={`translate(10,${pad.t + ch / 2}) rotate(-90)`}
          textAnchor="middle" fill="#475569" fontSize="8.5" fontWeight="500">{label}</text>
      )}

      {/* Grid + Y-axis ticks */}
      {[0, 0.25, 0.5, 0.75, 1].map((f, i) => {
        const y = pad.t + ch * (1 - f);
        const val = mn + (mx - mn) * f;
        return (
          <g key={i}>
            <line x1={pad.l} y1={y} x2={pad.l + cw} y2={y} stroke="#1e293b" strokeWidth="0.6" />
            <text x={pad.l - 6} y={y + 3} textAnchor="end" fill="#64748b" fontSize="8">
              {val < 10 ? val.toFixed(2) : Math.round(val)}
            </text>
          </g>
        );
      })}

      {/* Threshold line */}
      {threshold != null && (
        <g>
          <line x1={pad.l} y1={sy(threshold)} x2={pad.l + cw} y2={sy(threshold)}
            stroke="#ef4444" strokeWidth="1.5" strokeDasharray="5 3" />
          <text x={pad.l + cw + 2} y={sy(threshold) + 3} fill="#ef4444" fontSize="7">{threshold}</text>
        </g>
      )}

      {/* Area + line */}
      {areaFill && <path d={areaPath} fill={`url(#${uid})`} />}
      <path d={linePts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />

      {/* X-axis ticks */}
      {data.filter((_, i) => i % step === 0).map((d) => {
        const idx = data.indexOf(d);
        const lbl = typeof d[xKey] === "number" ? `${String(d[xKey]).padStart(2, "0")}:00` : d[xKey];
        return (
          <text key={idx} x={sx(idx)} y={pad.t + ch + 14} textAnchor="middle" fill="#64748b" fontSize="8">{lbl}</text>
        );
      })}

      {/* X-axis label */}
      {xLabel && (
        <text x={pad.l + cw / 2} y={h - 2} textAnchor="middle" fill="#475569" fontSize="8.5" fontWeight="500">{xLabel}</text>
      )}

      {/* Hover crosshair */}
      {hov !== null && hovD && (
        <g>
          <line x1={hovX} y1={pad.t} x2={hovX} y2={pad.t + ch}
            stroke={color} strokeWidth={1} strokeDasharray="3 3" strokeOpacity={0.6} />
          <circle cx={hovX} cy={hovY} r={4} fill={color} stroke="#0f172a" strokeWidth={1.5} />
          <Tooltip x={hovX} y={hovY}
            lines={[{ text: xLbl, color: "#64748b" }, { text: `${Number(hovD[dataKey]).toFixed(2)} ${label || ""}`, color }]}
          />
        </g>
      )}

      {/* Invisible hit area */}
      <rect x={pad.l} y={pad.t} width={cw} height={ch} fill="transparent" />
    </svg>
  );
}

// ── DualChart ─────────────────────────────────────────
export function DualChart({ data, k1, k2, c1, c2, l1, l2, w = 520, h = 180, xLabel }) {
  const [hov, setHov] = useState(null);
  if (!data || !data.length) return null;

  const mx1 = Math.max(...data.map((d) => d[k1])) * 1.15 || 1;
  const mx2 = Math.max(...data.map((d) => d[k2])) * 1.15 || 1;
  const pad = { t: 14, r: 56, b: 38, l: 56 };
  const cw = w - pad.l - pad.r;
  const ch = h - pad.t - pad.b;

  const sx  = (i) => pad.l + (i / (data.length - 1)) * cw;
  const sy1 = (v) => pad.t + ch - (v / mx1) * ch;
  const sy2 = (v) => pad.t + ch - (v / mx2) * ch;

  const line1 = data.map((d, i) => `${i === 0 ? "M" : "L"}${sx(i).toFixed(1)},${sy1(d[k1]).toFixed(1)}`).join(" ");
  const line2 = data.map((d, i) => `${i === 0 ? "M" : "L"}${sx(i).toFixed(1)},${sy2(d[k2]).toFixed(1)}`).join(" ");

  const handleMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mx_ = ((e.clientX - rect.left) / rect.width) * w;
    const idx = Math.max(0, Math.min(data.length - 1, Math.round((mx_ - pad.l) / cw * (data.length - 1))));
    setHov(idx);
  };

  const hovD = hov !== null ? data[hov] : null;
  const hovX = hov !== null ? sx(hov) : 0;

  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ display: "block", overflow: "visible" }}
      onMouseMove={handleMove} onMouseLeave={() => setHov(null)}>

      {/* Y-axis labels */}
      <text transform={`translate(10,${pad.t + ch / 2}) rotate(-90)`}
        textAnchor="middle" fill={c1} fontSize="8.5" fontWeight="500">{l1}</text>
      <text transform={`translate(${w - 10},${pad.t + ch / 2}) rotate(90)`}
        textAnchor="middle" fill={c2} fontSize="8.5" fontWeight="500">{l2}</text>

      {/* Grid + dual Y ticks */}
      {[0, 0.5, 1].map((f, i) => {
        const y = pad.t + ch * (1 - f);
        return (
          <g key={i}>
            <line x1={pad.l} y1={y} x2={pad.l + cw} y2={y} stroke="#1e293b" strokeWidth="0.5" />
            <text x={pad.l - 6} y={y + 3} textAnchor="end" fill={c1} fontSize="8">{Math.round(mx1 * f)}</text>
            <text x={pad.l + cw + 6} y={y + 3} textAnchor="start" fill={c2} fontSize="8">{(mx2 * f).toFixed(2)}</text>
          </g>
        );
      })}

      <path d={line1} fill="none" stroke={c1} strokeWidth="2.5" strokeLinejoin="round" opacity="0.9" />
      <path d={line2} fill="none" stroke={c2} strokeWidth="2" strokeLinejoin="round" strokeDasharray="6 3" />

      {/* X ticks */}
      {data.filter((_, i) => i % 3 === 0).map((d) => {
        const idx = data.indexOf(d);
        return (
          <text key={idx} x={sx(idx)} y={pad.t + ch + 14} textAnchor="middle" fill="#64748b" fontSize="8">
            {String(d.hour).padStart(2, "0")}:00
          </text>
        );
      })}

      {/* X-axis label */}
      {xLabel && (
        <text x={pad.l + cw / 2} y={h - 2} textAnchor="middle" fill="#475569" fontSize="8.5" fontWeight="500">{xLabel}</text>
      )}

      {/* Legend */}
      <g transform={`translate(${pad.l + cw / 2 - 95},${h - 8})`}>
        <line x1="0" y1="0" x2="14" y2="0" stroke={c1} strokeWidth="2.5" />
        <text x="18" y="4" fill={c1} fontSize="8">{l1}</text>
        <line x1="115" y1="0" x2="129" y2="0" stroke={c2} strokeWidth="2" strokeDasharray="4 2" />
        <text x="133" y="4" fill={c2} fontSize="8">{l2}</text>
      </g>

      {/* Hover crosshair */}
      {hov !== null && hovD && (
        <g>
          <line x1={hovX} y1={pad.t} x2={hovX} y2={pad.t + ch}
            stroke="#94a3b8" strokeWidth={1} strokeDasharray="3 3" strokeOpacity={0.5} />
          <circle cx={hovX} cy={sy1(hovD[k1])} r={4} fill={c1} stroke="#0f172a" strokeWidth={1.5} />
          <circle cx={hovX} cy={sy2(hovD[k2])} r={4} fill={c2} stroke="#0f172a" strokeWidth={1.5} />
          <Tooltip x={hovX} y={(sy1(hovD[k1]) + sy2(hovD[k2])) / 2} tw={130}
            lines={[
              { text: `${String(hovD.hour ?? "").padStart(2,"0")}:00`, color: "#64748b" },
              { text: `${l1}: ${Number(hovD[k1]).toFixed(1)}`, color: c1 },
              { text: `${l2}: ${Number(hovD[k2]).toFixed(3)}`, color: c2 },
            ]}
          />
        </g>
      )}

      <rect x={pad.l} y={pad.t} width={cw} height={ch} fill="transparent" />
    </svg>
  );
}

// ── BarChart ──────────────────────────────────────────
export function BarChart({ data, dataKey, color, labelKey, w = 520, h = 140, yLabel, xLabel }) {
  const [hov, setHov] = useState(null);
  if (!data || !data.length) return null;

  const vals = data.map((d) => d[dataKey]);
  const mx = Math.max(...vals) * 1.15 || 1;
  const pad = { t: 16, r: 16, b: 44, l: 50 };
  const cw = w - pad.l - pad.r;
  const ch = h - pad.t - pad.b;
  const bw = Math.min(40, (cw / data.length) * 0.65);
  const gap = (cw - bw * data.length) / (data.length + 1);

  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ display: "block", overflow: "visible" }}>

      {/* Y-axis label */}
      {yLabel && (
        <text transform={`translate(10,${pad.t + ch / 2}) rotate(-90)`}
          textAnchor="middle" fill="#475569" fontSize="8.5" fontWeight="500">{yLabel}</text>
      )}

      {/* Grid + Y ticks */}
      {[0, 0.5, 1].map((f, i) => {
        const y = pad.t + ch * (1 - f);
        return (
          <g key={i}>
            <line x1={pad.l} y1={y} x2={pad.l + cw} y2={y} stroke="#1e293b" strokeWidth="0.5" />
            <text x={pad.l - 6} y={y + 3} textAnchor="end" fill="#64748b" fontSize="8">{(mx * f).toFixed(1)}</text>
          </g>
        );
      })}

      {/* Bars */}
      {data.map((d, i) => {
        const bh = Math.max(2, (d[dataKey] / mx) * ch);
        const x = pad.l + gap + i * (bw + gap);
        const isHov = hov === i;
        return (
          <g key={i} onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(null)}
            style={{ cursor: "pointer" }}>
            <rect x={x} y={pad.t + ch - bh} width={bw} height={bh} rx={3}
              fill={color} opacity={isHov ? 1 : 0.78} />
            {isHov && (
              <rect x={x - 2} y={pad.t + ch - bh - 2} width={bw + 4} height={bh + 2} rx={4}
                fill="none" stroke={color} strokeWidth={1.5} />
            )}
            <text x={x + bw / 2} y={pad.t + ch - bh - 5} textAnchor="middle"
              fill={isHov ? "#f1f5f9" : color} fontSize="8" fontWeight="600">{d[dataKey]}</text>
            <text x={x + bw / 2} y={pad.t + ch + 14} textAnchor="middle" fill="#64748b" fontSize="7.5"
              transform={`rotate(-28,${x + bw / 2},${pad.t + ch + 14})`}>{d[labelKey]}</text>
            {/* Tooltip */}
            {isHov && (
              <Tooltip x={x + bw / 2} y={pad.t + ch - bh - 10}
                lines={[
                  { text: String(d[labelKey]), color: "#94a3b8" },
                  { text: `${d[dataKey]} ${yLabel || ""}`, color },
                ]}
              />
            )}
          </g>
        );
      })}

      {/* X-axis label */}
      {xLabel && (
        <text x={pad.l + cw / 2} y={h - 2} textAnchor="middle" fill="#475569" fontSize="8.5" fontWeight="500">{xLabel}</text>
      )}
    </svg>
  );
}
