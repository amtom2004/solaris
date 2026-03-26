// ═══════════════════════════════════════════════════════
//  SystemDAG.jsx — Live Process Flow Diagram (v2)
//  High-contrast P&ID-style digital twin visualization
// ═══════════════════════════════════════════════════════

// ── Glow / animation styles ────────────────────────────
const STYLES = `
  @keyframes flowMove { from { stroke-dashoffset: 32; } to { stroke-dashoffset: 0; } }
  @keyframes flowMoveSlow { from { stroke-dashoffset: 32; } to { stroke-dashoffset: 0; } }
  @keyframes pulseGlow { 0%,100% { opacity: 0.6; } 50% { opacity: 1; } }
  .dag-node { cursor: pointer; transition: filter 0.2s; }
  .dag-node:hover rect.node-body { filter: brightness(1.3); }
  .dag-node:hover { filter: drop-shadow(0 0 10px var(--nc)); }
`;

// ── Process Node ───────────────────────────────────────
function Node({ cx, cy, title, sub, val, unit, color, active, fault, w = 148, h = 66 }) {
  const x = cx - w / 2, y = cy - h / 2;
  const statusColor =
    fault === "Critical" ? "#ef4444" :
    fault === "Attention" ? "#f59e0b" :
    active ? "#22c55e" : "#2d4a6a";
  const borderColor = active ? color : color + "55";
  const bgColor = active ? color + "22" : "#0b1829";
  const titleColor = active ? "#f1f5f9" : "#7fa3c7";
  const subColor = active ? color : color + "77";
  const valColor = active ? "#e2e8f0" : "#4a6a8a";

  return (
    <g className="dag-node" style={{ "--nc": color }}>
      {/* outer glow when active */}
      {active && (
        <rect x={x - 2} y={y - 2} width={w + 4} height={h + 4} rx={10}
          fill="none" stroke={color} strokeWidth={1} strokeOpacity={0.3}
          style={{ animation: "pulseGlow 2s ease-in-out infinite", filter: `blur(3px)` }} />
      )}
      {/* body */}
      <rect className="node-body" x={x} y={y} width={w} height={h} rx={8}
        fill={bgColor} stroke={borderColor} strokeWidth={active ? 1.5 : 1} />
      {/* left accent bar */}
      <rect x={x} y={y + 6} width={3} height={h - 12} rx={2} fill={color} opacity={active ? 0.9 : 0.35} />
      {/* title */}
      <text x={x + 14} y={cy - 10} fontSize="11" fontWeight="700" fill={titleColor}>{title}</text>
      {/* sub */}
      <text x={x + 14} y={cy + 4} fontSize="9" fill={subColor}>{sub}</text>
      {/* value */}
      <text x={x + 14} y={cy + 18} fontSize="11" fontWeight="700" fill={valColor}>
        {val !== undefined ? `${val}` : "—"}
        {unit && <tspan fontSize="9" fill={subColor}> {unit}</tspan>}
      </text>
      {/* status dot */}
      <circle cx={x + w - 11} cy={y + 11} r={5} fill={statusColor}
        style={fault ? { filter: `drop-shadow(0 0 5px ${statusColor})` } : {}} />
      {fault && (
        <text x={x + w - 11} y={y + 26} textAnchor="middle" fontSize="7" fill={statusColor}
          fontWeight="700">{fault}</text>
      )}
    </g>
  );
}

// ── Diamond valve ──────────────────────────────────────
function Valve({ cx, cy, label, active, color = "#94a3b8" }) {
  const s = 16;
  return (
    <g>
      {active && (
        <polygon points={`${cx},${cy - s - 2} ${cx + s + 2},${cy} ${cx},${cy + s + 2} ${cx - s - 2},${cy}`}
          fill="none" stroke={color} strokeWidth={1} strokeOpacity={0.4}
          style={{ animation: "pulseGlow 2s ease-in-out infinite", filter: "blur(2px)" }} />
      )}
      <polygon points={`${cx},${cy - s} ${cx + s},${cy} ${cx},${cy + s} ${cx - s},${cy}`}
        fill={active ? color + "28" : "#0b1829"}
        stroke={active ? color : color + "44"}
        strokeWidth={active ? 1.5 : 1} />
      <text x={cx} y={cy + 4} textAnchor="middle" fontSize="7" fontWeight="800"
        fill={active ? color : color + "66"}>{label}</text>
    </g>
  );
}

