// ============================================================
// P2 — Self-Awareness: Anomaly Detection & SAI(t)
// ============================================================
import { TECHS, TIME_AXIS, systemReliability } from './params.js';
import { drawLineChart, LineDataset } from './chartUtils.js';

// Simple seeded pseudo-random (LCG)
function seededRng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

// Anomaly score: distance between actual R_sys and a noisy observation
function anomalyScore(rActual: number, noise: number, rand: () => number): number {
  const observed = rActual + (rand() - 0.5) * noise * 2;
  return Math.abs(rActual - Math.max(0, Math.min(1, observed)));
}

// Confidence C_i(t) = 1 - min(1, A_i(t) / theta_i)
function confidence(score: number, theta: number): number {
  return 1 - Math.min(1, score / theta);
}

export function initAwareness(): void {
  const canvas    = document.getElementById('p2-chart') as HTMLCanvasElement;
  const seedSlider  = document.getElementById('p2-seed') as HTMLInputElement;
  const noiseSlider = document.getElementById('p2-noise') as HTMLInputElement;
  const saiMinSlider = document.getElementById('p2-saimin') as HTMLInputElement;
  const seedVal   = document.getElementById('p2-seed-val') as HTMLSpanElement;
  const noiseVal  = document.getElementById('p2-noise-val') as HTMLSpanElement;
  const saiMinVal = document.getElementById('p2-saimin-val') as HTMLSpanElement;
  const metricsDiv = document.getElementById('p2-metrics') as HTMLDivElement;

  function render(): void {
    const seed  = Number(seedSlider.value);
    const noise = Number(noiseSlider.value);
    const saiMin = Number(saiMinSlider.value);
    seedVal.textContent  = String(seed);
    noiseVal.textContent = noise.toFixed(2);
    saiMinVal.textContent = saiMin.toFixed(2);

    const rand = seededRng(seed);

    const datasets: LineDataset[] = [];
    const saiData: number[] = new Array(TIME_AXIS.length).fill(0);

    for (const tech of TECHS) {
      const scores: number[] = [];
      const confs: number[] = [];

      for (let i = 0; i < TIME_AXIS.length; i++) {
        const rSys = systemReliability(tech, TIME_AXIS[i]);
        const score = anomalyScore(rSys, noise, rand);
        scores.push(score);
        confs.push(confidence(score, tech.theta));
        saiData[i] += tech.saiWeight * confs[i];
      }

      datasets.push({
        label: `${tech.shortName} anomaly`,
        color: tech.color,
        data: scores,
        dash: [3, 2],
        lineWidth: 1.5,
      });
    }

    // SAI(t) — bold purple line
    datasets.push({
      label: 'SAI(t)',
      color: '#b388ff',
      data: saiData,
      lineWidth: 3,
    });

    // threshold lines per tech + SAI min
    const hLines = TECHS.map(t => ({
      y: t.theta,
      color: t.color,
      label: `θ ${t.shortName}`,
      dash: [2, 4] as number[],
    }));
    hLines.push({ y: saiMin, color: '#b388ff', label: `SAI_min ${saiMin.toFixed(2)}`, dash: [5, 3] });

    drawLineChart(canvas, TIME_AXIS, datasets, {
      yMin: 0, yMax: 1,
      xLabel: 'Time (hours)',
      yLabel: 'Score / SAI',
      hLines,
    });

    // metrics
    const saiEnd = saiData[saiData.length - 1];
    const detections = TECHS.map((tech, _) => {
      const randDet = seededRng(seed + 7);
      return TIME_AXIS.reduce((acc, t) => {
        const score = anomalyScore(systemReliability(tech, t), noise, randDet);
        return acc + (score > tech.theta ? 1 : 0);
      }, 0);
    });

    metricsDiv.innerHTML = `
      <div class="metric-card ${saiEnd >= saiMin ? 'good' : 'bad'}">
        <div class="m-label">SAI final</div>
        <div class="m-value">${saiEnd.toFixed(3)}</div>
        <div class="m-sub">floor ${saiMin.toFixed(2)}</div>
      </div>
      <div class="metric-card warn">
        <div class="m-label">Total Anomalies</div>
        <div class="m-value">${detections.reduce((a, b) => a + b, 0)}</div>
        <div class="m-sub">across all technologies</div>
      </div>`;

    TECHS.forEach((tech, idx) => {
      metricsDiv.innerHTML += `
        <div class="metric-card">
          <div class="m-label">${tech.name}</div>
          <div class="m-value">${detections[idx]}</div>
          <div class="m-sub">detections / 100 steps</div>
        </div>`;
    });
  }

  seedSlider.addEventListener('input', render);
  noiseSlider.addEventListener('input', render);
  saiMinSlider.addEventListener('input', render);
  render();
}
