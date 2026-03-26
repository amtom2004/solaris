// ═══════════════════════════════════════════════════════
//  SimBackend — Physics-based solar thermal simulation
//  Generates convincing sensor data, anomalies, and RUL
// ═══════════════════════════════════════════════════════

export function clamp(v, lo, hi) {
  return Math.min(Math.max(v, lo), hi);
}

export function gauss() {
  let u = 0, v = 0;
  while (!u) u = Math.random();
  while (!v) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function nv(base, sigma) {
  return base + gauss() * sigma;
}

export default class SimBackend {
  constructor() {
    this.lat = 8.8932; // TKM College of Engineering, Kollam
    this.lon = 76.6141;
    this.doy = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 864e5);

    // Base climate for Kerala coast
    this.ambT = 28.7;
    this.cloud = 0.15;
    this.hum = 72;
    this.wind = 3.8;

    // Component health (drives fault injection)
    this.lhsH = 0.88;
    this.pumpH = 0.72;
    this.valveH = 0.65;
    this.dirt = 0.15;

    this.hist = [];
    this._buildHist();
  }

  // ── Solar position & irradiance model ──
  solar(hour, cf) {
    const cFactor = cf ?? this.cloud;
    const decl = 23.45 * Math.sin((2 * Math.PI / 365) * (this.doy - 81));
    const lr = this.lat * Math.PI / 180;
    const dr = decl * Math.PI / 180;
    const ha = (hour - 12) * 15 * Math.PI / 180;
    const sa = Math.sin(lr) * Math.sin(dr) + Math.cos(lr) * Math.cos(dr) * Math.cos(ha);
    const alt = Math.asin(clamp(sa, -1, 1));
    if (alt <= 0) return 0;
    const am = 1 / (sa + 0.50572 * Math.pow(6.07995 + alt * 180 / Math.PI, -1.6364));
    const Ib = 1361 * Math.pow(0.7, Math.pow(am, 0.678));
    return Math.max(0, nv(Ib * sa * (1 - 0.75 * Math.pow(cFactor, 3.4)), 15));
  }

  // ── Collector outlet temperature (Hottel-Whillier) ──
  collT(irr) {
    if (irr < 50) return this.ambT + nv(1, 0.5);
    const eta = 0.72 - 0.0035 * (80 - this.ambT);
    return nv(clamp(this.ambT + irr * eta * (1 - this.dirt * 0.4) / 12, this.ambT, 130), 1.2);
  }

  // ── Adsorption COP (Carnot-limited) ──
  cop(rT, eT = 12, cT = 35) {
    if (rT < 55) return nv(0.05, 0.01);
    const cr = eT / (cT - eT);
    const tr = 1 - (cT + 273) / (rT + 273);
    return clamp(nv(cr * tr * 0.42 * this.lhsH, 0.015), 0.04, 0.72);
  }

  // ── Desalination water production ──
  waterP(irr, inf) {
    if (irr < 80) return nv(0.2, 0.1);
    const ti = irr * 0.0028;
    const rr = 0.35 + 0.15 * (inf / 100);
    return clamp(nv(ti * rr * inf / 50, 0.4), 0, 28);
  }

  // ── Full sensor snapshot ──
  snap(hour, params = {}) {
    const { inflow = 60, cycleTime = 15, regenTarget = 85, pressureSetpoint = 45 } = params;
    const irr = this.solar(hour);
    const clt = this.collT(irr);
    const ar = Math.min(clt * 0.92, regenTarget);
    const c = this.cop(ar);
    const w = this.waterP(irr, inflow);
    const cc = c * irr * 0.004;

    let anomalyScore = nv(0.08, 0.02);
    const faults = [];

    if (this.pumpH < 0.75 && Math.random() < 0.4) {
      anomalyScore += 0.2;
      faults.push({ symptom: "Pressure Drop > 15%", classification: "Vacuum Leak", severity: "Critical", root: "Pump P-102 seal failure", sensor: "Pressure" });
    }
    if (this.lhsH < 0.9 && Math.random() < 0.3) {
      anomalyScore += 0.12;
      faults.push({ symptom: "Latent Heat Variance", classification: "LHS Material Fatigue", severity: "Warning", root: "Phase-change material degradation", sensor: "Temperature" });
    }
    if (this.valveH < 0.7 && Math.random() < 0.35) {
      anomalyScore += 0.18;
      faults.push({ symptom: "Bed II Cycle Lag > 3s", classification: "Logic Controller Delay", severity: "Critical", root: "Switching valve mechanical friction", sensor: "Flow" });
    }

    return {
      hour,
      irradiance: Math.round(irr * 10) / 10,
      collectorTemp: Math.round(clt * 10) / 10,
      regenTemp: Math.round(ar * 10) / 10,
      cop: Math.round(c * 1000) / 1000,
      waterProduced: Math.round(w * 100) / 100,
      coolingCapacity: Math.round(cc * 100) / 100,
      evapTemp: Math.round(clamp(nv(10 + (1 - c) * 8, 0.5), 5, 22) * 10) / 10,
      condPressure: Math.round(clamp(nv(pressureSetpoint, 2.5), 10, 100) * 10) / 10,
      bedI_T: Math.round(nv(ar * 0.45, 1.5) * 10) / 10,
      bedII_T: Math.round(nv(ar * 0.88, 2) * 10) / 10,
      flowRate: Math.round(nv(inflow, inflow * 0.03) * 10) / 10,
      pumpPower: Math.round(clamp(nv(0.8 + irr * 0.001, 0.05), 0, 2.5) * 100) / 100,
      thermalStored: irr > 200 ? Math.round(nv(irr * 0.003, 0.2) * 100) / 100 : 0,
      anomalyScore: clamp(Math.round(anomalyScore * 1000) / 1000, 0, 1),
      faults,
      ambientTemp: Math.round(nv(this.ambT + 3 * Math.sin((hour - 14) * Math.PI / 12), 0.3) * 10) / 10,
      humidity: Math.round(clamp(nv(this.hum - 10 * Math.sin((hour - 14) * Math.PI / 12), 2), 40, 98)),
      windSpeed: Math.round(nv(this.wind, 0.8) * 10) / 10,
    };
  }

  _buildHist() {
    this.hist = [];
    for (let h = 0; h < 24; h++) this.hist.push(this.snap(h));
  }

  getRUL() {
    return [
      { id: 1, component: "Adsorption Bed Sorbents", rul: Math.round(this.lhsH * 100), unit: "%", status: this.lhsH > 0.7 ? "Healthy" : "Attention", next: this.lhsH > 0.7 ? "Routine inspection in 45 days" : "Sorbent regeneration needed" },
      { id: 2, component: "Solar Collector Glazing", rul: Math.round((1 - this.dirt) * 20), unit: "days", status: this.dirt > 0.3 ? "Critical" : this.dirt > 0.1 ? "Attention" : "Healthy", next: this.dirt > 0.1 ? "Cleaning required" : "No action" },
      { id: 3, component: "Pump Bearings (P-102)", rul: Math.round(this.pumpH * 10), unit: "days", status: this.pumpH < 0.6 ? "Critical" : this.pumpH < 0.8 ? "Attention" : "Healthy", next: this.pumpH < 0.8 ? "High vibration — schedule check-up" : "Normal" },
      { id: 4, component: "Condenser Tubes", rul: 78, unit: "%", status: "Healthy", next: "No action needed" },
      { id: 5, component: "Switching Valve Assembly", rul: Math.round(this.valveH * 40), unit: "days", status: this.valveH < 0.5 ? "Critical" : this.valveH < 0.75 ? "Attention" : "Healthy", next: this.valveH < 0.75 ? "Lubrication & friction check" : "Normal" },
    ];
  }

  forecast5d() {
    const days = [];
    for (let d = 0; d < 5; d++) {
      const cf = clamp(this.cloud + gauss() * 0.15, 0.05, 0.9);
      const hrs = [];
      let pk = 0;
      for (let h = 5; h <= 19; h++) {
        const ir = this.solar(h, cf);
        if (ir > pk) pk = ir;
        hrs.push({ hour: h, irradiance: Math.round(ir) });
      }
      const te = hrs.reduce((s, x) => s + x.irradiance * 0.001, 0);
      const dt = new Date();
      dt.setDate(dt.getDate() + d);
      days.push({
        date: dt.toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric" }),
        cloud: Math.round(cf * 100),
        peakIrradiance: Math.round(pk),
        totalEnergy: Math.round(te * 100) / 100,
        predictedWater: Math.round(te * 4.2 * 10) / 10,
        hours: hrs,
      });
    }
    return days;
  }
}