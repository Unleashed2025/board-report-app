import jsPDF from 'jspdf';

const BRAND = {
  navy: [13, 35, 56],
  darkPanel: [26, 51, 79],
  accent: [14, 165, 233],
  green: [5, 150, 105],
  amber: [245, 158, 11],
  red: [239, 68, 68],
  purple: [139, 92, 246],
  muted: [90, 122, 149],
  light: [160, 180, 200],
  white: [255, 255, 255],
};

const money = (v) => {
  if (v == null || isNaN(v)) return '£0';
  const abs = Math.abs(v);
  return (v < 0 ? '-£' : '£') + abs.toLocaleString('en-GB', { maximumFractionDigits: 0 });
};

const pct = (v) => (v * 100).toFixed(1) + '%';

// ── Manual table drawing (no jspdf-autotable dependency) ─────────────────────

function drawTable(pdf, startY, margin, contentW, head, body, opts = {}) {
  const { headColor = BRAND.accent, fontSize = 9, rowHeight = 7, colWidths, footRow, pageH = 297 } = opts;
  const cols = head.length;
  const autoW = contentW / cols;
  const widths = colWidths || head.map(() => autoW);
  let y = startY;

  const ensurePage = (needed) => {
    if (y + needed > pageH - 20) {
      pdf.addPage();
      y = 15;
    }
  };

  // Header
  ensurePage(rowHeight + 2);
  pdf.setFillColor(...headColor);
  pdf.rect(margin, y - 1, contentW, rowHeight + 1, 'F');
  pdf.setFontSize(fontSize);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...BRAND.white);
  let x = margin + 2;
  head.forEach((h, i) => {
    const align = typeof h === 'object' ? h.align : 'left';
    const text = typeof h === 'object' ? h.text : h;
    if (align === 'right') {
      pdf.text(text, margin + widths.slice(0, i + 1).reduce((s, w) => s + w, 0) - 2, y + 4, { align: 'right' });
    } else {
      pdf.text(text, x, y + 4);
    }
    x += widths[i];
  });
  y += rowHeight + 1;

  // Body rows
  pdf.setFont('helvetica', 'normal');
  body.forEach((row, ri) => {
    ensurePage(rowHeight);
    if (ri % 2 === 0) {
      pdf.setFillColor(240, 245, 250);
      pdf.rect(margin, y - 1, contentW, rowHeight, 'F');
    }
    x = margin + 2;
    pdf.setFontSize(fontSize);
    row.forEach((cell, ci) => {
      const val = typeof cell === 'object' ? cell.text : String(cell);
      const color = typeof cell === 'object' && cell.color ? cell.color : [40, 40, 40];
      const bold = typeof cell === 'object' && cell.bold;
      const align = typeof cell === 'object' ? cell.align : (typeof head[ci] === 'object' ? head[ci].align : 'left');
      pdf.setTextColor(...color);
      pdf.setFont('helvetica', bold ? 'bold' : 'normal');
      const truncated = val.length > 30 ? val.substring(0, 28) + '..' : val;
      if (align === 'right') {
        pdf.text(truncated, margin + widths.slice(0, ci + 1).reduce((s, w) => s + w, 0) - 2, y + 4, { align: 'right' });
      } else {
        pdf.text(truncated, x, y + 4);
      }
      x += widths[ci];
    });
    y += rowHeight;
  });

  // Footer row
  if (footRow) {
    ensurePage(rowHeight + 1);
    pdf.setFillColor(...headColor);
    pdf.rect(margin, y, contentW, rowHeight + 1, 'F');
    pdf.setFontSize(fontSize);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...BRAND.white);
    x = margin + 2;
    footRow.forEach((cell, ci) => {
      const val = String(cell);
      const align = typeof head[ci] === 'object' ? head[ci].align : 'left';
      if (align === 'right') {
        pdf.text(val, margin + widths.slice(0, ci + 1).reduce((s, w) => s + w, 0) - 2, y + 5, { align: 'right' });
      } else {
        pdf.text(val, x, y + 5);
      }
      x += widths[ci];
    });
    y += rowHeight + 2;
  }

  return y + 2;
}

// ── Narrative Analysis Engine ────────────────────────────────────────────────

