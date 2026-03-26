import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import SimBackend, { clamp } from "./SimBackend";
import { fetchWeatherData, weatherDescriptions, weatherEmoji } from "./weatherApi";
import { LineChart, DualChart, BarChart } from "./Charts";
import { SystemDAG } from "./SystemDAG";
import {
  SunIcon, DropIcon, ThermIcon, AlertTriIcon, GaugeIcon, WrenchIcon,
  ChartIcon, CloudIcon, WindIcon, CheckIcon, BoltIcon, RefreshIcon,
  Gauge, SliderCtrl, RULBar, StatCard, SensorHeatmap,
} from "./UIComponents";

const FAULTS_STATIC = [
  { symptom: "Pressure Drop > 15%", classification: "Vacuum Leak", severity: "Critical", root: "Pump P-102 seal failure" },
  { symptom: "Latent Heat Variance", classification: "LHS Material Fatigue", severity: "Warning", root: "Phase-change material degradation" },
  { symptom: "Bed II Cycle Lag > 3s", classification: "Logic Controller Delay", severity: "Critical", root: "Switching valve mechanical friction" },
];

const card = { background: "#0f172a", borderRadius: 12, border: "1px solid #1e293b", padding: 18, marginBottom: 14 };
const headS = { color: "#e2e8f0", fontSize: 15, fontWeight: 700, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 };