// ── Output terminal ────────────────────────────────────
function Output({ cx, cy, label, val, unit, color, active, r = 38 }) {
  return (
    <g>
      {active && (
        <circle cx={cx} cy={cy} r={r + 4} fill="none" stroke={color} strokeWidth={1}
          strokeOpacity={0.35} style={{ animation: "pulseGlow 2s ease-in-out infinite", filter: "blur(3px)" }} />
      )}
      <circle cx={cx} cy={cy} r={r}
        fill={active ? color + "22" : "#0b1829"}
        stroke={active ? color : color + "44"}
        strokeWidth={active ? 2 : 1} />
      <text x={cx} y={cy - 10} textAnchor="middle" fontSize="8" fontWeight="700"
        fill={active ? color : color + "66"}>{label}</text>
      <text x={cx} y={cy + 5} textAnchor="middle" fontSize="14" fontWeight="800"
        fill={active ? "#f1f5f9" : "#2d4a6a"}>{val}</text>
      <text x={cx} y={cy + 20} textAnchor="middle" fontSize="8"
        fill={active ? "#64748b" : "#1e3050"}>{unit}</text>
    </g>
  );
}

// ── Pipe / flow line ───────────────────────────────────
function Pipe({ pts, active, color, label, speed = 1.4, id }) {
  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0]},${p[1]}`).join(" ");
  const mid = pts[Math.floor(pts.length / 2)];
  const uid = `f_${id}`;

  return (
    <g>
      {/* base pipe — always visible */}
      <path d={d} fill="none"
        stroke={active ? color : color + "33"}
        strokeWidth={active ? 2.5 : 1.2}
        strokeLinecap="round" strokeLinejoin="round"
        strokeDasharray={active ? "10 6" : "4 8"}
        style={active ? { animation: `flowMove ${speed}s linear infinite` } : {}}
      />
      {/* glow halo on active */}
      {active && (
        <path d={d} fill="none" stroke={color} strokeWidth={7}
          strokeOpacity={0.12} strokeLinecap="round" strokeLinejoin="round" />
      )}
      {/* flow label */}
      {label && active && (
        <text x={mid[0]} y={mid[1] - 8} textAnchor="middle" fontSize="8.5" fontWeight="700" fill={color}
          style={{ paintOrder: "stroke", stroke: "#020617", strokeWidth: 4 }}>{label}</text>
      )}
      {label && !active && (
        <text x={mid[0]} y={mid[1] - 7} textAnchor="middle" fontSize="8" fill={color + "44"}>{label}</text>
      )}
      {active && (
        <style>{`@keyframes ${uid} { from { stroke-dashoffset: 32; } to { stroke-dashoffset: 0; } }`}</style>
      )}
    </g>
  );
}

// ── Pipe type legend ───────────────────────────────────
const PIPE_TYPES = [
  { color: "#f97316", label: "Hot regen fluid" },
  { color: "#a78bfa", label: "Refrigerant liquid" },
  { color: "#22d3ee", label: "Refrigerant vapor / product water" },
  { color: "#818cf8", label: "Vacuum / pressure line" },
];

// ══════════════════════════════════════════════════════
export function SystemDAG({ snap, tick, cycleTime }) {
  const ticksPerHalfCycle = Math.max(1, Math.round((cycleTime * 60) / 4 / 2));
  const halfCycle = Math.floor(tick / ticksPerHalfCycle) % 2;
  const bed1Desorbing = halfCycle === 0;
  const solar = snap.irradiance > 50;

  const faultPump  = snap.faults.some(f => f.classification === "Vacuum Leak") ? "Critical" : null;
  const faultBedI  = snap.faults.some(f => f.sensor === "Pressure") ? "Critical" : null;

  // ── Node centres ──
  const SX=100,  SY=280;   // Solar Collector
  const HX=285,  HY=280;   // HX-01
  const B1X=475, B1Y=148;  // Bed I
  const B2X=475, B2Y=412;  // Bed II
  const VX=475,  VY=280;   // Valve V-05
  const CX=670,  CY=148;   // Condenser
  const EX=670,  EY=412;   // Evaporator
  const PX=858,  PY=412;   // Pump P-102
  const DX=475,  DY=500;   // Desalination
  const COUTX=900, COUTY=280; // Cooling output
  const FWATX=670, FWATY=500; // Fresh water

  const bed1Color = bed1Desorbing ? "#f97316" : "#38bdf8";
  const bed2Color = !bed1Desorbing ? "#f97316" : "#38bdf8";

  return (
    <div style={{ background: "#020c1a", borderRadius: 14, border: "1px solid #1e3050", overflow: "hidden" }}>
      <style>{STYLES}</style>

      {/* ── Header ── */}
      <div style={{ padding: "13px 20px", borderBottom: "1px solid #1e3050", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, background: "#050f20" }}>
        <div>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0" }}>System Architecture — Live Process Flow</span>
          <span style={{ marginLeft: 12, fontSize: 10, color: solar ? "#22c55e" : "#f59e0b", fontWeight: 600 }}>
            {solar ? "● Solar Active" : "● Night Mode — System Idle"}
          </span>
        </div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          {[["#22c55e","Active"],["#ef4444","Fault"],["#f59e0b","Attention"],["#2d4a6a","Idle"]].map(([c, l]) => (
            <span key={l} style={{ fontSize: 10, color: "#64748b", display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: c, display: "inline-block" }} />{l}
            </span>
          ))}
        </div>
      </div>

      {/* ── SVG Diagram ── */}
      <svg width="100%" viewBox="0 0 1000 545" style={{ display: "block" }}>

        {/* ── PIPES ── */}

        {/* Solar → HX-01 */}
        <Pipe id="s_hx" pts={[[SX+82,SY],[HX-66,HY]]} active={solar} color="#f59e0b" label={solar ? `${snap.irradiance} W/m²` : ""}/>

        {/* HX-01 → Bed I (hot regen, upper) */}
        <Pipe id="hx_b1" pts={[[HX+66,HY],[390,HY],[390,B1Y],[B1X-74,B1Y]]} active={solar && bed1Desorbing} color="#f97316" label={`${snap.regenTemp}°C`}/>

        {/* HX-01 → Bed II (hot regen, lower) */}
        <Pipe id="hx_b2" pts={[[HX+66,HY],[390,HY],[390,B2Y],[B2X-74,B2Y]]} active={solar && !bed1Desorbing} color="#f97316" label={`${snap.regenTemp}°C`}/>

        {/* Bed I → Condenser (refrigerant vapor when desorbing) */}
        <Pipe id="b1_cond" pts={[[B1X+74,B1Y],[CX-74,CY]]} active={solar && bed1Desorbing} color="#22d3ee" label="vapor →"/>

        {/* Bed II → Condenser (vapor, route up) */}
        <Pipe id="b2_cond" pts={[[B2X+74,B2Y],[580,B2Y],[580,CY],[CX-74,CY]]} active={solar && !bed1Desorbing} color="#22d3ee" label="vapor →"/>

        {/* Condenser → Evaporator (liquid refrigerant) */}
        <Pipe id="cond_evap" pts={[[CX,CY+33],[CX,EY-33]]} active={solar} color="#a78bfa" label="liquid ↓" speed={2}/>

        {/* Evaporator → Bed I vapor (Bed I adsorbing) */}
        <Pipe id="evap_b1" pts={[[EX-74,EY],[540,EY],[540,B1Y],[B1X+74,B1Y]]} active={solar && !bed1Desorbing} color="#22d3ee" label="← vapor"/>

        {/* Evaporator → Bed II vapor (Bed II adsorbing) */}
        <Pipe id="evap_b2" pts={[[EX-74,EY],[B2X+74,B2Y]]} active={solar && bed1Desorbing} color="#22d3ee"/>

        {/* Pump → Evaporator (vacuum line) */}
        <Pipe id="pump_evap" pts={[[PX-83,PY],[EX+74,EY]]} active={solar} color="#818cf8" speed={3}/>

        {/* HX-01 → Desalination (excess thermal) */}
        <Pipe id="hx_desal" pts={[[HX,HY+33],[HX,DY],[DX-75,DY]]} active={solar} color="#22d3ee" label="thermal"/>

        {/* Desalination → Fresh Water */}
        <Pipe id="desal_fw" pts={[[DX+75,DY],[FWATX-38,FWATY]]} active={solar} color="#22d3ee" label={`${snap.waterProduced} L/h`}/>

        {/* Evaporator → Cooling output */}
        <Pipe id="evap_cool" pts={[[EX+74,EY],[COUTX-38,COUTY]]} active={solar} color="#22d3ee" label={`${snap.coolingCapacity.toFixed(1)} kW`}/>

        {/* ── NODES ── */}

        <Node cx={SX}  cy={SY}  title="Solar Collector"     sub="Flat-plate array"           val={snap.irradiance}              unit="W/m²" color="#f59e0b" active={solar}            w={162}/>
        <Node cx={HX}  cy={HY}  title="HX-01"               sub="Heat exchanger"              val={`${snap.collectorTemp}°C`}                color="#f59e0b" active={solar}            w={124}/>
        <Node cx={B1X} cy={B1Y} title="Adsorption Bed I"    sub={bed1Desorbing ? "Desorbing — Regen (hot)" : "Adsorbing — Cooling"} val={snap.bedI_T}  unit="°C" color={bed1Color} active={solar} fault={faultBedI}/>
        <Node cx={B2X} cy={B2Y} title="Adsorption Bed II"   sub={!bed1Desorbing ? "Desorbing — Regen (hot)" : "Adsorbing — Cooling"} val={snap.bedII_T} unit="°C" color={bed2Color} active={solar}/>
        <Valve cx={VX} cy={VY} label="V-05" active={solar} color="#94a3b8"/>
        <Node cx={CX}  cy={CY}  title="Condenser"           sub="Vapor → Liquid"              val={snap.condPressure}            unit="mbar" color="#a78bfa" active={solar}/>
        <Node cx={EX}  cy={EY}  title="Evaporator"          sub="Liquid → Vapor (cold)"       val={snap.evapTemp}                unit="°C"   color="#22d3ee" active={solar}/>
        <Node cx={PX}  cy={PY}  title="Vacuum Pump P-102"   sub="System vacuum"               val={snap.pumpPower}               unit="kW"   color="#818cf8" active={solar} fault={faultPump} w={162}/>
        <Node cx={DX}  cy={DY}  title="Desalination Unit"   sub="Multi-effect thermal"        val={snap.waterProduced}           unit="L/h"  color="#22d3ee" active={solar} w={150}/>

        <Output cx={COUTX} cy={COUTY} label="COOLING"     val={snap.coolingCapacity.toFixed(1)} unit="kW"  color="#22d3ee" active={solar}/>
        <Output cx={FWATX} cy={FWATY} label="FRESH WATER" val={snap.waterProduced}              unit="L/h" color="#38bdf8" active={solar}/>

        {/* ── Pipe legend ── */}
        <g transform="translate(16, 500)">
          {PIPE_TYPES.map(({ color, label }, i) => (
            <g key={label} transform={`translate(${i * 230}, 0)`}>
              <line x1={0} y1={4} x2={22} y2={4} stroke={color} strokeWidth={2} strokeDasharray="7 4"/>
              <text x={28} y={8} fontSize="8.5" fill="#64748b">{label}</text>
            </g>
          ))}
        </g>
      </svg>

      {/* ── Footer status bar ── */}
      <div style={{ padding: "11px 20px", borderTop: "1px solid #1e3050", background: "#050f20", display: "flex", gap: 24, flexWrap: "wrap", fontSize: 11, color: "#64748b" }}>
        <span>Cycle: <b style={{ color: "#38bdf8" }}>{bed1Desorbing ? "Bed I → Desorb  |  Bed II → Adsorb" : "Bed II → Desorb  |  Bed I → Adsorb"}</b></span>
        <span>Regen: <b style={{ color: "#f97316" }}>{snap.regenTemp}°C</b></span>
        <span>Evap: <b style={{ color: "#22d3ee" }}>{snap.evapTemp}°C</b></span>
        <span>COP: <b style={{ color: "#22c55e" }}>{snap.cop}</b></span>
        <span>Cond: <b style={{ color: "#a78bfa" }}>{snap.condPressure} mbar</b></span>
        <span>Anomaly: <b style={{ color: snap.anomalyScore > 0.15 ? "#ef4444" : "#22c55e" }}>{snap.anomalyScore.toFixed(3)}</b></span>
      </div>
    </div>
  );
}
