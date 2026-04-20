// ============================================================
// Pure Canvas chart utilities (no external dependencies)
// ============================================================

export interface LineDataset {
  label: string;
  color: string;
  data: number[];
  dash?: number[];
  lineWidth?: number;
}

interface ChartLayout {
  left: number; right: number; top: number; bottom: number;
  w: number; h: number;
}

function getLayout(canvas: HTMLCanvasElement, pl = 58, pr = 20, pt = 20, pb = 46): ChartLayout {
  const w = canvas.width - pl - pr;
  const h = canvas.height - pt - pb;
  return { left: pl, right: pr, top: pt, bottom: pb, w, h };
}

function xPx(i: number, n: number, l: ChartLayout): number {
  return l.left + (i / (n - 1)) * l.w;
}
function yPx(v: number, yMin: number, yMax: number, l: ChartLayout): number {
  return l.top + l.h - ((v - yMin) / (yMax - yMin)) * l.h;
}

function setupHiDpi(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d')!;
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth || canvas.width;
  const h = canvas.clientHeight || canvas.height;
  canvas.width  = w * dpr;
  canvas.height = h * dpr;
  ctx.scale(dpr, dpr);
  (canvas as HTMLCanvasElement & { _logicalW: number; _logicalH: number })._logicalW = w;
  (canvas as HTMLCanvasElement & { _logicalW: number; _logicalH: number })._logicalH = h;
  return ctx;
}