function analyseData(boardPlan, r78Data) {
  const {
    closedWonDeals, negotiatingDeals, quotingDeals, earlyStageDeals,
    totalGPTotal, totalCostTotal, netProfitTotal,
    mdfTotal, monthlyData, gpByServiceType, employeeCosts,
  } = boardPlan;

  const allDeals = [...closedWonDeals, ...negotiatingDeals, ...quotingDeals, ...earlyStageDeals];
  const pipelineDeals = [...negotiatingDeals, ...quotingDeals, ...earlyStageDeals];
  const forecastDeals = [...closedWonDeals, ...negotiatingDeals];

  const MRR_HIGH = 1000, NRR_HIGH = 10000, MRR_LOW = 300, NRR_LOW = 3000;

  const recurringDeals = allDeals.filter(d => d.dealType === 'Recurring');
  const nonRecurringDeals = allDeals.filter(d => d.dealType !== 'Recurring');
  const bigRecurring = recurringDeals.filter(d => d.revenue >= MRR_HIGH);
  const smallRecurring = recurringDeals.filter(d => d.revenue < MRR_LOW);
  const midRecurring = recurringDeals.filter(d => d.revenue >= MRR_LOW && d.revenue < MRR_HIGH);
  const bigNR = nonRecurringDeals.filter(d => d.revenue >= NRR_HIGH);
  const smallNR = nonRecurringDeals.filter(d => d.revenue < NRR_LOW);
  const midNR = nonRecurringDeals.filter(d => d.revenue >= NRR_LOW && d.revenue < NRR_HIGH);

  const pipelineRecurring = pipelineDeals.filter(d => d.dealType === 'Recurring');
  const pipelineBigRecurring = pipelineRecurring.filter(d => d.revenue >= MRR_HIGH);
  const pipelineSmallRecurring = pipelineRecurring.filter(d => d.revenue < MRR_LOW);

  const TARGET = 24000;
  const owners = [...new Set(forecastDeals.map(d => d.owner).filter(Boolean))].sort();
  const repPerformance = owners.map(owner => {
    const repDeals = forecastDeals.filter(d => d.owner === owner);
    const cwRec = closedWonDeals.filter(d => d.owner === owner && d.dealType === 'Recurring');
    const cwRecGP = cwRec.reduce((s, d) => s + d.profit, 0);
    const totalGP = repDeals.reduce((s, d) => s + d.profit, 0);
    const firstName = owner.split(' ')[0].toLowerCase();
    const empCost = (employeeCosts || []).find(e => e.name.toLowerCase().startsWith(firstName));
    return { owner, cwRecGP, totalGP, dealCount: repDeals.length, annualCost: empCost?.trueCost || 0, pctTarget: (cwRecGP / TARGET) * 100 };
  });

  const recentMonths = monthlyData.filter(m => m.recurringGP > 0);
  const gpGrowth = recentMonths.length >= 3
    ? recentMonths.slice(-3).map((m, i, a) => i > 0 ? m.recurringGP - a[i - 1].recurringGP : 0).slice(1)
    : [];
  const avgGrowth = gpGrowth.length > 0 ? gpGrowth.reduce((s, v) => s + v, 0) / gpGrowth.length : 0;
  const breakevenMonth = monthlyData.find(m => m.recurringGP > 0 && m.recurringGP >= m.totalCost);

  const sortedSvc = [...(gpByServiceType || [])].sort((a, b) => b.value - a.value);
  const totalSvcGP = sortedSvc.reduce((s, st) => s + st.value, 0);
  const domSvc = sortedSvc[0];
  const domPct = totalSvcGP > 0 && domSvc ? domSvc.value / totalSvcGP : 0;

  // ── Narratives ──
  // Use R78-weighted annual GP figures (not raw monthly sums which are misleading)
  const cwOnlyTotalGP = r78Data?.cwOnlyTotalGP || 0;
  const cwOnlyRecGP = r78Data?.cwOnlyRecGP || 0;
  const cwOnlyNRGP = r78Data?.cwOnlyNRGP || 0;
  const cwRecMonthly = closedWonDeals.filter(d => d.dealType === 'Recurring').reduce((s, d) => s + d.profit, 0);
  const cwNRTotal = closedWonDeals.filter(d => d.dealType !== 'Recurring').reduce((s, d) => s + d.profit, 0);

  const theGood = [], theBad = [], trends = [];

  if (closedWonDeals.length > 0) {
    // Show R78-weighted year contribution, not raw monthly sum
    if (cwOnlyTotalGP > 0) {
      theGood.push(`${closedWonDeals.length} deals closed and won. R78-weighted year contribution: ${money(cwOnlyTotalGP)} GP (${money(cwOnlyRecGP)} recurring + ${money(cwOnlyNRGP)} non-recurring). Current monthly recurring run-rate: ${money(cwRecMonthly)}/mo.`);
    } else {
      theGood.push(`${closedWonDeals.length} deals closed and won with ${money(cwRecMonthly)}/mo recurring GP and ${money(cwNRTotal)} non-recurring GP.`);
    }
  }
  if (netProfitTotal > 0) theGood.push(`Full forecast (CW + Negotiating) projects net profit of ${money(netProfitTotal)} for the year — viable if negotiating deals land.`);
  if (breakevenMonth) theGood.push(`Recurring GP covers costs from ${breakevenMonth.month} — self-sustaining position reached.`);
  if (avgGrowth > 0) theGood.push(`Recurring GP trending upward with avg. monthly growth of ${money(avgGrowth)}.`);
  const strongReps = repPerformance.filter(r => r.pctTarget >= 60);
  if (strongReps.length > 0) theGood.push(`${strongReps.map(r => r.owner).join(' & ')} tracking above 60% of £24k target.`);
  if (bigRecurring.length > 0) theGood.push(`${bigRecurring.length} high-value recurring deals (≥${money(MRR_HIGH)}/mo MRR) in the pipeline.`);
  if (mdfTotal > 0) theGood.push(`MDF contributes ${money(mdfTotal)} as an additional profit buffer.`);

  if (netProfitTotal < 0) theBad.push(`Forecast shows net loss of ${money(netProfitTotal)}. Cost control and pipeline conversion are critical.`);
  const cwOnlyGross = cwOnlyTotalGP - totalCostTotal;
  if (cwOnlyGross < 0 && cwOnlyTotalGP > 0) theBad.push(`On Closed/Won-only basis (R78-weighted), the year-end position is a ${money(Math.abs(cwOnlyGross))} loss. We need negotiating deals to close to break even.`);
  const weakReps = repPerformance.filter(r => r.pctTarget < 30 && r.dealCount > 0);
  if (weakReps.length > 0) theBad.push(`${weakReps.map(r => r.owner).join(' & ')} below 30% of £24k target — action plans needed.`);
  const negGPMonthly = negotiatingDeals.reduce((s, d) => s + d.profit, 0);
  if (negotiatingDeals.length > 3 && negGPMonthly > 0) {
    const totalForecastGP = totalGPTotal;
    const negPctOfForecast = totalForecastGP > 0 ? negGPMonthly * 12 / totalForecastGP : 0;
    theBad.push(`${negotiatingDeals.length} deals still in negotiation (${money(negGPMonthly)}/mo run-rate). A significant portion of forecast GP depends on these closing.`);
  }
  if (!breakevenMonth) theBad.push(`Recurring GP doesn't cover costs in forecast period — reliant on non-recurring revenue.`);

  const totalPCount = pipelineRecurring.length;
  if (totalPCount > 0 && pipelineBigRecurring.length / totalPCount > 0.5)
    trends.push({ title: 'High-Value Pipeline Concentration', type: 'warning', text: `${pipelineBigRecurring.length}/${totalPCount} recurring pipeline deals (${pct(pipelineBigRecurring.length / totalPCount)}) are ≥${money(MRR_HIGH)}/mo. Heavy weighting toward large deals = longer cycles + higher slippage risk.` });
  if (totalPCount > 0 && pipelineSmallRecurring.length < 3)
    trends.push({ title: pipelineSmallRecurring.length === 0 ? 'No Small Deal Pipeline' : 'Low-Value Pipeline Gap', type: pipelineSmallRecurring.length === 0 ? 'critical' : 'warning',
      text: pipelineSmallRecurring.length === 0 ? `Zero low-value recurring deals (<${money(MRR_LOW)}/mo) in pipeline. Entire pipeline is mid-to-large, creating concentration risk.` : `Only ${pipelineSmallRecurring.length} deals below ${money(MRR_LOW)}/mo. Need smaller, faster-closing deals for pipeline breadth.` });

  const recPct = allDeals.length > 0 ? recurringDeals.length / allDeals.length : 0;
  if (recPct < 0.4) trends.push({ title: 'Low Recurring Ratio', type: 'warning', text: `Only ${pct(recPct)} of deals are recurring. Target 60%+ for predictable revenue.` });
  else if (recPct >= 0.6) trends.push({ title: 'Strong Recurring Mix', type: 'positive', text: `${pct(recPct)} of deals are recurring — good revenue predictability.` });

  const avgMRR = recurringDeals.length > 0 ? recurringDeals.reduce((s, d) => s + d.revenue, 0) / recurringDeals.length : 0;
  const avgNR = nonRecurringDeals.length > 0 ? nonRecurringDeals.reduce((s, d) => s + d.revenue, 0) / nonRecurringDeals.length : 0;
  trends.push({ title: 'Average Deal Values', type: 'info', text: `Avg recurring MRR: ${money(avgMRR)}/mo | Avg NR value: ${money(avgNR)}. ${avgMRR > MRR_HIGH ? 'Deals skew large — ensure lower-value volume.' : avgMRR < MRR_LOW ? 'Deals small — look for anchor accounts.' : 'Healthy mid-range.'}` });

  if (domPct > 0.6 && domSvc) trends.push({ title: 'Service Concentration', type: 'info', text: `${domSvc.name} = ${pct(domPct)} of NR GP. Diversification reduces risk.` });

  const sizeDist = [
    { band: `Large (≥${money(MRR_HIGH)}/mo)`, count: bigRecurring.length, gp: bigRecurring.reduce((s, d) => s + d.profit, 0), p: recurringDeals.length > 0 ? pct(bigRecurring.length / recurringDeals.length) : '0%' },
    { band: `Mid (${money(MRR_LOW)}-${money(MRR_HIGH)})`, count: midRecurring.length, gp: midRecurring.reduce((s, d) => s + d.profit, 0), p: recurringDeals.length > 0 ? pct(midRecurring.length / recurringDeals.length) : '0%' },
    { band: `Small (<${money(MRR_LOW)}/mo)`, count: smallRecurring.length, gp: smallRecurring.reduce((s, d) => s + d.profit, 0), p: recurringDeals.length > 0 ? pct(smallRecurring.length / recurringDeals.length) : '0%' },
  ];
  const nrDist = [
    { band: `Large (≥${money(NRR_HIGH)})`, count: bigNR.length, gp: bigNR.reduce((s, d) => s + d.profit, 0), p: nonRecurringDeals.length > 0 ? pct(bigNR.length / nonRecurringDeals.length) : '0%' },
    { band: `Mid`, count: midNR.length, gp: midNR.reduce((s, d) => s + d.profit, 0), p: nonRecurringDeals.length > 0 ? pct(midNR.length / nonRecurringDeals.length) : '0%' },
    { band: `Small (<${money(NRR_LOW)})`, count: smallNR.length, gp: smallNR.reduce((s, d) => s + d.profit, 0), p: nonRecurringDeals.length > 0 ? pct(smallNR.length / nonRecurringDeals.length) : '0%' },
  ];

  return { theGood, theBad, trends, sizeDist, nrDist, repPerformance, breakevenMonth };
}

