// ============================================================
// Objective — System Resilience Index (SRI) & SRI_eff
// SRI(t)     = Σ w_i · Sp_i(t)
// SRI_eff(t) = SRI(t) - Σ μ_i · V_i(t)
// Sp_i(t)    = R_sys^α · A^β · P_norm^(1-α-β)
// ============================================================
import { TECHS, TechParams, TIME_AXIS, systemReliability, availability } from './params.js';
import { drawLineChart, LineDataset } from './chartUtils.js';

// Degraded-state probability π_deg = R_comp - R_sys (units failed but still above k)
function piDeg(tech: TechParams, t: number): number {
  const rComp = Math.exp(-tech.lambda * t);
  const rSys  = systemReliability(tech, t);
  return Math.max(0, rComp - rSys);
}

// Steady-state throughput performance: π_up*TP_max + π_deg*α*TP_max
function pssTP(tech: TechParams, t: number): number {
  const rSys = systemReliability(tech, t);
  const pd   = piDeg(tech, t);
  return rSys * tech.tpMax + pd * tech.alphaDeg * tech.tpMax;
}

// Normalized latency term: L_base / L(t) where L(t) = L_base / R_sys
// → simplifies to R_sys (bounded [0,1])
function latencyTerm(tech: TechParams, t: number): number {
  return Math.min(1, systemReliability(tech, t));
}

// P_norm,i(t) = sqrt(TP_ss/TP_max) * sqrt(R_sys)  [both in [0,1]]
function pNorm(tech: TechParams, t: number): number {
  const tpTerm = pssTP(tech, t) / tech.tpMax;
  const latTerm = latencyTerm(tech, t);
  return Math.sqrt(Math.max(0, tpTerm)) * Math.sqrt(Math.max(0, latTerm));
}

// Serviceability Sp_i = R^α * A^β * Pnorm^(1-α-β)
function sp(tech: TechParams, t: number, alpha: number, beta: number): number {
  const rSys = systemReliability(tech, t);
  const A    = availability(tech);
  const pn   = pNorm(tech, t);
  const perf = 1 - alpha - beta;
  return Math.pow(Math.max(1e-9, rSys), alpha)
       * Math.pow(Math.max(1e-9, A),    beta)
       * Math.pow(Math.max(1e-9, pn),   perf);
}

// Violation magnitude (mirrors qos.ts logic)
function violMag(tech: TechParams, t: number): number {
  const rSys  = systemReliability(tech, t);
  const tpVal = pssTP(tech, t);
  const latVal = rSys > 0 ? tech.lBase / rSys : tech.lBase * 10;
  const vTp   = Math.max(0, (tech.tpMin - tpVal) / tech.tpMin);
  const vLat  = Math.max(0, (latVal - tech.lMax) / tech.lMax);
  const vR    = Math.max(0, tech.rMin - rSys);
  return vTp + vLat + vR;
}