export function drawLineChart(
  canvas: HTMLCanvasElement,
  xLabels: number[],
  datasets: LineDataset[],
  options: {
    yMin?: number; yMax?: number;
    xLabel?: string; yLabel?: string;
    hLines?: { y: number; color: string; label: string; dash?: number[] }[];
    title?: string;
  } = {}
): void {
  const ctx = setupHiDpi(canvas);
  const cw = (canvas as HTMLCanvasElement & { _logicalW: number })._logicalW ?? canvas.width;
  const ch = (canvas as HTMLCanvasElement & { _logicalH: number })._logicalH ?? canvas.height;

  ctx.clearRect(0, 0, cw, ch);
  ctx.fillStyle = '#0c1530';
  ctx.fillRect(0, 0, cw, ch);

  const l = getLayout(canvas as unknown as HTMLCanvasElement & { width: number; height: number });
  // override canvas dims for layout
  const layout: ChartLayout = { left: 58, right: 20, top: 24, bottom: 46, w: cw - 58 - 20, h: ch - 24 - 46 };

  const allVals = datasets.flatMap(d => d.data);
  const yMin = options.yMin ?? Math.min(...allVals) * 0.95;
  const yMax = options.yMax ?? Math.max(...allVals) * 1.05;
  const n = xLabels.length;

  // grid
  ctx.strokeStyle = '#1e2d55';
  ctx.lineWidth = 1;
  for (let g = 0; g <= 5; g++) {
    const y = layout.top + (g / 5) * layout.h;
    ctx.beginPath(); ctx.moveTo(layout.left, y); ctx.lineTo(layout.left + layout.w, y); ctx.stroke();
    const v = yMax - (g / 5) * (yMax - yMin);
    ctx.fillStyle = '#8892b0'; ctx.font = '10px sans-serif'; ctx.textAlign = 'right';
    ctx.fillText(v.toFixed(2), layout.left - 6, y + 4);
  }

  // horizontal threshold lines
  if (options.hLines) {
    for (const hl of options.hLines) {
      const y = yPx(hl.y, yMin, yMax, layout);
      ctx.strokeStyle = hl.color; ctx.lineWidth = 1;
      ctx.setLineDash(hl.dash ?? [5, 3]);
      ctx.beginPath(); ctx.moveTo(layout.left, y); ctx.lineTo(layout.left + layout.w, y); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = hl.color; ctx.font = '10px sans-serif'; ctx.textAlign = 'left';
      ctx.fillText(hl.label, layout.left + 4, y - 4);
    }
  }

  // x-axis labels
  const step = Math.ceil(n / 6);
  ctx.fillStyle = '#8892b0'; ctx.font = '10px sans-serif'; ctx.textAlign = 'center';
  for (let i = 0; i < n; i += step) {
    const x = layout.left + (i / (n - 1)) * layout.w;
    ctx.fillText(String(Math.round(xLabels[i])), x, layout.top + layout.h + 16);
  }
  ctx.fillStyle = '#8892b0'; ctx.font = '11px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(options.xLabel ?? 'Time (hours)', layout.left + layout.w / 2, layout.top + layout.h + 36);

  // y-axis label
  ctx.save();
  ctx.translate(14, layout.top + layout.h / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = 'center';
  ctx.fillText(options.yLabel ?? '', 0, 0);
  ctx.restore();

  // datasets
  for (const ds of datasets) {
    ctx.strokeStyle = ds.color;
    ctx.lineWidth = ds.lineWidth ?? 2;
    ctx.setLineDash(ds.dash ?? []);
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const x = layout.left + (i / (n - 1)) * layout.w;
      const y = yPx(ds.data[i], yMin, yMax, layout);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // legend
  const legendX = layout.left + layout.w - 10;
  let legendY = layout.top + 10;
  ctx.font = '10px sans-serif';
  for (const ds of datasets) {
    ctx.fillStyle = ds.color;
    ctx.fillRect(legendX - 90, legendY - 7, 16, 3);
    ctx.fillStyle = '#e8eaf6'; ctx.textAlign = 'left';
    ctx.fillText(ds.label, legendX - 70, legendY + 3);
    legendY += 16;
  }

  // axes
  ctx.strokeStyle = '#1e2d55'; ctx.lineWidth = 1; ctx.setLineDash([]);
  ctx.strokeRect(layout.left, layout.top, layout.w, layout.h);

  void l; void xPx;
}

export function drawStackedAreaChart(
  canvas: HTMLCanvasElement,
  xLabels: number[],
  datasets: LineDataset[],
  options: { xLabel?: string; yLabel?: string } = {}
): void {
  const ctx = setupHiDpi(canvas);
  const cw = (canvas as HTMLCanvasElement & { _logicalW: number })._logicalW ?? canvas.width;
  const ch = (canvas as HTMLCanvasElement & { _logicalH: number })._logicalH ?? canvas.height;
  ctx.clearRect(0, 0, cw, ch);
  ctx.fillStyle = '#0c1530'; ctx.fillRect(0, 0, cw, ch);

  const layout: ChartLayout = { left: 58, right: 20, top: 24, bottom: 46, w: cw - 58 - 20, h: ch - 24 - 46 };
  const n = xLabels.length;
  const yMax = 1.0; const yMin = 0;

  // grid
  ctx.strokeStyle = '#1e2d55'; ctx.lineWidth = 1;
  for (let g = 0; g <= 5; g++) {
    const y = layout.top + (g / 5) * layout.h;
    ctx.beginPath(); ctx.moveTo(layout.left, y); ctx.lineTo(layout.left + layout.w, y); ctx.stroke();
    const v = yMax - (g / 5);
    ctx.fillStyle = '#8892b0'; ctx.font = '10px sans-serif'; ctx.textAlign = 'right';
    ctx.fillText(v.toFixed(1), layout.left - 6, y + 4);
  }

  // draw filled lines
  for (const ds of datasets) {
    ctx.strokeStyle = ds.color; ctx.lineWidth = 2; ctx.globalAlpha = 0.8;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const x = layout.left + (i / (n - 1)) * layout.w;
      const y = yPx(ds.data[i], yMin, yMax, layout);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = ds.color;
    ctx.lineTo(layout.left + layout.w, layout.top + layout.h);
    ctx.lineTo(layout.left, layout.top + layout.h);
    ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1.0;
  }

  // x labels
  const step = Math.ceil(n / 6);
  ctx.fillStyle = '#8892b0'; ctx.font = '10px sans-serif'; ctx.textAlign = 'center';
  for (let i = 0; i < n; i += step) {
    const x = layout.left + (i / (n - 1)) * layout.w;
    ctx.fillText(String(Math.round(xLabels[i])), x, layout.top + layout.h + 16);
  }
  ctx.fillText(options.xLabel ?? 'Time (hours)', layout.left + layout.w / 2, layout.top + layout.h + 36);

  // y label
  ctx.save(); ctx.translate(14, layout.top + layout.h / 2); ctx.rotate(-Math.PI / 2);
  ctx.textAlign = 'center'; ctx.fillText(options.yLabel ?? '', 0, 0); ctx.restore();

  // legend
  const legendX = layout.left + layout.w - 10; let legendY = layout.top + 10;
  ctx.font = '10px sans-serif';
  for (const ds of datasets) {
    ctx.fillStyle = ds.color; ctx.fillRect(legendX - 90, legendY - 7, 16, 3);
    ctx.fillStyle = '#e8eaf6'; ctx.textAlign = 'left';
    ctx.fillText(ds.label, legendX - 70, legendY + 3);
    legendY += 16;
  }
  ctx.strokeStyle = '#1e2d55'; ctx.lineWidth = 1;
  ctx.strokeRect(layout.left, layout.top, layout.w, layout.h);

  void yPx;
}
