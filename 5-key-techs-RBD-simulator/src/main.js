import './style.css';
import { initReliability } from './modules/reliability.js';
import { initAwareness } from './modules/awareness.js';
import { initReconfiguration } from './modules/reconfiguration.js';
import { initQoS } from './modules/qos.js';
import { initObjective } from './modules/objective.js';
// ---- Tab switching ----
const tabBtns = document.querySelectorAll('.tab-btn');
const tabSections = document.querySelectorAll('.tab-section');
tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const target = btn.dataset.tab;
        tabBtns.forEach(b => b.classList.remove('active'));
        tabSections.forEach(s => s.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(`tab-${target}`).classList.add('active');
    });
});
// ---- Init all modules ----
initReliability();
initAwareness();
initReconfiguration();
initQoS();
initObjective();