export function initObjective(): void {
  const canvas   = document.getElementById('obj-chart') as HTMLCanvasElement;
  const alphaSlider = document.getElementById('obj-alpha') as HTMLInputElement;
  const betaSlider  = document.getElementById('obj-beta')  as HTMLInputElement;
  const perfDisp    = document.getElementById('obj-perf')  as HTMLInputElement;
  const alphaVal    = document.getElementById('obj-alpha-val') as HTMLSpanElement;
  const betaVal     = document.getElementById('obj-beta-val')  as HTMLSpanElement;
  const perfVal     = document.getElementById('obj-perf-val')  as HTMLSpanElement;
  const wSliders    = [0,1,2,3,4].map(i => document.getElementById(`obj-w${i}`) as HTMLInputElement);
  const wVals       = [0,1,2,3,4].map(i => document.getElementById(`obj-w${i}-val`) as HTMLSpanElement);
  const weightNote  = document.getElementById('weight-sum-note') as HTMLDivElement;
  const metricsDiv  = document.getElementById('obj-metrics') as HTMLDivElement;

  function getWeights(): number[] {
    return wSliders.map(s => Number(s.value));
  }

  function render(): void {
    const alpha = Number(alphaSlider.value);
    const beta  = Number(betaSlider.value);
    const perf  = Math.max(0, 1 - alpha - beta);
    alphaVal.textContent = alpha.toFixed(2);
    betaVal.textContent  = beta.toFixed(2);
    perfVal.textContent  = perf.toFixed(2);
    perfDisp.value = String(perf);

    const weights = getWeights();
    wVals.forEach((el, i) => { el.textContent = weights[i].toFixed(2); });

    const wSum = weights.reduce((a, b) => a + b, 0);
    const wNorm = weights.map(w => w / wSum);
    weightNote.textContent = `Weights sum: ${wSum.toFixed(2)}`;
    weightNote.className = Math.abs(wSum - 1) < 0.01 ? 'weight-sum-ok' : 'weight-sum-warn';

    // per-tech Sp_i(t)
    const spSeries = TECHS.map(tech =>
      TIME_AXIS.map(t => sp(tech, t, alpha, beta))
    );

    // SRI(t) = Σ w_i * Sp_i(t)  [normalized weights]
    const sriData = TIME_AXIS.map((_, ti) =>
      TECHS.reduce((s, _tech, i) => s + wNorm[i] * spSeries[i][ti], 0)
    );

    // SRI_eff(t) = SRI(t) - Σ μ_i * V_i(t),  μ_i = 1.0
    const sriEffData = TIME_AXIS.map((t, ti) => {
      const penalty = TECHS.reduce((s, tech, i) => {
        return s + wNorm[i] * violMag(tech, t);
      }, 0);
      return Math.max(0, sriData[ti] - penalty);
    });

    const datasets: LineDataset[] = [];

    // Per-tech Sp lines (thin)
    TECHS.forEach((tech, i) => {
      datasets.push({
        label: `Sp ${tech.shortName}`,
        color: tech.color,
        data: spSeries[i],
        dash: [3, 3],
        lineWidth: 1.5,
      });
    });

    // SRI and SRI_eff (bold)
    datasets.push({
      label: 'SRI(t)',
      color: '#00ff9d',
      data: sriData,
      lineWidth: 3,
    });
    datasets.push({
      label: 'SRI_eff(t)',
      color: '#ff4d6d',
      data: sriEffData,
      dash: [6, 3],
      lineWidth: 2.5,
    });

    drawLineChart(canvas, TIME_AXIS, datasets, {
      yMin: 0, yMax: 1,
      xLabel: 'Time (hours)',
      yLabel: 'Serviceability / SRI',
    });

    // metrics
    const sriEnd = sriData[sriData.length - 1];
    const sriEffEnd = sriEffData[sriEffData.length - 1];
    metricsDiv.innerHTML = `
      <div class="metric-card good">
        <div class="m-label">SRI at t=8760h</div>
        <div class="m-value">${(sriEnd * 100).toFixed(1)}%</div>
        <div class="m-sub">before QoS penalty</div>
      </div>
      <div class="metric-card ${sriEffEnd > 0.5 ? 'good' : sriEffEnd > 0.3 ? 'warn' : 'bad'}">
        <div class="m-label">SRI_eff at t=8760h</div>
        <div class="m-value">${(sriEffEnd * 100).toFixed(1)}%</div>
        <div class="m-sub">after QoS penalty</div>
      </div>`;

    TECHS.forEach((tech, i) => {
      const spEnd = spSeries[i][spSeries[i].length - 1];
      metricsDiv.innerHTML += `
        <div class="metric-card">
          <div class="m-label">Sp ${tech.name}</div>
          <div class="m-value">${(spEnd * 100).toFixed(1)}%</div>
          <div class="m-sub">w=${wNorm[i].toFixed(2)}</div>
        </div>`;
    });
  }

  alphaSlider.addEventListener('input', render);
  betaSlider.addEventListener('input', render);
  wSliders.forEach(s => s.addEventListener('input', render));
  render();
}