// ── PDF Generator ────────────────────────────────────────────────────────────

export async function generateBoardPDF(boardPlan, r78Data = {}) {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const pageW = 210, pageH = 297, margin = 15;
  const contentW = pageW - margin * 2;
  let y = margin;

  const analysis = analyseData(boardPlan, r78Data);
  const dateStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const monthYear = new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  const ensureSpace = (n) => { if (y + n > pageH - 20) { pdf.addPage(); y = margin; } };

  const heading = (title, sub) => {
    ensureSpace(20);
    pdf.setFontSize(14); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(...BRAND.accent);
    pdf.text(title, margin, y);
    y += 2;
    pdf.setDrawColor(...BRAND.accent); pdf.setLineWidth(0.8);
    pdf.line(margin, y, margin + contentW, y);
    y += 5;
    if (sub) { pdf.setFontSize(9); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(...BRAND.muted); pdf.text(sub, margin, y); y += 5; }
  };

  const bullet = (text, color) => {
    ensureSpace(16);
    pdf.setFillColor(...color); pdf.circle(margin + 2, y - 1.2, 1.5, 'F');
    pdf.setFontSize(9); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(60, 60, 60);
    const lines = pdf.splitTextToSize(text, contentW - 10);
    pdf.text(lines, margin + 7, y);
    y += lines.length * 4.5 + 2;
  };

  const trendCard = (t) => {
    const colors = { warning: BRAND.amber, critical: BRAND.red, positive: BRAND.green, info: BRAND.accent };
    const c = colors[t.type] || BRAND.muted;
    const lines = pdf.splitTextToSize(t.text, contentW - 14);
    const h = 8 + lines.length * 4.2 + 4;
    ensureSpace(h);
    pdf.setFillColor(...c); pdf.roundedRect(margin, y - 2, 2, h, 1, 1, 'F');
    pdf.setFontSize(10); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(...c);
    pdf.text(t.title, margin + 6, y + 2); y += 7;
    pdf.setFontSize(8.5); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(60, 60, 60);
    pdf.text(lines, margin + 6, y);
    y += lines.length * 4.2 + 5;
  };

  const R = (align) => ({ align: align || 'right' });

  // ═══════════════════════════════════════════════════════════════════
  // COVER PAGE
  // ═══════════════════════════════════════════════════════════════════
  pdf.setFillColor(...BRAND.navy); pdf.rect(0, 0, pageW, pageH, 'F');
  pdf.setFillColor(...BRAND.accent); pdf.rect(0, 0, pageW, 4, 'F');

  pdf.setFontSize(16); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(...BRAND.accent);
  pdf.text('UNLEASHED', margin, 40);
  pdf.setDrawColor(...BRAND.accent); pdf.setLineWidth(1); pdf.line(margin, 46, margin + 60, 46);

  pdf.setFontSize(32); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(...BRAND.white);
  pdf.text('Board Sales Report', margin, 70);
  pdf.setFontSize(14); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(...BRAND.light);
  pdf.text('Sales Forecast & Pipeline Analysis', margin, 82);

  if (boardPlan.scenarioLabel) {
    pdf.setFontSize(11); pdf.setTextColor(...BRAND.accent);
    pdf.text(boardPlan.scenarioLabel, margin, 94);
  }
  pdf.setFontSize(12); pdf.setTextColor(...BRAND.muted); pdf.text(dateStr, margin, 115);

  // Cover KPI boxes
  const kpis = [
    { label: 'Forecast GP', value: money(boardPlan.totalGPTotal), color: BRAND.accent },
    { label: 'Net Profit', value: money(boardPlan.netProfitTotal), color: boardPlan.netProfitTotal >= 0 ? BRAND.green : BRAND.red },
    { label: 'Closed Won', value: `${boardPlan.closedWonDeals.length} deals`, color: BRAND.green },
    { label: 'Negotiating', value: `${boardPlan.negotiatingDeals.length} deals`, color: BRAND.amber },
  ];
  const bw = (contentW - 12) / 4;
  kpis.forEach((k, i) => {
    const x = margin + i * (bw + 4);
    pdf.setFillColor(...BRAND.darkPanel); pdf.roundedRect(x, 145, bw, 30, 2, 2, 'F');
    pdf.setFillColor(...k.color); pdf.rect(x, 145, bw, 2, 'F');
    pdf.setFontSize(7.5); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(...BRAND.muted);
    pdf.text(k.label, x + bw / 2, 155, { align: 'center' });
    pdf.setFontSize(13); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(...k.color);
    pdf.text(k.value, x + bw / 2, 166, { align: 'center' });
  });

  // Pipeline overview on cover
  pdf.setFontSize(10); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(...BRAND.light);
  pdf.text('Pipeline Overview', margin, 190);
  const stages = [
    { l: 'Quoting', c: boardPlan.quotingDeals.length, gp: boardPlan.quotingDeals.reduce((s, d) => s + d.profit, 0), col: BRAND.purple },
    { l: 'Early Stage', c: boardPlan.earlyStageDeals.length, gp: boardPlan.earlyStageDeals.reduce((s, d) => s + d.profit, 0), col: BRAND.muted },
  ];
  stages.forEach((st, i) => {
    pdf.setFontSize(9); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(...st.col);
    pdf.text(`${st.l}: ${st.c} deals — ${money(st.gp)}/mo GP`, margin + 4, 198 + i * 10);
  });

  pdf.setFontSize(8); pdf.setTextColor(...BRAND.muted);
  pdf.text('CONFIDENTIAL — For Board & Senior Leadership Only', pageW / 2, pageH - 20, { align: 'center' });
  pdf.setFillColor(...BRAND.accent); pdf.rect(0, pageH - 4, pageW, 4, 'F');

  // ═══════════════════════════════════════════════════════════════════
  // EXECUTIVE SUMMARY
  // ═══════════════════════════════════════════════════════════════════
  pdf.addPage(); y = margin;
  pdf.setFontSize(18); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(30, 30, 30);
  pdf.text('Executive Summary', margin, y + 4); y += 8;
  pdf.setFontSize(9); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(...BRAND.muted);
  pdf.text(`Report period: ${monthYear} | Based on Board Business Plan`, margin, y); y += 10;

  heading('The Good', 'Positive indicators and achievements');
  if (analysis.theGood.length === 0) bullet('No significant positives identified.', BRAND.muted);
  analysis.theGood.forEach(item => bullet(item, BRAND.green));
  y += 4;

  heading('The Bad', 'Risks, concerns and areas requiring attention');
  if (analysis.theBad.length === 0) bullet('No significant concerns — all on track.', BRAND.green);
  analysis.theBad.forEach(item => bullet(item, BRAND.red));

  // ═══════════════════════════════════════════════════════════════════
  // SALES TRENDS
  // ═══════════════════════════════════════════════════════════════════
  pdf.addPage(); y = margin;
  pdf.setFontSize(18); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(30, 30, 30);
  pdf.text('Sales Trends & Pipeline Analysis', margin, y + 4); y += 12;

  analysis.trends.forEach(t => trendCard(t));
  y += 4;

  heading('Recurring Deal Size Distribution', 'By monthly recurring revenue band');
  y = drawTable(pdf, y, margin, contentW,
    ['Deal Size Band', 'Count', { text: 'Monthly GP', align: 'right' }, '% of Rec.'],
    analysis.sizeDist.map(r => [r.band, String(r.count), { text: money(r.gp), align: 'right' }, r.p]),
    { headColor: BRAND.accent, colWidths: [60, 25, 45, 40], pageH }
  );
  y += 4;

  if (analysis.nrDist.some(r => r.count > 0)) {
    heading('Non-Recurring Deal Size Distribution', 'Project/one-off deal breakdown');
    y = drawTable(pdf, y, margin, contentW,
      ['Deal Size Band', 'Count', { text: 'GP', align: 'right' }, '% of NR'],
      analysis.nrDist.map(r => [r.band, String(r.count), { text: money(r.gp), align: 'right' }, r.p]),
      { headColor: BRAND.amber, colWidths: [60, 25, 45, 40], pageH }
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // FINANCIAL OVERVIEW
  // ═══════════════════════════════════════════════════════════════════
  pdf.addPage(); y = margin;
  pdf.setFontSize(18); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(30, 30, 30);
  pdf.text('Financial Overview', margin, y + 4); y += 12;

  heading('Year-End Forecast', 'Closed/Won only vs Full Forecast (incl. Negotiating)');

  const cwRecGP = r78Data.cwOnlyRecGP || 0;
  const cwNRGP = r78Data.cwOnlyNRGP || 0;
  const cwTotGP = r78Data.cwOnlyTotalGP || (cwRecGP + cwNRGP);
  const cwGross = cwTotGP - boardPlan.totalCostTotal;
  const cwNet = cwGross + (boardPlan.mdfTotal || 0);

  const fRows = [
    ['Recurring GP (R78)', { text: money(cwRecGP), align: 'right' }, { text: money(boardPlan.closedRecurringGP), align: 'right' }, { text: money(boardPlan.closedRecurringGP - cwRecGP), align: 'right' }],
    ['Non-Recurring GP', { text: money(cwNRGP), align: 'right' }, { text: money(boardPlan.closedNonRecurringGP), align: 'right' }, { text: money(boardPlan.closedNonRecurringGP - cwNRGP), align: 'right' }],
    [{ text: 'Total GP', bold: true }, { text: money(cwTotGP), align: 'right', bold: true }, { text: money(boardPlan.totalGPTotal), align: 'right', bold: true }, { text: money(boardPlan.totalGPTotal - cwTotGP), align: 'right', bold: true }],
    ['Total Costs', { text: money(boardPlan.totalCostTotal), align: 'right', color: BRAND.red }, { text: money(boardPlan.totalCostTotal), align: 'right', color: BRAND.red }, { text: '—', align: 'right' }],
    [{ text: 'Gross Profit', bold: true }, { text: money(cwGross), align: 'right', bold: true, color: cwGross >= 0 ? BRAND.green : BRAND.red }, { text: money(boardPlan.grossProfitTotal), align: 'right', bold: true, color: boardPlan.grossProfitTotal >= 0 ? BRAND.green : BRAND.red }, { text: money(boardPlan.grossProfitTotal - cwGross), align: 'right' }],
  ];
  if (boardPlan.mdfTotal) fRows.push(['MDF Offset', { text: '+' + money(boardPlan.mdfTotal), align: 'right' }, { text: '+' + money(boardPlan.mdfTotal), align: 'right' }, { text: '—', align: 'right' }]);
  fRows.push([{ text: 'Net Profit', bold: true }, { text: money(cwNet), align: 'right', bold: true, color: cwNet >= 0 ? BRAND.green : BRAND.red }, { text: money(boardPlan.netProfitTotal), align: 'right', bold: true, color: boardPlan.netProfitTotal >= 0 ? BRAND.green : BRAND.red }, { text: money(boardPlan.netProfitTotal - cwNet), align: 'right' }]);
  fRows.push(['EBITDA', { text: '—', align: 'right' }, { text: money(boardPlan.ebitdaTotal), align: 'right' }, { text: '—', align: 'right' }]);

  y = drawTable(pdf, y, margin, contentW,
    ['Metric', { text: 'CW Only', align: 'right' }, { text: 'Full Forecast', align: 'right' }, { text: 'Variance', align: 'right' }],
    fRows,
    { headColor: BRAND.navy, colWidths: [45, 40, 42, 38], pageH }
  );
  y += 6;

  heading('Annual Cost Breakdown', 'Business operating costs');
  y = drawTable(pdf, y, margin, contentW,
    ['Cost Category', { text: 'Annual Amount', align: 'right' }],
    [...boardPlan.costBreakdown.map(c => [c.name, { text: money(c.value), align: 'right' }])],
    { headColor: BRAND.red, colWidths: [100, 70], footRow: ['TOTAL', money(boardPlan.totalCostTotal)], pageH }
  );

  // ═══════════════════════════════════════════════════════════════════
  // MONTHLY P&L
  // ═══════════════════════════════════════════════════════════════════
  pdf.addPage(); y = margin;
  pdf.setFontSize(18); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(30, 30, 30);
  pdf.text('Monthly P&L Forecast', margin, y + 4); y += 12;

  heading('Month-by-Month Breakdown', 'CW + Negotiating deals from Business Plan');

  const plHead = ['Month', { text: 'Rec GP', align: 'right' }, { text: 'NR GP', align: 'right' }, { text: 'Total GP', align: 'right' }, { text: 'Costs', align: 'right' }, { text: 'Net Profit', align: 'right' }, { text: 'EBITDA', align: 'right' }, { text: 'Cumul.', align: 'right' }];
  const plBody = boardPlan.monthlyData.map(m => [
    m.month,
    { text: money(m.recurringGP), align: 'right' },
    { text: money(m.nonRecurringGP), align: 'right' },
    { text: money(m.totalGP), align: 'right', bold: true },
    { text: money(m.totalCost), align: 'right', color: BRAND.red },
    { text: money(m.netProfit), align: 'right', color: m.netProfit >= 0 ? BRAND.green : BRAND.red },
    { text: money(m.ebitda), align: 'right', color: m.ebitda >= 0 ? BRAND.green : BRAND.red },
    { text: money(m.cumulativeEBITDA), align: 'right', bold: true, color: m.cumulativeEBITDA >= 0 ? BRAND.green : BRAND.red },
  ]);
  const plFoot = ['Total', money(boardPlan.closedRecurringGP), money(boardPlan.closedNonRecurringGP), money(boardPlan.totalGPTotal), money(boardPlan.totalCostTotal), money(boardPlan.netProfitTotal), money(boardPlan.ebitdaTotal), money(boardPlan.cumulativeEBITDAFinal)];

  y = drawTable(pdf, y, margin, contentW, plHead, plBody, {
    headColor: BRAND.navy, fontSize: 8, rowHeight: 6,
    colWidths: [22, 22, 20, 24, 24, 24, 22, 24],
    footRow: plFoot, pageH
  });

  // ═══════════════════════════════════════════════════════════════════
  // REP PERFORMANCE
  // ═══════════════════════════════════════════════════════════════════
  y += 6;
  ensureSpace(60);
  heading('Sales Rep Performance', 'Target: £24,000 monthly recurring GP per rep');

  y = drawTable(pdf, y, margin, contentW,
    ['Rep', 'Deals', { text: 'CW Rec GP', align: 'right' }, { text: 'Total GP', align: 'right' }, { text: '% Target', align: 'right' }, { text: 'Cost', align: 'right' }, { text: 'ROI', align: 'right' }],
    analysis.repPerformance.map(r => [
      r.owner, String(r.dealCount),
      { text: money(r.cwRecGP), align: 'right' },
      { text: money(r.totalGP), align: 'right' },
      { text: r.pctTarget.toFixed(0) + '%', align: 'right', color: r.pctTarget >= 60 ? BRAND.green : r.pctTarget < 30 ? BRAND.red : BRAND.amber },
      { text: r.annualCost > 0 ? money(r.annualCost) : '—', align: 'right' },
      { text: r.annualCost > 0 ? ((r.totalGP / r.annualCost) * 100).toFixed(0) + '%' : '—', align: 'right', color: r.annualCost > 0 ? (r.totalGP >= r.annualCost ? BRAND.green : BRAND.red) : BRAND.muted },
    ]),
    { headColor: BRAND.accent, colWidths: [35, 18, 26, 26, 22, 26, 22], pageH }
  );

  // ═══════════════════════════════════════════════════════════════════
  // DEAL TABLES
  // ═══════════════════════════════════════════════════════════════════
  const sections = [
    { title: 'Closed Won Deals', sub: 'Confirmed revenue', deals: boardPlan.closedWonDeals, color: BRAND.green },
    { title: 'Negotiating Deals', sub: 'In negotiation — at risk', deals: boardPlan.negotiatingDeals, color: BRAND.amber },
    { title: 'Quoting Deals', sub: 'Proposals sent', deals: boardPlan.quotingDeals, color: BRAND.purple },
    { title: 'Early Stage Pipeline', sub: 'Lead / Qualified', deals: boardPlan.earlyStageDeals, color: BRAND.muted },
  ];

  for (const sec of sections) {
    if (sec.deals.length === 0) continue;
    ensureSpace(40);
    heading(sec.title, `${sec.sub} — ${sec.deals.length} deals`);

    const totRev = sec.deals.reduce((s, d) => s + d.revenue, 0);
    const totGP = sec.deals.reduce((s, d) => s + d.profit, 0);

    y = drawTable(pdf, y, margin, contentW,
      ['Customer', 'Rep', 'Type', { text: 'Revenue', align: 'right' }, { text: 'GP', align: 'right' }, 'Start'],
      sec.deals.sort((a, b) => b.profit - a.profit).map(d => [
        d.customer, d.owner, d.dealType,
        { text: money(d.revenue), align: 'right' },
        { text: money(d.profit), align: 'right', color: BRAND.green },
        d.billingStart || d.predictedMonth || '—',
      ]),
      { headColor: sec.color, fontSize: 8, rowHeight: 6, colWidths: [42, 26, 25, 26, 22, 26], footRow: ['TOTAL', '', '', money(totRev), money(totGP), ''], pageH }
    );
    y += 4;
  }

  // GP by Service Type
  if (boardPlan.gpByServiceType?.length > 0) {
    ensureSpace(40);
    heading('GP by Service Type', 'Non-recurring gross profit breakdown');
    const totalSvc = boardPlan.gpByServiceType.reduce((s, st) => s + st.value, 0);
    y = drawTable(pdf, y, margin, contentW,
      ['Service Type', { text: 'GP', align: 'right' }, { text: '% of Total', align: 'right' }],
      boardPlan.gpByServiceType.map(s => [s.name, { text: money(s.value), align: 'right' }, { text: totalSvc > 0 ? pct(s.value / totalSvc) : '0%', align: 'right' }]),
      { headColor: BRAND.purple, colWidths: [60, 50, 50], pageH }
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // NOTES
  // ═══════════════════════════════════════════════════════════════════
  ensureSpace(60); y += 10;
  pdf.setDrawColor(...BRAND.muted); pdf.setLineWidth(0.3);
  pdf.line(margin, y, margin + contentW, y); y += 8;
  pdf.setFontSize(10); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(...BRAND.muted);
  pdf.text('Notes & Methodology', margin, y); y += 6;
  pdf.setFontSize(8); pdf.setFont('helvetica', 'normal');
  [
    'R78 weighting: Cal Year Jan=12/78 to Dec=1/78. FY Oct=12/78 to Sep=1/78.',
    '"CW Only" = confirmed deals. "Full Forecast" = CW + Negotiating per Business Plan.',
    'MDF shown as separate offset between Gross Profit and Net Profit.',
    'Deal bands: Large recurring ≥ £1,000/mo MRR, Large NR ≥ £10,000.',
    'Rep target: £24,000 monthly recurring GP per sales rep.',
    'Auto-generated from uploaded Board Business Plan Excel.',
  ].forEach(line => {
    ensureSpace(8);
    const l = pdf.splitTextToSize('• ' + line, contentW);
    pdf.text(l, margin, y); y += l.length * 3.8 + 1;
  });

  // Page footers
  const tp = pdf.getNumberOfPages();
  for (let i = 2; i <= tp; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8); pdf.setTextColor(...BRAND.muted);
    pdf.text(`Unleashed — Board Sales Report | ${dateStr}`, margin, pageH - 8);
    pdf.text(`Page ${i} of ${tp}`, pageW - margin, pageH - 8, { align: 'right' });
    pdf.setDrawColor(...BRAND.accent); pdf.setLineWidth(0.3);
    pdf.line(margin, pageH - 12, pageW - margin, pageH - 12);
  }

  // DOWNLOAD (not print!)
  const filename = `Unleashed-Board-Sales-Report-${new Date().toISOString().split('T')[0]}.pdf`;
  pdf.save(filename);
  return filename;
}
