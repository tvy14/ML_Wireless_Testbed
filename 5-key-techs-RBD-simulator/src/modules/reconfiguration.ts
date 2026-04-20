// ============================================================
// P3 — Reconfiguration: Reliability Recovery & SRI(t)
// ============================================================
import { TECHS, TIME_AXIS, systemReliability } from './params.js';
import { drawLineChart, LineDataset } from './chartUtils.js';

// R_reconfig = R + (1 - R) * gamma  (only applied when R < rMin)
function reconfig(rSys: number, gamma: number, rMin: number): number {
  return rSys < rMin ? rSys + (1 - rSys) * gamma : rSys;
}

export function initReconfiguration(): void {
  const canvas     = document.getElementById('p3-chart') as HTMLCanvasElement;
  const techSelect = document.getElementById('p3-tech-select') as HTMLSelectElement;
  const metricsDiv = document.getElementById('p3-metrics') as HTMLDivElement;

  function render(): void {
    const sel = techSelect.value;
    const datasets: LineDataset[] = [];

    // pre-compute for all
    const allOriginal = TECHS.map(tech =>
      TIME_AXIS.map(t => systemReliability(tech, t))
    );
    const allReconfig = TECHS.map((tech, i) =>
      allOriginal[i].map(r => reconfig(r, tech.gamma, tech.rMin))
    );

    if (sel === 'all') {
      // Show SRI(t) before and after reconfiguration
      const sriOriginal = TIME_AXIS.map((_, ti) =>
        TECHS.reduce((s, tech, i) => s + tech.sriWeight * allOriginal[i][ti], 0)
      );
      const sriReconfig = TIME_AXIS.map((_, ti) =>
        TECHS.reduce((s, tech, i) => s + tech.sriWeight * allReconfig[i][ti], 0)
      );
      datasets.push({
        label: 'SRI(t) — original',
        color: '#4a5568',
        data: sriOriginal,
        dash: [5, 3],
        lineWidth: 2,
      });
      datasets.push({
        label: 'SRI(t) — reconfigured',
        color: '#00ff9d',
        data: sriReconfig,
        lineWidth: 3,
      });

      const sriEnd = sriReconfig[sriReconfig.length - 1];
      const sriStart = sriReconfig[0];
      metricsDiv.innerHTML = `
        <div class="metric-card good">
          <div class="m-label">SRI at t=0</div>
          <div class="m-value">${(sriStart * 100).toFixed(1)}%</div>
          <div class="m-sub">initial system state</div>
        </div>
        <div class="metric-card ${sriEnd > 0.5 ? 'good' : 'warn'}">
          <div class="m-label">SRI at t=8760h</div>
          <div class="m-value">${(sriEnd * 100).toFixed(1)}%</div>
          <div class="m-sub">after reconfiguration</div>
        </div>`;

      // per-tech reconfiguration gain at final step
      TECHS.forEach((tech, i) => {
        const gain = allReconfig[i][99] - allOriginal[i][99];
        metricsDiv.innerHTML += `
          <div class="metric-card ${gain > 0.01 ? 'warn' : 'good'}">
            <div class="m-label">${tech.name} gain</div>
            <div class="m-value">${gain > 0 ? '+' : ''}${(gain * 100).toFixed(1)}%</div>
            <div class="m-sub">γ=${tech.gamma}</div>
          </div>`;
      });
    } else {
      const idx = Number(sel);
      const tech = TECHS[idx];
      datasets.push({
        label: `${tech.name} — original`,
        color: '#4a5568',
        data: allOriginal[idx],
        dash: [5, 3],
        lineWidth: 1.5,
      });
      datasets.push({
        label: `${tech.name} — reconfigured`,
        color: tech.color,
        data: allReconfig[idx],
        lineWidth: 3,
      });
      datasets.push({
        label: `R_min = ${tech.rMin}`,
        color: '#ff4d6d',
        data: TIME_AXIS.map(() => tech.rMin),
        dash: [3, 3],
        lineWidth: 1,
      });

      const rEnd = allReconfig[idx][99];
      const gain = allReconfig[idx][99] - allOriginal[idx][99];
      metricsDiv.innerHTML = `
        <div class="metric-card ${rEnd >= tech.rMin ? 'good' : 'bad'}">
          <div class="m-label">${tech.name} R_sys at t=8760h</div>
          <div class="m-value">${(rEnd * 100).toFixed(2)}%</div>
          <div class="m-sub">floor ${(tech.rMin * 100).toFixed(0)}%</div>
        </div>
        <div class="metric-card ${gain > 0.01 ? 'warn' : 'good'}">
          <div class="m-label">Reconfig gain</div>
          <div class="m-value">${gain > 0 ? '+' : ''}${(gain * 100).toFixed(2)}%</div>
          <div class="m-sub">γ = ${tech.gamma}</div>
        </div>`;
    }

    drawLineChart(canvas, TIME_AXIS, datasets, {
      yMin: 0, yMax: 1,
      xLabel: 'Time (hours)',
      yLabel: sel === 'all' ? 'System Resilience Index' : 'Reliability',
    });
  }

  techSelect.addEventListener('change', render);
  render();
}