function LoginScreen({ onLogin }) {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr]   = useState("");

  const submit = (e) => {
    e.preventDefault();
    if (user !== "admin" || pass !== "solaris@1234") { setErr("Invalid username or password."); return; }
    onLogin("admin");
  };

  return (
    <div style={{ background: "#020617", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter',-apple-system,sans-serif" }}>
      <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 16, padding: "40px 36px", width: 320 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28 }}>
          <svg width="36" height="36" viewBox="0 0 38 38" fill="none">
            <rect width="38" height="38" rx="10" fill="url(#lg2)"/>
            <defs><linearGradient id="lg2" x1="0" y1="0" x2="38" y2="38" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#f59e0b"/><stop offset="100%" stopColor="#dc2626"/></linearGradient></defs>
            <circle cx="19" cy="19" r="11" stroke="white" strokeWidth="1.5" strokeOpacity="0.35" fill="none"/>
            <circle cx="19" cy="19" r="5.5" fill="white" fillOpacity="0.95"/>
            {[0,45,90,135,180,225,270,315].map((deg, i) => { const r1=13.5, r2=i%2===0?15.5:14.5, a=(deg-90)*Math.PI/180; return <line key={deg} x1={19+r1*Math.cos(a)} y1={19+r1*Math.sin(a)} x2={19+r2*Math.cos(a)} y2={19+r2*Math.sin(a)} stroke="white" strokeWidth={i%2===0?"1.8":"1.1"} strokeOpacity="0.9" strokeLinecap="round"/>; })}
            <line x1="19" y1="19" x2="19" y2="9.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.9"/>
            <circle cx="19" cy="19" r="1.8" fill="#f59e0b"/>
          </svg>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#e2e8f0", letterSpacing: -0.5 }}>Solaris<span style={{ color: "#38bdf8" }}> Admin</span></div>
            <div style={{ fontSize: 9, color: "#475569" }}>Restricted Access</div>
          </div>
        </div>
        <form onSubmit={submit}>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: "#64748b", marginBottom: 5, fontWeight: 500 }}>Username</div>
            <input
              value={user} onChange={e => setUser(e.target.value)} placeholder="admin"
              style={{ width: "100%", background: "#1e293b", border: "1px solid #334155", borderRadius: 8, padding: "9px 12px", color: "#e2e8f0", fontSize: 13, outline: "none", boxSizing: "border-box" }}
            />
          </div>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: "#64748b", marginBottom: 5, fontWeight: 500 }}>Password</div>
            <input
              type="password" value={pass} onChange={e => setPass(e.target.value)} placeholder="••••••••"
              style={{ width: "100%", background: "#1e293b", border: "1px solid #334155", borderRadius: 8, padding: "9px 12px", color: "#e2e8f0", fontSize: 13, outline: "none", boxSizing: "border-box" }}
            />
          </div>
          {err && <div style={{ color: "#f87171", fontSize: 11, marginBottom: 12 }}>{err}</div>}
          <button type="submit" style={{ width: "100%", background: "linear-gradient(135deg,#f59e0b,#dc2626)", border: "none", borderRadius: 8, padding: "10px 0", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer", letterSpacing: 0.3 }}>
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}

export default function App() {
  const [admin, setAdmin] = useState(null);
  const [tab, setTab] = useState("dashboard");
  const [tick, setTick] = useState(0);
  const backendRef = useRef(null);
  if (!backendRef.current) backendRef.current = new SimBackend();
  const backend = backendRef.current;

  // ── Weather State (real API) ──
  const [weather, setWeather] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherSource, setWeatherSource] = useState("");
  const [weatherError, setWeatherError] = useState("");

  const loadWeather = useCallback(async () => {
    setWeatherLoading(true);
    setWeatherError("");
    const result = await fetchWeatherData();
    if (result.success) {
      setWeather(result.data);
      setWeatherSource(result.source);
    } else {
      setWeatherError(result.error);
      setWeatherSource("API Failed — " + result.error);
      setWeather(null);
    }
    setWeatherLoading(false);
  }, []);

  useEffect(() => { loadWeather(); }, [loadWeather]);

  // ── Control Params ──
  const [inflow, setInflow] = useState(60);
  const [cycleTime, setCycleTime] = useState(15);
  const [regenTarget, setRegenTarget] = useState(85);
  const [pressure, setPressure] = useState(45);

  // ── Alerts ──
  const [alerts, setAlerts] = useState([
    { id: 1, msg: "Vacuum leak detected — Pump P-102", sev: "Critical", status: "Unacknowledged", time: "10:42 AM", sig: null },
    { id: 2, msg: "LHS material degradation warning", sev: "Warning", status: "In Progress", time: "09:15 AM", sig: null },
    { id: 3, msg: "Switching valve friction — Bed II", sev: "Critical", status: "Unacknowledged", time: "08:30 AM", sig: null },
  ]);

  const updAlert = (id, st) => {
    setAlerts((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, status: st, sig: st === "Resolved" ? `${admin} (Digital Sig.)` : a.sig } : a
      )
    );
  };

  // ── Live tick ──
  useEffect(() => {
    const iv = setInterval(() => setTick((t) => t + 1), 4000);
    return () => clearInterval(iv);
  }, []);

  // ── Derived data ──
  const nowHour = new Date().getHours() + new Date().getMinutes() / 60;

  const liveSnap = useMemo(
    () => backend.snap(nowHour, { inflow, cycleTime, regenTarget, pressureSetpoint: pressure }),
    [inflow, cycleTime, regenTarget, pressure, tick]
  );

  const history = useMemo(() => backend.hist, []);
  const forecast = useMemo(() => backend.forecast5d(), []);
  const rulData = useMemo(() => backend.getRUL(), []);

  const anomalyHistory = useMemo(() => {
    const d = [];
    for (let i = 0; i < 120; i++) {
      const h = (nowHour - (120 - i) * 0.2 + 48) % 24;
      d.push({ idx: i, error: backend.snap(h).anomalyScore, time: Math.round(h) });
    }
    return d;
  }, [tick]);

  const totalWater = history.reduce((s, d) => s + d.waterProduced, 0);
  const totalEnergy = history.reduce((s, d) => s + d.thermalStored, 0);
  const carbonOffset = (totalEnergy * 0.42).toFixed(1);
  const coolingPriority = clamp(1 - inflow / 130, 0.08, 0.95);

  const tabs = [
    { id: "dashboard", label: "Control Center", icon: <GaugeIcon s={16} /> },
    { id: "weather", label: "Weather & Solar", icon: <SunIcon s={16} /> },
    { id: "fdd", label: "Fault Diagnosis", icon: <AlertTriIcon s={16} /> },
    { id: "maintenance", label: "Maintenance", icon: <WrenchIcon s={16} /> },
    { id: "analytics", label: "Analytics", icon: <ChartIcon s={16} /> },
    { id: "system", label: "System DAG", icon: <BoltIcon s={16} /> },
  ];

  if (!admin) return <LoginScreen onLogin={setAdmin} />;

  return (
    <div style={{ background: "#020617", minHeight: "100vh", color: "#e2e8f0", fontFamily: "'Inter',-apple-system,sans-serif" }}>
      {/* ── HEADER ── */}
      <div style={{ background: "linear-gradient(135deg,#0f172a 0%,#1e1b4b 100%)", borderBottom: "1px solid #1e293b", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <svg width="38" height="38" viewBox="0 0 38 38" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="38" height="38" rx="10" fill="url(#brandGrad)"/>
            <defs>
              <linearGradient id="brandGrad" x1="0" y1="0" x2="38" y2="38" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#f59e0b"/>
                <stop offset="100%" stopColor="#dc2626"/>
              </linearGradient>
            </defs>
            {/* outer ring arc — 270° open at bottom-right */}
            <circle cx="19" cy="19" r="11" stroke="white" strokeWidth="1.5" strokeOpacity="0.35" fill="none"/>
            {/* inner filled core */}
            <circle cx="19" cy="19" r="5.5" fill="white" fillOpacity="0.95"/>
            {/* precision tick marks at cardinal + diagonal angles */}
            {[0,45,90,135,180,225,270,315].map((deg, i) => {
              const r1 = 13.5, r2 = i % 2 === 0 ? 15.5 : 14.5;
              const a = (deg - 90) * Math.PI / 180;
              return (
                <line key={deg}
                  x1={19 + r1 * Math.cos(a)} y1={19 + r1 * Math.sin(a)}
                  x2={19 + r2 * Math.cos(a)} y2={19 + r2 * Math.sin(a)}
                  stroke="white" strokeWidth={i % 2 === 0 ? "1.8" : "1.1"} strokeOpacity="0.9" strokeLinecap="round"
                />
              );
            })}
            {/* needle */}
            <line x1="19" y1="19" x2="19" y2="9.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.9"/>
            <circle cx="19" cy="19" r="1.8" fill="#f59e0b"/>
          </svg>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: -0.5 }}>Solaris<span style={{ color: "#38bdf8" }}> Dashboard</span></div>
            <div style={{ fontSize: 10, color: "#64748b" }}>Digital Twin — MPC-Driven Adsorption Cooling & Desalination</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 11 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 6px #22c55e" }} />
            <span style={{ color: "#94a3b8" }}>System Online</span>
          </div>
          <span style={{ color: "#64748b" }}>TKM College of Engineering, Kollam, IN</span>
          <span style={{ color: "#475569" }}>{new Date().toLocaleString("en-IN")}</span>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#1e293b", border: "1px solid #334155", borderRadius: 8, padding: "4px 10px" }}>
            <div style={{ width: 22, height: 22, borderRadius: "50%", background: "linear-gradient(135deg,#f59e0b,#dc2626)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "white" }}>
              {admin.charAt(0).toUpperCase()}
            </div>
            <span style={{ color: "#cbd5e1", fontSize: 11, fontWeight: 500 }}>{admin}</span>
            <button onClick={() => setAdmin(null)} style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: 11, padding: 0 }}>✕</button>
          </div>
        </div>
      </div>

      {/* ── TABS ── */}
      <div style={{ display: "flex", gap: 1, padding: "0 20px", background: "#0f172a", borderBottom: "1px solid #1e293b", overflowX: "auto" }}>
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ display: "flex", alignItems: "center", gap: 5, padding: "10px 16px", background: tab === t.id ? "#1e293b" : "transparent", border: "none", borderBottom: tab === t.id ? "2px solid #38bdf8" : "2px solid transparent", color: tab === t.id ? "#38bdf8" : "#64748b", cursor: "pointer", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", transition: "all 0.2s" }}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      <div style={{ padding: "16px 20px", maxWidth: 1200, margin: "0 auto" }}>

        {/* ═══════ DASHBOARD ═══════ */}
        {tab === "dashboard" && (
          <div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
              <StatCard icon={<SunIcon s={22} />} label="Solar Irradiance" value={liveSnap.irradiance.toFixed(0)} unit="W/m²" color="#f59e0b" />
              <StatCard icon={<ThermIcon s={22} />} label="Predicted COP" value={liveSnap.cop.toFixed(3)} unit="" color="#38bdf8" />
              <StatCard icon={<DropIcon s={22} />} label="Water Output" value={liveSnap.waterProduced.toFixed(1)} unit="L/h" color="#22d3ee" />
              <StatCard icon={<BoltIcon s={22} />} label="Cooling Capacity" value={liveSnap.coolingCapacity.toFixed(2)} unit="kW" color="#a78bfa" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 14 }}>
              <div style={card}>
                <div style={headS}><GaugeIcon s={18} /> What-If Simulator (MPC)</div>
                <SliderCtrl label="Water Inflow Rate" value={inflow} onChange={setInflow} min={10} max={120} step={1} unit="L/h" />
                <SliderCtrl label="Adsorption Cycle Time" value={cycleTime} onChange={setCycleTime} min={5} max={30} step={1} unit="min" />
                <SliderCtrl label="Regeneration Temp Target" value={regenTarget} onChange={setRegenTarget} min={50} max={120} step={1} unit="°C" />
                <SliderCtrl label="System Pressure Setpoint" value={pressure} onChange={setPressure} min={10} max={100} step={1} unit="mbar" />
                <div style={{ marginTop: 6, padding: "8px 10px", background: "#1e293b", borderRadius: 8, fontSize: 11, color: "#94a3b8" }}>
                  Actual Regen Temp: <b style={{ color: "#f59e0b" }}>{liveSnap.regenTemp}°C</b> (limited by collector) | Evaporator: <b style={{ color: "#22d3ee" }}>{liveSnap.evapTemp}°C</b> | Flow: <b style={{ color: "#a78bfa" }}>{liveSnap.flowRate} L/h</b>
                </div>
              </div>
              <div style={card}>
                <div style={headS}><ChartIcon s={18} /> Predicted Impact</div>
                <div style={{ display: "flex", justifyContent: "space-around", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                  <Gauge value={liveSnap.cop} min={0} max={0.72} label="Predicted COP" color="#38bdf8" />
                  <Gauge value={clamp(liveSnap.cop + (Math.random() - 0.5) * 0.04, 0.04, 0.72)} min={0} max={0.72} label="Actual COP (sim)" color="#22c55e" />
                </div>
                <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 4, display: "flex", justifyContent: "space-between" }}><span>Cooling Priority</span><span>Desalination Priority</span></div>
                <div style={{ background: "#1e293b", borderRadius: 7, height: 16, position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${coolingPriority * 100}%`, background: "linear-gradient(90deg,#38bdf8,#818cf8)", borderRadius: 7, transition: "width 0.4s" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#475569", marginTop: 3 }}>
                  <span>{(coolingPriority * 100).toFixed(0)}%</span>
                  <span>{((1 - coolingPriority) * 100).toFixed(0)}%</span>
                </div>
                <div style={{ marginTop: 12, fontSize: 11, color: "#94a3b8", lineHeight: 1.5 }}>
                  <b style={{ color: "#f59e0b" }}>Trade-off:</b> Increasing inflow boosts desalination but reduces cooling. Collector limits regen to {liveSnap.regenTemp}°C.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════ WEATHER & SOLAR ═══════ */}
        {tab === "weather" && (
          <div>
            {weatherLoading ? (
              <div style={{ ...card, textAlign: "center", padding: 40, color: "#64748b" }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>🛰️</div>Fetching live weather from Open-Meteo API...
              </div>
            ) : weather ? (
              <div>
                {/* Source badge + refresh */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
                  <div style={{ background: "#065f46", color: "#6ee7b7", padding: "4px 12px", borderRadius: 20, fontSize: 10, fontWeight: 600 }}>{weatherSource}</div>
                  <button onClick={loadWeather} style={{ display: "flex", alignItems: "center", gap: 4, background: "#1e293b", border: "1px solid #334155", borderRadius: 8, padding: "6px 12px", color: "#94a3b8", fontSize: 11, cursor: "pointer" }}><RefreshIcon /> Refresh</button>
                </div>

                {/* Current conditions */}
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
                  <StatCard icon={<ThermIcon s={22} />} label="Temperature" value={weather.current?.temperature_2m?.toFixed(1) ?? "--"} unit="°C" color="#ef4444" />
                  <StatCard icon={<DropIcon s={22} />} label="Humidity" value={weather.current?.relative_humidity_2m ?? "--"} unit="%" color="#22d3ee" />
                  <StatCard icon={<WindIcon s={22} />} label="Wind Speed" value={weather.current?.wind_speed_10m?.toFixed(1) ?? "--"} unit="km/h" color="#818cf8" />
                  <StatCard icon={<CloudIcon s={22} />} label="Cloud Cover" value={weather.current?.cloud_cover ?? "--"} unit="%" color="#94a3b8" />
                </div>

                <div style={{ ...card, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                  <div style={{ fontSize: 48 }}>{weatherEmoji(weather.current?.weather_code ?? 0)}</div>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>{weatherDescriptions[weather.current?.weather_code] || "Unknown"}</div>
                    <div style={{ color: "#94a3b8", fontSize: 12 }}>
                      Feels like {weather.current?.apparent_temperature?.toFixed(1) ?? "--"}°C | Surface Pressure: {weather.current?.surface_pressure?.toFixed(0) ?? "--"} hPa
                    </div>
                  </div>
                </div>

                {/* Solar Irradiance (GHI) */}
                {weather.hourly?.shortwave_radiation && (
                  <div style={card}>
                    <div style={headS}><SunIcon s={18} /> Today's Solar Irradiance (GHI)</div>
                    <LineChart data={weather.hourly.shortwave_radiation.slice(0, 24).map((v, i) => ({ hour: i, value: v || 0 }))} dataKey="value" color="#f59e0b" w={560} h={160} label="W/m²" xLabel="Hour of Day" />
                  </div>
                )}

                {/* DNI vs Diffuse */}
                {weather.hourly?.direct_normal_irradiance && (
                  <div style={card}>
                    <div style={headS}><BoltIcon s={18} /> Direct Normal vs Diffuse Radiation</div>
                    <DualChart data={weather.hourly.direct_normal_irradiance.slice(0, 24).map((v, i) => ({ hour: i, dni: v || 0, diffuse: weather.hourly.diffuse_radiation?.[i] || 0 }))} k1="dni" k2="diffuse" c1="#f59e0b" c2="#818cf8" l1="DNI (W/m²)" l2="Diffuse (W/m²)" xLabel="Hour of Day" />
                  </div>
                )}

                {/* Hourly temp + humidity */}
                {weather.hourly?.temperature_2m && (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 14 }}>
                    <div style={card}>
                      <div style={headS}><ThermIcon s={16} /> 24h Temperature</div>
                      <LineChart data={weather.hourly.temperature_2m.slice(0, 24).map((v, i) => ({ hour: i, value: v || 0 }))} dataKey="value" color="#ef4444" w={400} h={140} label="°C" xLabel="Hour of Day" />
                    </div>
                    <div style={card}>
                      <div style={headS}><DropIcon s={16} /> 24h Humidity</div>
                      <LineChart data={weather.hourly.relative_humidity_2m.slice(0, 24).map((v, i) => ({ hour: i, value: v || 0 }))} dataKey="value" color="#22d3ee" w={400} h={140} label="%" xLabel="Hour of Day" />
                    </div>
                  </div>
                )}

                {/* 7-Day forecast */}
                {weather.daily?.time && (
                  <div style={card}>
                    <div style={headS}><CloudIcon s={18} /> 7-Day Forecast</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(115px,1fr))", gap: 8 }}>
                      {weather.daily.time.map((day, i) => (
                        <div key={i} style={{ background: "#1e293b", borderRadius: 10, padding: 12, textAlign: "center" }}>
                          <div style={{ fontSize: 10, color: "#64748b", marginBottom: 4 }}>{new Date(day + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric" })}</div>
                          <div style={{ fontSize: 28 }}>{weatherEmoji(weather.daily.weather_code?.[i] ?? 0)}</div>
                          <div style={{ fontSize: 13, fontWeight: 700, marginTop: 4 }}>{weather.daily.temperature_2m_max?.[i]?.toFixed(0) ?? "--"}° / {weather.daily.temperature_2m_min?.[i]?.toFixed(0) ?? "--"}°</div>
                          <div style={{ fontSize: 9, color: "#94a3b8", marginTop: 2 }}>{weatherDescriptions[weather.daily.weather_code?.[i]] || ""}</div>
                          <div style={{ fontSize: 9, color: "#f59e0b", marginTop: 4 }}>Solar: {((weather.daily.shortwave_radiation_sum?.[i] || 0) / 1000).toFixed(1)} kWh/m²</div>
                          <div style={{ fontSize: 9, color: "#22d3ee" }}>Rain: {weather.daily.precipitation_sum?.[i]?.toFixed(1) ?? 0} mm</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Solar production forecast (simulated) */}
                <div style={card}>
                  <div style={headS}><BoltIcon s={18} /> 5-Day Solar Energy & Water Production Forecast</div>
                  <BarChart data={forecast} dataKey="totalEnergy" color="#f59e0b" labelKey="date" yLabel="kWh/m²" xLabel="Date" />
                  <div style={{ marginTop: 8 }}>
                    <BarChart data={forecast} dataKey="predictedWater" color="#22d3ee" labelKey="date" yLabel="Litres" xLabel="Date" />
                  </div>
                  <div style={{ display: "flex", gap: 20, marginTop: 8, fontSize: 10, color: "#94a3b8" }}>
                    <span><span style={{ display: "inline-block", width: 10, height: 10, background: "#f59e0b", borderRadius: 2, marginRight: 4 }} />Solar Energy (kWh/m²)</span>
                    <span><span style={{ display: "inline-block", width: 10, height: 10, background: "#22d3ee", borderRadius: 2, marginRight: 4 }} />Predicted Water (L)</span>
                  </div>
                </div>

                {/* Sunrise/Sunset */}
                {weather.daily?.sunrise && (
                  <div style={{ ...card, display: "flex", gap: 20, flexWrap: "wrap", justifyContent: "center", fontSize: 12 }}>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 28 }}>🌅</div>
                      <div style={{ color: "#f59e0b", fontWeight: 600 }}>Sunrise</div>
                      <div style={{ color: "#e2e8f0" }}>{new Date(weather.daily.sunrise[0]).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 28 }}>🌇</div>
                      <div style={{ color: "#818cf8", fontWeight: 600 }}>Sunset</div>
                      <div style={{ color: "#e2e8f0" }}>{new Date(weather.daily.sunset[0]).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 28 }}>☀️</div>
                      <div style={{ color: "#22c55e", fontWeight: 600 }}>Daylight</div>
                      <div style={{ color: "#e2e8f0" }}>{((new Date(weather.daily.sunset[0]) - new Date(weather.daily.sunrise[0])) / 36e5).toFixed(1)} hrs</div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ ...card, textAlign: "center", padding: 40 }}>
                <div style={{ color: "#ef4444", fontSize: 14, marginBottom: 8 }}>⚠️ Weather API Error: {weatherError}</div>
                <button onClick={loadWeather} style={{ background: "#1e40af", color: "#93c5fd", border: "none", borderRadius: 8, padding: "8px 20px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Retry</button>
              </div>
            )}
          </div>
        )}

        {/* ═══════ FDD ═══════ */}
        {tab === "fdd" && (
          <div>
            <div style={card}>
              <div style={headS}><AlertTriIcon c="#ef4444" s={18} /> Autoencoder Reconstruction Error (Live)</div>
              <LineChart data={anomalyHistory} dataKey="error" color="#ef4444" w={600} h={170} threshold={0.15} yDom={[0, 0.55]} xKey="idx" label="Anomaly Score" xLabel="Time Steps" />
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, fontSize: 10, color: "#94a3b8" }}>
                <div style={{ width: 18, borderTop: "2px dashed #ef4444" }} /> Threshold (0.15) — spikes trigger fault classification
              </div>
            </div>
            <div style={card}>
              <div style={headS}>Fault Classification Table</div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #1e293b" }}>
                      {["Detected Symptom", "Classification (ML)", "Severity", "Root Cause Analysis"].map((h) => (
                        <th key={h} style={{ textAlign: "left", padding: "7px 10px", color: "#64748b", fontWeight: 600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {FAULTS_STATIC.map((f, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid #1e293b08" }}>
                        <td style={{ padding: "9px 10px", color: "#e2e8f0" }}>{f.symptom}</td>
                        <td style={{ padding: "9px 10px" }}><span style={{ background: "#1e293b", padding: "2px 9px", borderRadius: 20, fontSize: 10, color: "#38bdf8" }}>{f.classification}</span></td>
                        <td style={{ padding: "9px 10px" }}><span style={{ background: f.severity === "Critical" ? "#7f1d1d" : "#78350f", color: f.severity === "Critical" ? "#fca5a5" : "#fcd34d", padding: "2px 9px", borderRadius: 20, fontSize: 10, fontWeight: 600 }}>{f.severity}</span></td>
                        <td style={{ padding: "9px 10px", color: "#94a3b8" }}>{f.root}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div style={card}><div style={headS}>Sensor Anomaly Heatmap</div><SensorHeatmap snapshot={liveSnap} /></div>
          </div>
        )}

        {/* ═══════ MAINTENANCE ═══════ */}
        {tab === "maintenance" && (
          <div>
            <div style={card}>
              <div style={headS}><WrenchIcon s={18} /> Predictive Maintenance — Remaining Useful Life</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {rulData.map((item) => (
                  <div key={item.id} style={{ display: "grid", gridTemplateColumns: "180px 1fr 65px 1fr", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: "1px solid #1e293b" }}>
                    <span style={{ color: "#e2e8f0", fontWeight: 500, fontSize: 12 }}>{item.component}</span>
                    <RULBar value={item.unit === "%" ? item.rul : Math.min(item.rul, 90)} max={item.unit === "%" ? 100 : 90} status={item.status} />
                    <span style={{ textAlign: "center", fontSize: 12, fontWeight: 700, color: item.status === "Critical" ? "#ef4444" : item.status === "Attention" ? "#f59e0b" : "#22c55e" }}>{item.rul} {item.unit}</span>
                    <span style={{ color: "#94a3b8", fontSize: 10 }}>{item.next}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={card}>
              <div style={headS}>Alert Workflow & Event Log</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {alerts.map((a) => (
                  <div key={a.id} style={{ background: "#1e293b", borderRadius: 9, padding: 12, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, borderLeft: `4px solid ${a.sev === "Critical" ? "#ef4444" : "#f59e0b"}` }}>
                    <div>
                      <div style={{ color: "#e2e8f0", fontWeight: 600, fontSize: 12 }}>{a.msg}</div>
                      <div style={{ color: "#64748b", fontSize: 10, marginTop: 3 }}>{a.time} • {a.sev}</div>
                      {a.sig && <div style={{ color: "#22c55e", fontSize: 10, marginTop: 2 }}>Signed: {a.sig}</div>}
                    </div>
                    <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                      {a.status === "Unacknowledged" && (
                        <button onClick={() => updAlert(a.id, "In Progress")} style={{ background: "#1e40af", color: "#93c5fd", border: "none", borderRadius: 5, padding: "5px 12px", fontSize: 10, fontWeight: 600, cursor: "pointer" }}>Acknowledge</button>
                      )}
                      {a.status === "In Progress" && (
                        <button onClick={() => updAlert(a.id, "Resolved")} style={{ background: "#065f46", color: "#6ee7b7", border: "none", borderRadius: 5, padding: "5px 12px", fontSize: 10, fontWeight: 600, cursor: "pointer" }}>Resolve & Sign</button>
                      )}
                      {a.status === "Resolved" && (
                        <span style={{ display: "flex", alignItems: "center", gap: 3, color: "#22c55e", fontSize: 11 }}><CheckIcon /> Resolved</span>
                      )}
                      <span style={{ background: a.status === "Resolved" ? "#065f46" : a.status === "In Progress" ? "#1e3a5f" : "#78350f", color: a.status === "Resolved" ? "#6ee7b7" : a.status === "In Progress" ? "#93c5fd" : "#fcd34d", padding: "4px 9px", borderRadius: 20, fontSize: 9, fontWeight: 600 }}>{a.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ═══════ ANALYTICS ═══════ */}
        {tab === "analytics" && (
          <div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
              <StatCard icon={<DropIcon s={22} />} label="Total Water (24h)" value={totalWater.toFixed(1)} unit="L" color="#22d3ee" />
              <StatCard icon={<SunIcon s={22} />} label="Thermal Energy" value={totalEnergy.toFixed(1)} unit="kWh" color="#f59e0b" />
              <StatCard icon={<ChartIcon s={22} />} label="Carbon Offset" value={carbonOffset} unit="kg CO₂" color="#22c55e" />
            </div>
            <div style={card}>
              <div style={headS}>24-Hour Performance — Solar Irradiance vs. COP</div>
              <DualChart data={history} k1="irradiance" k2="cop" c1="#f59e0b" c2="#38bdf8" l1="Irradiance (W/m²)" l2="COP" xLabel="Hour of Day" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 14 }}>
              <div style={card}><div style={headS}><DropIcon s={16} /> Hourly Water Production</div><LineChart data={history} dataKey="waterProduced" color="#22d3ee" xKey="hour" label="L/h" xLabel="Hour of Day" /></div>
              <div style={card}><div style={headS}><ThermIcon s={16} /> Collector Temperature</div><LineChart data={history} dataKey="collectorTemp" color="#ef4444" xKey="hour" label="°C" xLabel="Hour of Day" /></div>
              <div style={card}><div style={headS}><BoltIcon s={16} /> Pump Power Consumption</div><LineChart data={history} dataKey="pumpPower" color="#a78bfa" xKey="hour" label="kW" xLabel="Hour of Day" /></div>
              <div style={card}><div style={headS}><GaugeIcon s={16} /> Condenser Pressure</div><LineChart data={history} dataKey="condPressure" color="#818cf8" xKey="hour" label="mbar" xLabel="Hour of Day" /></div>
            </div>
          </div>
        )}

        {/* ═══════ SYSTEM DAG ═══════ */}
        {tab === "system" && (
          <SystemDAG snap={liveSnap} tick={tick} cycleTime={cycleTime} />
        )}

      </div>
    </div>
  );
}