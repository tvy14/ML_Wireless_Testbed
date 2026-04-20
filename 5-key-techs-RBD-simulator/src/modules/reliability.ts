// ============================================================
// P1 — Protective Design: k-out-of-n System Reliability
// ============================================================
import { TECHS, TIME_AXIS, componentReliability, systemReliability } from './params.js';
import { drawLineChart, LineDataset } from './chartUtils.js';

export function initReliability(): void {
  const canvas = document.getElementById('p1-chart') as HTMLCanvasElement;
  const horizSlider = document.getElementById('p1-horizon') as HTMLInputElement;
  const horizVal    = document.getElementById('p1-horizon-val') as HTMLSpanElement;
  const metricsDiv  = document.getElementById('p1-metrics') as HTMLDivElement;
  const modeInputs  = document.querySelectorAll<HTMLInputElement>('input[name="p1-mode"]');

  function getMode(): string {
    for (const r of modeInputs) if (r.checked) return r.value;
    return 'both';
  }

  function render(): void {
    const horizon = Number(horizSlider.value);
    horizVal.textContent = String(horizon);
    const tAxis = TIME_AXIS.map(t => (t / 8760) * horizon);
    const mode = getMode();

    const datasets: LineDataset[] = [];
    const hLines: { y: number; color: string; label: string; dash: number[] }[] = [];

    for (const tech of TECHS) {
      const compData = tAxis.map(t => componentReliability(tech.lambda, t));
      const sysData  = tAxis.map(t => systemReliability(tech, t));

      if (mode === 'component' || mode === 'both') {
        datasets.push({
          label: `${tech.shortName} R_i(t)`,
          color: tech.color,
          data: compData,
          dash: [4, 3],
          lineWidth: 1.5,
        });
      }
      if (mode === 'system' || mode === 'both') {
        datasets.push({
          label: `${tech.shortName} R_sys(t)`,
          color: tech.color,
          data: sysData,
          lineWidth: 2.5,
        });
      }
      hLines.push({ y: tech.rMin, color: tech.color, label: `R_min ${tech.shortName}`, dash: [2, 4] });
    }

    drawLineChart(canvas, tAxis, datasets, {
      yMin: 0, yMax: 1,
      xLabel: 'Time (hours)',
      yLabel: 'Reliability',
      hLines,
    });

    // metrics: R_sys at final time step
    metricsDiv.innerHTML = '';
    for (const tech of TECHS) {
      const rFinal = systemReliability(tech, horizon);
      const cls = rFinal >= tech.rMin ? 'good' : rFinal >= tech.rMin * 0.7 ? 'warn' : 'bad';
      metricsDiv.innerHTML += `
        <div class="metric-card ${cls}">
          <div class="m-label"><span class="dot ${tech.shortName.toLowerCase()}"></span>${tech.name}</div>
          <div class="m-value">${(rFinal * 100).toFixed(1)}%</div>
          <div class="m-sub">R_sys at t=${horizon}h (floor ${(tech.rMin * 100).toFixed(0)}%)</div>
        </div>`;
    }
  }

  horizSlider.addEventListener('input', render);
  modeInputs.forEach(r => r.addEventListener('change', render));
  render();
}
