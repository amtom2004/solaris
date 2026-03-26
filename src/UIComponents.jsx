import React, { useMemo } from "react";
import { clamp } from "./SimBackend";
import {
  Sun, Droplets, Thermometer, TriangleAlert, Gauge as GaugeLucide,
  Wrench, ChartColumn, Cloud, Wind, CircleCheck, Zap, RefreshCw,
} from "lucide-react";

export function SunIcon({ s = 20 }) { return <Sun size={s} />; }
export function DropIcon({ s = 20 }) { return <Droplets size={s} />; }
export function ThermIcon({ s = 20 }) { return <Thermometer size={s} />; }
export function AlertTriIcon({ c, s = 20 }) { return <TriangleAlert size={s} color={c} />; }
export function GaugeIcon({ s = 20 }) { return <GaugeLucide size={s} />; }
export function WrenchIcon({ s = 20 }) { return <Wrench size={s} />; }
export function ChartIcon({ s = 20 }) { return <ChartColumn size={s} />; }
export function CloudIcon({ s = 20 }) { return <Cloud size={s} />; }
export function WindIcon({ s = 20 }) { return <Wind size={s} />; }
export function CheckIcon({ s = 16 }) { return <CircleCheck size={s} />; }
export function BoltIcon({ s = 20 }) { return <Zap size={s} />; }
export function RefreshIcon({ s = 16 }) { return <RefreshCw size={s} />; }

// ═══════════════════════════════════════════════════════
//  Gauge
// ═══════════════════════════════════════════════════════
export function Gauge({ value, min = 0, max = 1, label, color, size = 110 }) {
  const pct = clamp((value - min) / (max - min), 0, 1);
  const r = size / 2 - 14;
  const cx = size / 2, cy = size / 2;
  const sA = -135 * Math.PI / 180;
  const nA = (-135 + pct * 270) * Math.PI / 180;
  const eA = 135 * Math.PI / 180;
  const x1 = cx + r * Math.cos(sA), y1 = cy + r * Math.sin(sA);
  const nx = cx + (r - 6) * Math.cos(nA), ny = cy + (r - 6) * Math.sin(nA);
  const ax = cx + r * Math.cos(nA), ay = cy + r * Math.sin(nA);

  return (
    <div style={{ textAlign: "center" }}>
      <svg width={size} height={size * 0.72} viewBox={`0 0 ${size} ${size * 0.72}`}>
        <path d={`M${x1} ${y1} A${r} ${r} 0 1 1 ${cx + r * Math.cos(eA)} ${cy + r * Math.sin(eA)}`} fill="none" stroke="#1e293b" strokeWidth="7" strokeLinecap="round" />
        <path d={`M${x1} ${y1} A${r} ${r} 0 ${pct > 0.5 ? 1 : 0} 1 ${ax} ${ay}`} fill="none" stroke={color} strokeWidth="7" strokeLinecap="round" />
        <circle cx={cx} cy={cy} r="3.5" fill={color} />
        <line x1={cx} y1={cy} x2={nx} y2={ny} stroke={color} strokeWidth="2.5" strokeLinecap="round" />
        <text x={cx} y={cy + 18} textAnchor="middle" fill="#e2e8f0" fontSize="13" fontWeight="700">
          {typeof value === "number" ? value.toFixed(3) : value}
        </text>
      </svg>
      <div style={{ color: "#94a3b8", fontSize: 10, marginTop: -2 }}>{label}</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
//  Slider
// ═══════════════════════════════════════════════════════
export function SliderCtrl({ label, value, onChange, min, max, step, unit }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ color: "#cbd5e1", fontSize: 12, fontWeight: 500 }}>{label}</span>
        <span style={{ color: "#38bdf8", fontSize: 12, fontWeight: 700 }}>{value} {unit}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ width: "100%", accentColor: "#38bdf8", cursor: "pointer" }}
      />
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "#475569" }}>
        <span>{min}</span><span>{max} {unit}</span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
//  RUL Progress Bar
// ═══════════════════════════════════════════════════════
export function RULBar({ value, max = 100, status }) {
  const pct = clamp(value / max * 100, 0, 100);
  const c = status === "Critical" ? "#ef4444" : status === "Attention" ? "#f59e0b" : "#22c55e";
  return (
    <div style={{ background: "#1e293b", borderRadius: 5, height: 8, width: "100%", overflow: "hidden" }}>
      <div style={{ width: `${pct}%`, height: "100%", background: c, borderRadius: 5, transition: "width 0.5s" }} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════
//  Stat Card
// ═══════════════════════════════════════════════════════
export function StatCard({ icon, label, value, unit, color }) {
  return (
    <div style={{ background: "#0f172a", borderRadius: 12, border: "1px solid #1e293b", padding: 14, display: "flex", alignItems: "center", gap: 12, flex: "1 1 165px", minWidth: 155, marginBottom: 14 }}>
      <div style={{ background: `${color}20`, borderRadius: 9, padding: 9, display: "flex", alignItems: "center", justifyContent: "center" }}>{icon}</div>
      <div>
        <div style={{ color: "#94a3b8", fontSize: 10, marginBottom: 1 }}>{label}</div>
        <div style={{ color: "#e2e8f0", fontSize: 18, fontWeight: 700 }}>
          {value} <span style={{ fontSize: 11, color: "#64748b", fontWeight: 400 }}>{unit}</span>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
//  Sensor Anomaly Heatmap
// ═══════════════════════════════════════════════════════
export function SensorHeatmap({ snapshot }) {
  const sensors = ["Temperature", "Pressure", "Flow"];
  const zones = ["Bed I", "Bed II", "Desorber", "Condenser"];

  const scores = useMemo(() => {
    const s = {};
    sensors.forEach((sensor) => {
      zones.forEach((zone) => {
        let base = 0.05 + Math.random() * 0.12;
        if (snapshot.faults.some((f) => f.sensor === sensor)) {
          if (zone === "Bed II" && sensor === "Flow") base = 0.7 + Math.random() * 0.25;
          else if (sensor === "Pressure") base = 0.45 + Math.random() * 0.35;
          else if (sensor === "Temperature") base = 0.3 + Math.random() * 0.25;
        }
        s[`${sensor}-${zone}`] = Math.round(base * 100) / 100;
      });
    });
    return s;
  }, [snapshot]);

  const colorFor = (v) => v < 0.25 ? "#064e3b" : v < 0.45 ? "#a16207" : v < 0.65 ? "#c2410c" : "#dc2626";

  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
      <thead>
        <tr>
          <th style={{ padding: "5px 8px", color: "#64748b", textAlign: "left" }}>Sensor</th>
          {zones.map((z) => <th key={z} style={{ padding: "5px 8px", color: "#64748b" }}>{z}</th>)}
        </tr>
      </thead>
      <tbody>
        {sensors.map((sensor) => (
          <tr key={sensor}>
            <td style={{ padding: "5px 8px", color: "#cbd5e1", fontWeight: 500 }}>{sensor}</td>
            {zones.map((zone) => {
              const v = scores[`${sensor}-${zone}`];
              return (
                <td key={zone} style={{ padding: "4px 6px", textAlign: "center" }}>
                  <div style={{ background: colorFor(v), borderRadius: 5, padding: "5px 0", color: "#fff", fontWeight: 600, fontSize: 10 }}>{v.toFixed(2)}</div>
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}