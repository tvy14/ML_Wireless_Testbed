// ============================================================
// QoS Monitor — Constraint Enforcement (C1–C4)
// Violation magnitude V_i(t) per technology
// ============================================================
import { TECHS, TIME_AXIS, systemReliability, availability } from './params.js';
import { drawLineChart } from './chartUtils.js';
// Compute throughput given state probabilities
function computeTP(rSys, rComp, alphaDeg, tpMax) {
    const piUp = rSys;
    const piDeg = Math.max(0, rComp - rSys);
    return piUp * tpMax + piDeg * alphaDeg * tpMax;
}
// Compute effective latency: inflates as reliability degrades
function computeLatency(rSys, lBase) {
    return rSys > 0 ? lBase / rSys : lBase * 10;
}
// Violation magnitude V_i: sum of normalized violations (0 if compliant)
function violationMag(tp, tpMin, lat, lMax, rSys, rMin) {
    const vTp = Math.max(0, (tpMin - tp) / tpMin);
    const vLat = Math.max(0, (lat - lMax) / lMax);
    const vR = Math.max(0, rMin - rSys);
    return vTp + vLat + vR;
}
export function initQoS() {
    const canvas = document.getElementById('qos-chart');
    const lNoiseSlider = document.getElementById('qos-lnoise');
    const lNoiseVal = document.getElementById('qos-lnoise-val');
    const statusGrid = document.getElementById('qos-status-cards');
    function render() {
        const lNoise = Number(lNoiseSlider.value);
        lNoiseVal.textContent = lNoise.toFixed(2);
        const datasets = [];
        const finalViolations = [];
        for (const tech of TECHS) {
            const A = availability(tech);
            const violData = [];
            for (let i = 0; i < TIME_AXIS.length; i++) {
                const t = TIME_AXIS[i];
                const rComp = Math.exp(-tech.lambda * t);
                const rSys = systemReliability(tech, t);
                const tp = computeTP(rSys, rComp, tech.alphaDeg, tech.tpMax);
                // latency with noise factor
                const noiseFactor = 1 + lNoise * Math.sin(i * 0.31 + tech.saiWeight * 5);
                const lat = computeLatency(rSys, tech.lBase) * noiseFactor;
                violData.push(violationMag(tp, tech.tpMin, lat, tech.lMax, rSys, tech.rMin));
            }
            finalViolations.push(violData[violData.length - 1]);
            datasets.push({
                label: `${tech.shortName} V(t)`,
                color: tech.color,
                data: violData,
                lineWidth: 2,
            });
            // availability compliance
            void A;
        }
        drawLineChart(canvas, TIME_AXIS, datasets, {
            yMin: 0,
            yMax: Math.max(0.5, ...datasets.flatMap(d => d.data)) * 1.1,
            xLabel: 'Time (hours)',
            yLabel: 'Violation Magnitude V_i(t)',
            hLines: [{ y: 0, color: '#00ff9d', label: 'compliant', dash: [2, 3] }],
        });
        // Status cards
        statusGrid.innerHTML = '';
        TECHS.forEach((tech, idx) => {
            const v = finalViolations[idx];
            const cls = v === 0 ? 'ok' : v < 0.2 ? 'warn' : 'fail';
            const label = v === 0 ? 'PASS' : v < 0.2 ? 'WARN' : 'FAIL';
            statusGrid.innerHTML += `
        <div class="qos-status-item">
          <span class="q-name"><span class="dot ${tech.shortName.toLowerCase()}"></span>${tech.name}</span>
          <span class="q-badge ${cls}">${label}</span>
        </div>`;
        });
    }
    lNoiseSlider.addEventListener('input', render);
    render();
}
