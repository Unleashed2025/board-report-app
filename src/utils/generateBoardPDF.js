import jsPDF from 'jspdf';
import 'jspdf-autotable';

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
  const prefix = v < 0 ? '-£' : '£';
  return prefix + abs.toLocaleString('en-GB', { maximumFractionDigits: 0 });
};

const pct = (v) => (v * 100).toFixed(1) + '%';

// ─── Narrative Analysis Engine ───────────────────────────────────────────────

function analyseData(boardPlan, r78Data) {
  const {
    closedWonDeals, negotiatingDeals, quotingDeals, earlyStageDeals,
    totalGPTotal, totalCostTotal, grossProfitTotal, netProfitTotal,
    ebitdaTotal, mdfTotal, monthlyData, gpByServiceType,
    gpByRep, employeeCosts, closedRecurringGP, closedNonRecurringGP,
  } = boardPlan;

  const allDeals = [...closedWonDeals, ...negotiatingDeals, ...quotingDeals, ...earlyStageDeals];
  const pipelineDeals = [...negotiatingDeals, ...quotingDeals, ...earlyStageDeals];
  const forecastDeals = [...closedWonDeals, ...negotiatingDeals];

  const MRR_HIGH = 1000;
  const NRR_HIGH = 10000;
  const MRR_LOW = 300;
  const NRR_LOW = 3000;

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

  // Rep analysis
  const owners = [...new Set(forecastDeals.map(d => d.owner).filter(Boolean))].sort();
  const TARGET = 24000;
  const repPerformance = owners.map(owner => {
    const repDeals = forecastDeals.filter(d => d.owner === owner);
    const cwRec = closedWonDeals.filter(d => d.owner === owner && d.dealType === 'Recurring');
    const cwRecGP = cwRec.reduce((s, d) => s + d.profit, 0);
    const totalGP = repDeals.reduce((s, d) => s + d.profit, 0);
    const firstName = owner.split(' ')[0].toLowerCase();
    const empCost = (employeeCosts || []).find(e => e.name.toLowerCase().startsWith(firstName));
    return { owner, cwRecGP, totalGP, dealCount: repDeals.length, annualCost: empCost?.trueCost || 0, pctTarget: (cwRecGP / TARGET) * 100 };
  });

  // Monthly trend
  const recentMonths = monthlyData.filter(m => m.recurringGP > 0);
  const gpGrowthTrend = recentMonths.length >= 3
    ? recentMonths.slice(-3).map((m, i, arr) => i > 0 ? m.recurringGP - arr[i - 1].recurringGP : 0).slice(1)
    : [];
  const avgMonthlyGrowth = gpGrowthTrend.length > 0 ? gpGrowthTrend.reduce((s, v) => s + v, 0) / gpGrowthTrend.length : 0;
  const isGrowing = avgMonthlyGrowth > 0;
  const breakevenMonth = monthlyData.find(m => m.recurringGP > 0 && m.recurringGP >= m.totalCost);

  // Service concentration
  const sortedServices = [...(gpByServiceType || [])].sort((a, b) => b.value - a.value);
  const totalServiceGP = sortedServices.reduce((s, st) => s + st.value, 0);
  const dominantService = sortedServices[0];
  const dominantPct = totalServiceGP > 0 && dominantService ? dominantService.value / totalServiceGP : 0;

  // ── Build narratives ──
  const theGood = [];
  const theBad = [];
  const trends = [];

  // THE GOOD
  if (closedWonDeals.length > 0) {
    const cwGP = closedWonDeals.reduce((s, d) => s + d.profit, 0);
    theGood.push(`${closedWonDeals.length} deals have been closed and won, generating ${money(cwGP)} in monthly GP. This provides a confirmed revenue base.`);
  }
  if (netProfitTotal > 0) {
    theGood.push(`The full forecast projects a net profit of ${money(netProfitTotal)} for the year, indicating the business plan is viable if negotiating deals land as expected.`);
  }
  if (breakevenMonth) {
    theGood.push(`Recurring GP covers business costs from ${breakevenMonth.month} — the business reaches a self-sustaining position from recurring revenue alone.`);
  }
  if (isGrowing) {
    theGood.push(`Recurring GP is trending upward with average monthly growth of ${money(avgMonthlyGrowth)}, showing positive momentum.`);
  }
  const strongReps = repPerformance.filter(r => r.pctTarget >= 60);
  if (strongReps.length > 0) {
    theGood.push(`${strongReps.map(r => r.owner).join(' and ')} ${strongReps.length === 1 ? 'is' : 'are'} tracking above 60% of the £24k recurring GP target.`);
  }
  if (bigRecurring.length > 0) {
    const bigRecGP = bigRecurring.reduce((s, d) => s + d.profit, 0);
    theGood.push(`${bigRecurring.length} high-value recurring deals (≥${money(MRR_HIGH)}/mo MRR) worth ${money(bigRecGP)}/mo GP — these are anchor accounts.`);
  }
  if (mdfTotal > 0) {
    theGood.push(`MDF (Market Development Fund) contributes ${money(mdfTotal)} to offset costs, providing an additional profit buffer.`);
  }

  // THE BAD
  if (netProfitTotal < 0) {
    theBad.push(`The forecast shows a net loss of ${money(netProfitTotal)} for the year. Cost control and pipeline conversion are critical.`);
  }
  const cwOnlyGross = (r78Data?.cwOnlyTotalGP || 0) - totalCostTotal;
  if (cwOnlyGross < 0 && r78Data?.cwOnlyTotalGP) {
    theBad.push(`On a Closed/Won-only basis, the business runs at a loss of ${money(cwOnlyGross)}. We are reliant on closing negotiating pipeline to break even.`);
  }
  const weakReps = repPerformance.filter(r => r.pctTarget < 30 && r.dealCount > 0);
  if (weakReps.length > 0) {
    theBad.push(`${weakReps.map(r => r.owner).join(' and ')} ${weakReps.length === 1 ? 'is' : 'are'} below 30% of the £24k target — action plans are needed.`);
  }
  const negGP = negotiatingDeals.reduce((s, d) => s + d.profit, 0);
  const cwGPTotal = closedWonDeals.reduce((s, d) => s + d.profit, 0);
  if (negotiatingDeals.length > 3 && negGP > 0) {
    const negPct = cwGPTotal + negGP > 0 ? negGP / (cwGPTotal + negGP) : 0;
    theBad.push(`${negotiatingDeals.length} deals worth ${money(negGP)}/mo GP are still in negotiation — ${pct(negPct)} of forecast GP is at risk.`);
  }
  if (!breakevenMonth) {
    theBad.push(`Recurring GP does not cover business costs within the forecast period — the business remains reliant on non-recurring project revenue.`);
  }

  // SALES TRENDS
  const totalPipelineCount = pipelineRecurring.length;
  const bigPipelinePct = totalPipelineCount > 0 ? pipelineBigRecurring.length / totalPipelineCount : 0;

  if (bigPipelinePct > 0.5 && totalPipelineCount > 0) {
    trends.push({
      title: 'High-Value Pipeline Concentration',
      type: 'warning',
      text: `${pipelineBigRecurring.length} of ${totalPipelineCount} recurring pipeline deals (${pct(bigPipelinePct)}) are high-value (≥${money(MRR_HIGH)}/mo MRR). Pipeline is heavily weighted toward large deals which take longer to close and carry higher slippage risk.`,
    });
  }
  if (pipelineSmallRecurring.length < 3 && totalPipelineCount > 0) {
    trends.push({
      title: 'Low-Value Pipeline Gap',
      type: pipelineSmallRecurring.length === 0 ? 'critical' : 'warning',
      text: pipelineSmallRecurring.length === 0
        ? `There are zero low-value recurring deals (<${money(MRR_LOW)}/mo) in the pipeline. The entire pipeline consists of mid-to-large deals, creating concentration risk. A balanced pipeline needs volume at all deal sizes.`
        : `Only ${pipelineSmallRecurring.length} recurring pipeline deals are below ${money(MRR_LOW)}/mo MRR. The business lacks a healthy volume of smaller, faster-closing deals. Consider targeting SMB accounts for pipeline breadth.`,
    });
  }

  // Deal type mix
  const recurringPct = allDeals.length > 0 ? recurringDeals.length / allDeals.length : 0;
  if (recurringPct < 0.4) {
    trends.push({
      title: 'Low Recurring Deal Ratio',
      type: 'warning',
      text: `Only ${pct(recurringPct)} of deals are recurring (${recurringDeals.length} of ${allDeals.length}). A healthy managed service business typically targets 60%+ recurring for predictable revenue.`,
    });
  } else if (recurringPct >= 0.6) {
    trends.push({
      title: 'Strong Recurring Mix',
      type: 'positive',
      text: `${pct(recurringPct)} of deals are recurring (${recurringDeals.length} of ${allDeals.length}), providing good revenue predictability.`,
    });
  }

  // Average deal values
  const avgRecMRR = recurringDeals.length > 0 ? recurringDeals.reduce((s, d) => s + d.revenue, 0) / recurringDeals.length : 0;
  const avgNRValue = nonRecurringDeals.length > 0 ? nonRecurringDeals.reduce((s, d) => s + d.revenue, 0) / nonRecurringDeals.length : 0;
  trends.push({
    title: 'Average Deal Values',
    type: 'info',
    text: `Average recurring deal MRR: ${money(avgRecMRR)}/mo | Average non-recurring deal value: ${money(avgNRValue)}. ${avgRecMRR > MRR_HIGH ? 'Deals skew large — ensure pipeline has volume at lower values too.' : avgRecMRR < MRR_LOW ? 'Deals are relatively small — look for larger anchor accounts.' : 'Deal sizes are in a healthy mid-range.'}`,
  });

  // Service concentration
  if (dominantPct > 0.6 && dominantService) {
    trends.push({
      title: 'Service Type Concentration',
      type: 'info',
      text: `${dominantService.name} accounts for ${pct(dominantPct)} of non-recurring GP. Diversification across service types reduces risk.`,
    });
  }

  // Size distribution tables
  const sizeDistribution = [
    { band: `Large (≥${money(MRR_HIGH)}/mo)`, count: bigRecurring.length, gpMo: bigRecurring.reduce((s, d) => s + d.profit, 0), pctOfTotal: recurringDeals.length > 0 ? pct(bigRecurring.length / recurringDeals.length) : '0%' },
    { band: `Mid (${money(MRR_LOW)}–${money(MRR_HIGH)}/mo)`, count: midRecurring.length, gpMo: midRecurring.reduce((s, d) => s + d.profit, 0), pctOfTotal: recurringDeals.length > 0 ? pct(midRecurring.length / recurringDeals.length) : '0%' },
    { band: `Small (<${money(MRR_LOW)}/mo)`, count: smallRecurring.length, gpMo: smallRecurring.reduce((s, d) => s + d.profit, 0), pctOfTotal: recurringDeals.length > 0 ? pct(smallRecurring.length / recurringDeals.length) : '0%' },
  ];

  const nrSizeDistribution = [
    { band: `Large (≥${money(NRR_HIGH)})`, count: bigNR.length, gp: bigNR.reduce((s, d) => s + d.profit, 0), pctOfTotal: nonRecurringDeals.length > 0 ? pct(bigNR.length / nonRecurringDeals.length) : '0%' },
    { band: `Mid (${money(NRR_LOW)}–${money(NRR_HIGH)})`, count: midNR.length, gp: midNR.reduce((s, d) => s + d.profit, 0), pctOfTotal: nonRecurringDeals.length > 0 ? pct(midNR.length / nonRecurringDeals.length) : '0%' },
    { band: `Small (<${money(NRR_LOW)})`, count: smallNR.length, gp: smallNR.reduce((s, d) => s + d.profit, 0), pctOfTotal: nonRecurringDeals.length > 0 ? pct(smallNR.length / nonRecurringDeals.length) : '0%' },
  ];

  return { theGood, theBad, trends, sizeDistribution, nrSizeDistribution, repPerformance, breakevenMonth };
}

