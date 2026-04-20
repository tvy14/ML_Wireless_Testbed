// ============================================================
// Shared parameters for all 5 key technologies (RBD framework)
// Source: RBD_objective_QoS.md + Khaloopour et al., IEEE Access 2024
// ============================================================

export interface TechParams {
  name: string;
  shortName: string;
  color: string;
  // P1 Reliability
  lambda: number;    // failure rate per hour
  n: number;         // total redundant units
  k: number;         // minimum required units
  // P2 Awareness
  theta: number;     // anomaly threshold
  saiWeight: number; // w_i for SAI computation
  // P3 Reconfiguration
  gamma: number;     // reconfiguration gain factor
  rMin: number;      // minimum reliability floor (triggers reconfiguration)
  // Serviceability / QoS
  mtbf: number;      // mean time between failures (hours)
  mttr: number;      // mean time to repair (hours)
  alphaDeg: number;  // performance retention ratio in degraded state
  tpMax: number;     // max throughput (Mbps)
  lBase: number;     // best-case latency (ms)
  tpMin: number;     // QoS floor: min throughput (Mbps)
  lMax: number;      // QoS floor: max latency (ms)
  aMin: number;      // QoS floor: min availability
  // Objective weights
  sriWeight: number; // w_i for SRI
}

export const TECHS: TechParams[] = [
  {
    name: 'Satellite',       shortName: 'SAT',  color: '#00d4ff',
    lambda: 0.0001,  n: 3,  k: 2,
    theta: 0.80, saiWeight: 0.30,
    gamma: 0.40, rMin: 0.30,
    mtbf: 10000, mttr: 100,
    alphaDeg: 0.60, tpMax: 100,  lBase: 250,
    tpMin: 50,   lMax: 600,  aMin: 0.990,
    sriWeight: 0.30,
  },
  {
    name: 'UAV BS',          shortName: 'UAV',  color: '#ffd166',
    lambda: 0.0005,  n: 10, k: 7,
    theta: 0.60, saiWeight: 0.20,
    gamma: 0.55, rMin: 0.50,
    mtbf: 2000,  mttr: 48,
    alphaDeg: 0.70, tpMax: 400,  lBase: 30,
    tpMin: 200,  lMax: 50,   aMin: 0.950,
    sriWeight: 0.20,
  },
  {
    name: 'Active RIS',      shortName: 'RIS',  color: '#06d6a0',
    lambda: 0.0002,  n: 15, k: 10,
    theta: 0.70, saiWeight: 0.15,
    gamma: 0.50, rMin: 0.40,
    mtbf: 5000,  mttr: 24,
    alphaDeg: 0.65, tpMax: 250,  lBase: 12,
    tpMin: 150,  lMax: 20,   aMin: 0.920,
    sriWeight: 0.15,
  },
  {
    name: '5G NR BS',        shortName: 'NR',   color: '#ff6b6b',
    lambda: 0.0003,  n: 5,  k: 3,
    theta: 0.75, saiWeight: 0.25,
    gamma: 0.60, rMin: 0.70,
    mtbf: 3333,  mttr: 8,
    alphaDeg: 0.80, tpMax: 2000, lBase: 5,
    tpMin: 1000, lMax: 10,  aMin: 0.999,
    sriWeight: 0.25,
  },
  {
    name: 'MEC Server',      shortName: 'MEC',  color: '#b388ff',
    lambda: 0.0002,  n: 4,  k: 3,
    theta: 0.65, saiWeight: 0.10,
    gamma: 0.65, rMin: 0.65,
    mtbf: 4000,  mttr: 4,
    alphaDeg: 0.75, tpMax: 800,  lBase: 2,
    tpMin: 500,  lMax: 5,   aMin: 0.995,
    sriWeight: 0.10,
  },
];

// Time axis: 0–8760 hours (1 year), 100 steps
export const N_STEPS = 100;
export const T_MAX   = 8760;
export const TIME_AXIS: number[] = Array.from({ length: N_STEPS }, (_, i) => (i / (N_STEPS - 1)) * T_MAX);

// Binomial coefficient
export function binom(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;
  let result = 1;
  for (let i = 0; i < k; i++) {
    result *= (n - i) / (i + 1);
  }
  return result;
}

// Individual component reliability R_i(t) = e^{-lambda * t}
export function componentReliability(lambda: number, t: number): number {
  return Math.exp(-lambda * t);
}

// k-out-of-n system reliability
export function systemReliability(p: TechParams, t: number): number {
  const rc = componentReliability(p.lambda, t);
  let sum = 0;
  for (let j = p.k; j <= p.n; j++) {
    sum += binom(p.n, j) * Math.pow(rc, j) * Math.pow(1 - rc, p.n - j);
  }
  return sum;
}

// Steady-state availability A_i = MTBF / (MTBF + MTTR)
export function availability(p: TechParams): number {
  return p.mtbf / (p.mtbf + p.mttr);
}