// ─── PDF Generator ───────────────────────────────────────────────────────────

export async function generateBoardPDF(boardPlan, r78Data = {}) {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const pageW = 210;
  const pageH = 297;
  const margin = 15;
  const contentW = pageW - margin * 2;
  let y = margin;

  const analysis = analyseData(boardPlan, r78Data);
  const dateStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const monthYear = new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  const ensureSpace = (needed) => {
    if (y + needed > pageH - 20) {
      pdf.addPage();
      y = margin;
    }
  };

  const sectionHeading = (title, subtitle) => {
    ensureSpace(20);
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...BRAND.accent);
    pdf.text(title, margin, y);
    y += 2;
    pdf.setDrawColor(...BRAND.accent);
    pdf.setLineWidth(0.8);
    pdf.line(margin, y, margin + contentW, y);
    y += 5;
    if (subtitle) {
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(...BRAND.muted);
      pdf.text(subtitle, margin, y);
      y += 5;
    }
  };

  const writeBullet = (text, iconColor) => {
    ensureSpace(16);
    pdf.setFillColor(...iconColor);
    pdf.circle(margin + 2, y - 1.2, 1.5, 'F');
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(60, 60, 60);
    const lines = pdf.splitTextToSize(text, contentW - 10);
    pdf.text(lines, margin + 7, y);
    y += lines.length * 4.5 + 2;
  };

  const writeTrendCard = (trend) => {
    const colors = { warning: BRAND.amber, critical: BRAND.red, positive: BRAND.green, info: BRAND.accent };
    const color = colors[trend.type] || BRAND.muted;
    const lines = pdf.splitTextToSize(trend.text, contentW - 14);
    const blockH = 8 + lines.length * 4.2 + 4;
    ensureSpace(blockH);
    pdf.setFillColor(...color);
    pdf.roundedRect(margin, y - 2, 2, blockH, 1, 1, 'F');
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...color);
    pdf.text(trend.title, margin + 6, y + 2);
    y += 7;
    pdf.setFontSize(8.5);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(60, 60, 60);
    pdf.text(lines, margin + 6, y);
    y += lines.length * 4.2 + 5;
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 1 — COVER
  // ═══════════════════════════════════════════════════════════════════════════
  pdf.setFillColor(...BRAND.navy);
  pdf.rect(0, 0, pageW, pageH, 'F');
  pdf.setFillColor(...BRAND.accent);
  pdf.rect(0, 0, pageW, 4, 'F');

  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...BRAND.accent);
  pdf.text('UNLEASHED', margin, 40);
  pdf.setDrawColor(...BRAND.accent);
  pdf.setLineWidth(1);
  pdf.line(margin, 46, margin + 60, 46);

  pdf.setFontSize(32);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...BRAND.white);
  pdf.text('Board Sales Report', margin, 70);

  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...BRAND.light);
  pdf.text('Sales Forecast & Pipeline Analysis', margin, 82);

  if (boardPlan.scenarioLabel) {
    pdf.setFontSize(11);
    pdf.setTextColor(...BRAND.accent);
    pdf.text(boardPlan.scenarioLabel, margin, 94);
  }

  pdf.setFontSize(12);
  pdf.setTextColor(...BRAND.muted);
  pdf.text(dateStr, margin, 115);

  // Cover KPI boxes
  const coverKPIs = [
    { label: 'Forecast GP', value: money(boardPlan.totalGPTotal), color: BRAND.accent },
    { label: 'Net Profit', value: money(boardPlan.netProfitTotal), color: boardPlan.netProfitTotal >= 0 ? BRAND.green : BRAND.red },
    { label: 'Closed Won', value: `${boardPlan.closedWonDeals.length} deals`, color: BRAND.green },
    { label: 'Negotiating', value: `${boardPlan.negotiatingDeals.length} deals`, color: BRAND.amber },
  ];

  const kpiBoxW = (contentW - 12) / 4;
  const kpiY = 145;
  coverKPIs.forEach((kpi, i) => {
    const x = margin + i * (kpiBoxW + 4);
    pdf.setFillColor(...BRAND.darkPanel);
    pdf.roundedRect(x, kpiY, kpiBoxW, 30, 2, 2, 'F');
    pdf.setFillColor(...kpi.color);
    pdf.rect(x, kpiY, kpiBoxW, 2, 'F');
    pdf.setFontSize(7.5);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...BRAND.muted);
    pdf.text(kpi.label, x + kpiBoxW / 2, kpiY + 10, { align: 'center' });
    pdf.setFontSize(13);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...kpi.color);
    pdf.text(kpi.value, x + kpiBoxW / 2, kpiY + 21, { align: 'center' });
    pdf.setFont('helvetica', 'normal');
  });

  // Pipeline status on cover
  const stages = [
    { label: 'Quoting', count: boardPlan.quotingDeals.length, gp: boardPlan.quotingDeals.reduce((s, d) => s + d.profit, 0), color: BRAND.purple },
    { label: 'Early Stage', count: boardPlan.earlyStageDeals.length, gp: boardPlan.earlyStageDeals.reduce((s, d) => s + d.profit, 0), color: BRAND.muted },
  ];
  const stageY = 190;
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...BRAND.light);
  pdf.text('Pipeline Overview', margin, stageY);
  stages.forEach((st, i) => {
    const sy = stageY + 8 + i * 12;
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...st.color);
    pdf.text(`${st.label}: ${st.count} deals — ${money(st.gp)}/mo GP`, margin + 4, sy);
  });

  pdf.setFontSize(8);
  pdf.setTextColor(...BRAND.muted);
  pdf.text('CONFIDENTIAL — For Board & Senior Leadership Only', pageW / 2, pageH - 20, { align: 'center' });
  pdf.setFillColor(...BRAND.accent);
  pdf.rect(0, pageH - 4, pageW, 4, 'F');

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 2 — EXECUTIVE SUMMARY
  // ═══════════════════════════════════════════════════════════════════════════
  pdf.addPage();
  y = margin;

  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(30, 30, 30);
  pdf.text('Executive Summary', margin, y + 4);
  y += 8;
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...BRAND.muted);
  pdf.text(`Report period: ${monthYear} | Forecast based on Board Business Plan`, margin, y);
  y += 10;

  sectionHeading('The Good', 'Positive indicators and achievements');
  if (analysis.theGood.length === 0) writeBullet('No significant positive indicators identified.', BRAND.muted);
  analysis.theGood.forEach(item => writeBullet(item, BRAND.green));
  y += 4;

  sectionHeading('The Bad', 'Risks, concerns and areas requiring attention');
  if (analysis.theBad.length === 0) writeBullet('No significant concerns — all metrics are on track.', BRAND.green);
  analysis.theBad.forEach(item => writeBullet(item, BRAND.red));

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 3 — SALES TRENDS
  // ═══════════════════════════════════════════════════════════════════════════
  pdf.addPage();
  y = margin;

  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(30, 30, 30);
  pdf.text('Sales Trends & Pipeline Analysis', margin, y + 4);
  y += 12;

  analysis.trends.forEach(trend => writeTrendCard(trend));
  y += 4;

  sectionHeading('Recurring Deal Size Distribution', 'Pipeline breakdown by monthly recurring revenue band');
  pdf.autoTable({
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Deal Size Band', 'Count', 'Monthly GP', '% of Recurring']],
    body: analysis.sizeDistribution.map(r => [r.band, r.count.toString(), money(r.gpMo), r.pctOfTotal]),
    theme: 'striped',
    styles: { fontSize: 9, cellPadding: 3, textColor: [40, 40, 40] },
    headStyles: { fillColor: BRAND.accent, textColor: BRAND.white, fontStyle: 'bold', fontSize: 9 },
    alternateRowStyles: { fillColor: [240, 245, 250] },
    columnStyles: { 1: { halign: 'center' }, 2: { halign: 'right' }, 3: { halign: 'center' } },
  });
  y = pdf.lastAutoTable.finalY + 8;

  if (analysis.nrSizeDistribution.some(r => r.count > 0)) {
    sectionHeading('Non-Recurring Deal Size Distribution', 'Project/one-off deal breakdown');
    pdf.autoTable({
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Deal Size Band', 'Count', 'GP', '% of NR']],
      body: analysis.nrSizeDistribution.map(r => [r.band, r.count.toString(), money(r.gp), r.pctOfTotal]),
      theme: 'striped',
      styles: { fontSize: 9, cellPadding: 3, textColor: [40, 40, 40] },
      headStyles: { fillColor: BRAND.amber, textColor: BRAND.white, fontStyle: 'bold', fontSize: 9 },
      alternateRowStyles: { fillColor: [255, 252, 240] },
      columnStyles: { 1: { halign: 'center' }, 2: { halign: 'right' }, 3: { halign: 'center' } },
    });
    y = pdf.lastAutoTable.finalY + 8;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 4 — FINANCIAL OVERVIEW
  // ═══════════════════════════════════════════════════════════════════════════
  pdf.addPage();
  y = margin;

  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(30, 30, 30);
  pdf.text('Financial Overview', margin, y + 4);
  y += 12;

  sectionHeading('Year-End Forecast', 'Closed/Won only vs Full Forecast (incl. Negotiating)');

  const cwOnlyRecGP = r78Data.cwOnlyRecGP || 0;
  const cwOnlyNRGP = r78Data.cwOnlyNRGP || 0;
  const cwOnlyTotalGP = r78Data.cwOnlyTotalGP || (cwOnlyRecGP + cwOnlyNRGP);
  const cwOnlyGross = cwOnlyTotalGP - boardPlan.totalCostTotal;
  const cwOnlyNet = cwOnlyGross + (boardPlan.mdfTotal || 0);

  pdf.autoTable({
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Metric', 'Closed/Won Only', 'Full Forecast', 'Variance']],
    body: [
      ['Recurring GP (R78)', money(cwOnlyRecGP), money(boardPlan.closedRecurringGP), money(boardPlan.closedRecurringGP - cwOnlyRecGP)],
      ['Non-Recurring GP', money(cwOnlyNRGP), money(boardPlan.closedNonRecurringGP), money(boardPlan.closedNonRecurringGP - cwOnlyNRGP)],
      ['Total GP', money(cwOnlyTotalGP), money(boardPlan.totalGPTotal), money(boardPlan.totalGPTotal - cwOnlyTotalGP)],
      ['Total Costs', money(boardPlan.totalCostTotal), money(boardPlan.totalCostTotal), '—'],
      ['Gross Profit', money(cwOnlyGross), money(boardPlan.grossProfitTotal), money(boardPlan.grossProfitTotal - cwOnlyGross)],
      ...(boardPlan.mdfTotal ? [['MDF Offset', '+' + money(boardPlan.mdfTotal), '+' + money(boardPlan.mdfTotal), '—']] : []),
      ['Net Profit', money(cwOnlyNet), money(boardPlan.netProfitTotal), money(boardPlan.netProfitTotal - cwOnlyNet)],
      ['EBITDA', '—', money(boardPlan.ebitdaTotal), '—'],
    ],
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 3, textColor: [40, 40, 40] },
    headStyles: { fillColor: BRAND.navy, textColor: BRAND.white, fontStyle: 'bold', fontSize: 9 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 42 },
      1: { halign: 'right', cellWidth: 38 },
      2: { halign: 'right', cellWidth: 38 },
      3: { halign: 'right', cellWidth: 32 },
    },
    didParseCell: (data) => {
      if (data.section === 'body') {
        const label = data.row.raw[0];
        if (label === 'Total GP' || label === 'Gross Profit' || label === 'Net Profit') {
          data.cell.styles.fontStyle = 'bold';
        }
      }
    },
  });
  y = pdf.lastAutoTable.finalY + 10;

  sectionHeading('Annual Cost Breakdown', 'Business operating costs');
  pdf.autoTable({
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Cost Category', 'Annual Amount']],
    body: [
      ...boardPlan.costBreakdown.map(c => [c.name, money(c.value)]),
      ['TOTAL', money(boardPlan.totalCostTotal)],
    ],
    theme: 'striped',
    styles: { fontSize: 9, cellPadding: 3, textColor: [40, 40, 40] },
    headStyles: { fillColor: BRAND.red, textColor: BRAND.white, fontStyle: 'bold', fontSize: 9 },
    alternateRowStyles: { fillColor: [255, 245, 245] },
    columnStyles: { 1: { halign: 'right' } },
    didParseCell: (data) => {
      if (data.section === 'body' && data.row.raw[0] === 'TOTAL') {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [255, 230, 230];
      }
    },
  });
  y = pdf.lastAutoTable.finalY + 10;

  // ═══════════════════════════════════════════════════════════════════════════
  // MONTHLY P&L
  // ═══════════════════════════════════════════════════════════════════════════
  pdf.addPage();
  y = margin;

  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(30, 30, 30);
  pdf.text('Monthly P&L Forecast', margin, y + 4);
  y += 12;

  sectionHeading('Month-by-Month Breakdown', 'From Business Plan figures — CW + Negotiating deals');

  pdf.autoTable({
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Month', 'Rec. GP', 'NR GP', 'Total GP', 'Costs', 'Net Profit', 'EBITDA', 'Cumulative']],
    body: boardPlan.monthlyData.map(m => [
      m.month, money(m.recurringGP), money(m.nonRecurringGP), money(m.totalGP),
      money(m.totalCost), money(m.netProfit), money(m.ebitda), money(m.cumulativeEBITDA),
    ]),
    foot: [[
      'Year Total', money(boardPlan.closedRecurringGP), money(boardPlan.closedNonRecurringGP),
      money(boardPlan.totalGPTotal), money(boardPlan.totalCostTotal), money(boardPlan.netProfitTotal),
      money(boardPlan.ebitdaTotal), money(boardPlan.cumulativeEBITDAFinal),
    ]],
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2.5, textColor: [40, 40, 40] },
    headStyles: { fillColor: BRAND.navy, textColor: BRAND.white, fontStyle: 'bold', fontSize: 8 },
    footStyles: { fillColor: BRAND.navy, textColor: BRAND.white, fontStyle: 'bold', fontSize: 8 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 20 },
      1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' },
      4: { halign: 'right' }, 5: { halign: 'right' }, 6: { halign: 'right' }, 7: { halign: 'right' },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index >= 5) {
        const m = boardPlan.monthlyData[data.row.index];
        if (m) {
          const num = data.column.index === 5 ? m.netProfit : data.column.index === 6 ? m.ebitda : m.cumulativeEBITDA;
          if (num < 0) data.cell.styles.textColor = BRAND.red;
        }
      }
    },
  });
  y = pdf.lastAutoTable.finalY + 10;

  // ═══════════════════════════════════════════════════════════════════════════
  // REP PERFORMANCE
  // ═══════════════════════════════════════════════════════════════════════════
  ensureSpace(60);
  sectionHeading('Sales Rep Performance', 'Target: £24,000 monthly recurring GP per rep');

  pdf.autoTable({
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Rep', 'Deals', 'CW Rec. GP', 'Total GP', '% Target', 'Cost', 'ROI']],
    body: analysis.repPerformance.map(r => [
      r.owner, r.dealCount.toString(), money(r.cwRecGP), money(r.totalGP),
      r.pctTarget.toFixed(0) + '%', r.annualCost > 0 ? money(r.annualCost) : '—',
      r.annualCost > 0 ? ((r.totalGP / r.annualCost) * 100).toFixed(0) + '%' : '—',
    ]),
    theme: 'striped',
    styles: { fontSize: 9, cellPadding: 3, textColor: [40, 40, 40] },
    headStyles: { fillColor: BRAND.accent, textColor: BRAND.white, fontStyle: 'bold', fontSize: 9 },
    alternateRowStyles: { fillColor: [240, 248, 255] },
    columnStyles: {
      1: { halign: 'center' }, 2: { halign: 'right' }, 3: { halign: 'right' },
      4: { halign: 'center' }, 5: { halign: 'right' }, 6: { halign: 'center' },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 4) {
        const val = parseFloat(data.cell.raw);
        if (val >= 60) data.cell.styles.textColor = BRAND.green;
        else if (val < 30) data.cell.styles.textColor = BRAND.red;
        else data.cell.styles.textColor = BRAND.amber;
      }
      if (data.section === 'body' && data.column.index === 6) {
        const val = parseFloat(data.cell.raw);
        if (!isNaN(val)) data.cell.styles.textColor = val >= 100 ? BRAND.green : BRAND.red;
      }
    },
  });
  y = pdf.lastAutoTable.finalY + 10;

  // ═══════════════════════════════════════════════════════════════════════════
  // DEAL TABLES
  // ═══════════════════════════════════════════════════════════════════════════
  const dealSections = [
    { title: 'Closed Won Deals', subtitle: 'Confirmed revenue', deals: boardPlan.closedWonDeals, color: BRAND.green },
    { title: 'Negotiating Deals', subtitle: 'In active negotiation — at risk', deals: boardPlan.negotiatingDeals, color: BRAND.amber },
    { title: 'Quoting Deals', subtitle: 'Proposals sent — potential upside', deals: boardPlan.quotingDeals, color: BRAND.purple },
    { title: 'Early Stage Pipeline', subtitle: 'Lead / Qualified — future pipeline', deals: boardPlan.earlyStageDeals, color: BRAND.muted },
  ];

  for (const section of dealSections) {
    if (section.deals.length === 0) continue;
    ensureSpace(40);
    sectionHeading(section.title, `${section.subtitle} — ${section.deals.length} deals`);

    const totalRev = section.deals.reduce((s, d) => s + d.revenue, 0);
    const totalGP = section.deals.reduce((s, d) => s + d.profit, 0);

    pdf.autoTable({
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Customer', 'Rep', 'Type', 'Service', 'Revenue', 'GP', 'Start']],
      body: section.deals.sort((a, b) => b.profit - a.profit).map(d => [
        d.customer, d.owner, d.dealType, d.serviceType || '—',
        money(d.revenue), money(d.profit), d.billingStart || d.predictedMonth || '—',
      ]),
      foot: [['TOTAL', '', '', '', money(totalRev), money(totalGP), '']],
      theme: 'striped',
      styles: { fontSize: 8, cellPadding: 2.5, textColor: [40, 40, 40], overflow: 'ellipsize' },
      headStyles: { fillColor: section.color, textColor: BRAND.white, fontStyle: 'bold', fontSize: 8 },
      footStyles: { fillColor: section.color, textColor: BRAND.white, fontStyle: 'bold', fontSize: 8 },
      alternateRowStyles: { fillColor: [245, 248, 252] },
      columnStyles: {
        0: { cellWidth: 38 }, 1: { cellWidth: 24 }, 2: { cellWidth: 22 }, 3: { cellWidth: 22 },
        4: { halign: 'right', cellWidth: 22 }, 5: { halign: 'right', cellWidth: 18 }, 6: { cellWidth: 22 },
      },
    });
    y = pdf.lastAutoTable.finalY + 8;
  }

  // GP by Service Type
  if (boardPlan.gpByServiceType && boardPlan.gpByServiceType.length > 0) {
    ensureSpace(40);
    sectionHeading('GP by Service Type', 'Non-recurring gross profit breakdown');
    const totalSvcGP = boardPlan.gpByServiceType.reduce((s, st) => s + st.value, 0);
    pdf.autoTable({
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Service Type', 'GP', '% of Total']],
      body: boardPlan.gpByServiceType.map(s => [
        s.name, money(s.value), totalSvcGP > 0 ? pct(s.value / totalSvcGP) : '0%',
      ]),
      theme: 'striped',
      styles: { fontSize: 9, cellPadding: 3, textColor: [40, 40, 40] },
      headStyles: { fillColor: BRAND.purple, textColor: BRAND.white, fontStyle: 'bold', fontSize: 9 },
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'center' } },
    });
    y = pdf.lastAutoTable.finalY + 10;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // METHODOLOGY & DISCLAIMER
  // ═══════════════════════════════════════════════════════════════════════════
  ensureSpace(60);
  y += 10;
  pdf.setDrawColor(...BRAND.muted);
  pdf.setLineWidth(0.3);
  pdf.line(margin, y, margin + contentW, y);
  y += 8;

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...BRAND.muted);
  pdf.text('Notes & Methodology', margin, y);
  y += 6;

  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  const notes = [
    'Rule of 78 (R78) weighting applied to recurring GP based on billing start date. Cal Year: Jan=12/78 to Dec=1/78. FY: Oct=12/78 to Sep=1/78.',
    '"Closed/Won Only" = confirmed deals only. "Full Forecast" = CW + Negotiating as modelled in Business Plan.',
    'MDF (Market Development Fund) shown as separate offset between Gross Profit and Net Profit.',
    'Pipeline bands: Large recurring >= £1,000/mo MRR, Large non-recurring >= £10,000. Low-value recurring < £300/mo.',
    'Rep target: £24,000 monthly recurring GP per sales rep (business plan benchmark).',
    'Auto-generated from uploaded Board Business Plan Excel. Figures match the source spreadsheet.',
  ];
  notes.forEach(line => {
    ensureSpace(8);
    const lines = pdf.splitTextToSize('• ' + line, contentW);
    pdf.text(lines, margin, y);
    y += lines.length * 3.8 + 1;
  });

  // ── Page footers on all pages ──
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    if (i === 1) continue; // Cover has its own
    pdf.setFontSize(8);
    pdf.setTextColor(...BRAND.muted);
    pdf.text(`Unleashed — Board Sales Report | ${dateStr}`, margin, pageH - 8);
    pdf.text(`Page ${i} of ${totalPages}`, pageW - margin, pageH - 8, { align: 'right' });
    pdf.setDrawColor(...BRAND.accent);
    pdf.setLineWidth(0.3);
    pdf.line(margin, pageH - 12, pageW - margin, pageH - 12);
  }

  // ── SAVE (download, not print) ──
  const filename = `Unleashed-Board-Sales-Report-${new Date().toISOString().split('T')[0]}.pdf`;
  pdf.save(filename);
  return filename;
}
