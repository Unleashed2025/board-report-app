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
  if (v == null || isNaN(v)) return '\u00A30';
  const abs = Math.abs(v);
  const formatted = abs.toLocaleString('en-GB', { maximumFractionDigits: 0 });
  return (v < 0 ? '-\u00A3' : '\u00A3') + formatted;
};

const pct = (v) => (v * 100).toFixed(1) + '%';

// -- Manual table drawing (no jspdf-autotable dependency) ---------------------

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

  return y + 8;
}

// -- Narrative Analysis Engine ------------------------------------------------

function analyseData(boardPlan, r78Data) {
  const closedWonDeals = boardPlan.closedWonDeals || [];
  const negotiatingDeals = boardPlan.negotiatingDeals || [];
  const quotingDeals = boardPlan.quotingDeals || [];
  const earlyStageDeals = boardPlan.earlyStageDeals || [];
  const totalGPTotal = boardPlan.totalGPTotal || 0;
  const totalCostTotal = boardPlan.totalCostTotal || 0;
  const netProfitTotal = boardPlan.netProfitTotal || 0;
  const mdfTotal = boardPlan.mdfTotal || 0;
  const monthlyData = boardPlan.monthlyData || [];
  const gpByServiceType = boardPlan.gpByServiceType || [];
  const employeeCosts = boardPlan.employeeCosts || [];

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

  // -- Narratives --
  // Use the SAME figures as the dashboard -- R78-weighted annual GP
  const cwOnlyTotalGP = r78Data?.cwOnlyTotalGP || 0;
  const cwOnlyRecGP = r78Data?.cwOnlyRecGP || 0;
  const cwOnlyNRGP = r78Data?.cwOnlyNRGP || 0;
  const cwOnlyGross = cwOnlyTotalGP - totalCostTotal;
  const gap = cwOnlyGross < 0 ? Math.abs(cwOnlyGross) : 0;

  // -- Delivery duration: use spreadsheet column if available, else only flag known risky types --
  const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const parseMonth = (m) => {
    if (!m) return null;
    const parts = String(m).split(' ');
    const mi = MONTH_NAMES.findIndex(n => parts[0]?.startsWith(n));
    const yr = parseInt(parts[1] || parts[0], 10);
    if (mi === -1) return null;
    return { month: mi, year: yr > 100 ? yr : 2000 + yr };
  };
  const addDays = (parsed, days) => {
    if (!parsed) return null;
    const d = new Date(parsed.year, parsed.month, 15);
    d.setDate(d.getDate() + days);
    return { month: d.getMonth(), year: d.getFullYear() };
  };
  const fmtMonth = (p) => p ? `${MONTH_NAMES[p.month]} ${p.year}` : 'TBC';
  const isBeforeDec = (p) => p && (p.year < 2026 || (p.year === 2026 && p.month <= 11));

  // Only estimate delivery for known high-risk deal types; use spreadsheet value if provided
  const getDeliveryDays = (d) => {
    if (d.deliveryDays && d.deliveryDays > 0) return d.deliveryDays; // from spreadsheet
    const desc = (d.description || '').toLowerCase();
    if (desc.includes('vcto') || desc.includes('audit') || desc.includes('vct')) return 120;
    if (desc.includes('migrat')) return 60;
    return 0; // unknown -- don't guess
  };

  const theGood = [], theBad = [], trends = [];

  // -- Build gap bridge deals with delivery risk --
  const gapBridgeDeals = negotiatingDeals.map(d => {
    const deliveryDays = getDeliveryDays(d);
    const closeParsed = parseMonth(d.predictedMonth || d.billingStart);
    const billingParsed = deliveryDays > 0 ? addDays(closeParsed, deliveryDays) : null;
    const billsThisYear = deliveryDays > 0 ? isBeforeDec(billingParsed) : true; // assume safe if unknown
    const hasDeliveryRisk = deliveryDays > 0 && !billsThisYear;
    return {
      customer: d.customer || 'Unknown',
      description: d.description || '',
      serviceType: d.serviceType || '',
      dealType: d.dealType || '',
      monthlyGP: d.profit,
      expectedClose: d.predictedMonth || d.billingStart || 'TBC',
      billingStart: deliveryDays > 0 ? fmtMonth(billingParsed) : '--',
      deliveryDays,
      billsThisYear,
      hasDeliveryRisk,
      owner: d.owner || '',
    };
  }).sort((a, b) => b.monthlyGP - a.monthlyGP);

  const totalNegGP = gapBridgeDeals.reduce((s, d) => s + d.monthlyGP, 0);
  const atRiskDeals = gapBridgeDeals.filter(d => d.hasDeliveryRisk);
  const atRiskGP = atRiskDeals.reduce((s, d) => s + d.monthlyGP, 0);

  // Group negotiating deals by close month for the narrative
  const byCloseMonth = {};
  gapBridgeDeals.forEach(d => {
    const m = d.expectedClose || 'TBC';
    if (!byCloseMonth[m]) byCloseMonth[m] = { gp: 0, count: 0 };
    byCloseMonth[m].gp += d.monthlyGP;
    byCloseMonth[m].count += 1;
  });
  const closeMonthSummary = Object.entries(byCloseMonth)
    .map(([month, data]) => `${month}: ${data.count} deal${data.count > 1 ? 's' : ''} (${money(data.gp)}/mo GP)`)
    .join(', ');

  // -- The Good --
  if (closedWonDeals.length > 0 && cwOnlyTotalGP > 0) {
    theGood.push(`${closedWonDeals.length} deals closed and won, contributing ${money(cwOnlyTotalGP)} GP to the year (R78-weighted: ${money(cwOnlyRecGP)} recurring + ${money(cwOnlyNRGP)} non-recurring).`);
  }
  if (netProfitTotal > 0) {
    theGood.push(`Based on forecast deals, we are projecting profitability before calendar year end with a net profit of ${money(netProfitTotal)}.`);
  }
  if (closeMonthSummary) {
    theGood.push(`We are looking to close the remaining ${money(gap)} gap across the following months: ${closeMonthSummary}.`);
  }
  if (breakevenMonth) theGood.push(`Recurring GP covers costs from ${breakevenMonth.month} -- self-sustaining position reached.`);
  if (avgGrowth > 0) theGood.push(`Recurring GP trending upward with avg. monthly growth of ${money(avgGrowth)}.`);
  const strongReps = repPerformance.filter(r => r.pctTarget >= 60);
  if (strongReps.length > 0) theGood.push(`${strongReps.map(r => r.owner).join(' & ')} tracking above 60% of £24k target.`);
  if (mdfTotal > 0) theGood.push(`MDF contributes ${money(mdfTotal)} as an additional profit buffer.`);

  // -- The Bad --
  if (gap > 0) {
    theBad.push(`Closed/Won deals generate ${money(cwOnlyTotalGP)} GP against ${money(totalCostTotal)} in costs -- a gap of ${money(gap)}. The business is reliant on closing negotiating pipeline to bridge this gap.`);
  }
  if (netProfitTotal < 0) theBad.push(`Even with negotiating deals, forecast shows a net loss of ${money(Math.abs(netProfitTotal))}. Cost control and pipeline conversion are critical.`);

  // Delivery risk narrative
  if (atRiskDeals.length > 0) {
    const atRiskNames = atRiskDeals.map(d => `${d.customer} (${d.deliveryDays}-day delivery, closes ${d.expectedClose})`).join('; ');
    theBad.push(`DELIVERY RISK: ${atRiskDeals.length} deal${atRiskDeals.length > 1 ? 's' : ''} totalling ${money(atRiskGP)}/mo GP may not bill before December due to delivery timelines. VCTo audits require 120 days, migrations 50-60 days. At-risk deals: ${atRiskNames}.`);
    theBad.push(`The challenge is not just closing these deals -- it is delivering them. Billing start date follows completion of delivery. Deals closing after August with 120-day delivery timelines will not accrue revenue before calendar year end.`);
  }
  if (gapBridgeDeals.length > 0 && gap > 0) {
    theBad.push(`${negotiatingDeals.length} deals bridge the ${money(gap)} gap (${money(totalNegGP)}/mo GP total). See "Deals Bridging the Gap" table for customer, value, expected close, delivery time and billing start.`);
  }
  const weakReps = repPerformance.filter(r => r.pctTarget < 30 && r.dealCount > 0);
  if (weakReps.length > 0) theBad.push(`${weakReps.map(r => r.owner).join(' & ')} below 30% of £24k target -- action plans needed.`);
  if (!breakevenMonth) theBad.push(`Recurring GP doesn't cover costs in forecast period -- reliant on non-recurring revenue.`);

  const totalPCount = pipelineRecurring.length;
  if (totalPCount > 0 && pipelineBigRecurring.length / totalPCount > 0.5)
    trends.push({ title: 'High-Value Pipeline Concentration', type: 'warning', text: `${pipelineBigRecurring.length}/${totalPCount} recurring pipeline deals (${pct(pipelineBigRecurring.length / totalPCount)}) are >=${money(MRR_HIGH)}/mo. Heavy weighting toward large deals = longer cycles + higher slippage risk.` });
  if (totalPCount > 0 && pipelineSmallRecurring.length < 3)
    trends.push({ title: pipelineSmallRecurring.length === 0 ? 'No Small Deal Pipeline' : 'Low-Value Pipeline Gap', type: pipelineSmallRecurring.length === 0 ? 'critical' : 'warning',
      text: pipelineSmallRecurring.length === 0 ? `Zero low-value recurring deals (<${money(MRR_LOW)}/mo) in pipeline. Entire pipeline is mid-to-large, creating concentration risk.` : `Only ${pipelineSmallRecurring.length} deals below ${money(MRR_LOW)}/mo. Need smaller, faster-closing deals for pipeline breadth.` });

  const recPct = allDeals.length > 0 ? recurringDeals.length / allDeals.length : 0;
  if (recPct < 0.4) trends.push({ title: 'Low Recurring Ratio', type: 'warning', text: `Only ${pct(recPct)} of deals are recurring. Target 60%+ for predictable revenue.` });
  else if (recPct >= 0.6) trends.push({ title: 'Strong Recurring Mix', type: 'positive', text: `${pct(recPct)} of deals are recurring -- good revenue predictability.` });

  const avgMRR = recurringDeals.length > 0 ? recurringDeals.reduce((s, d) => s + d.revenue, 0) / recurringDeals.length : 0;
  const avgNR = nonRecurringDeals.length > 0 ? nonRecurringDeals.reduce((s, d) => s + d.revenue, 0) / nonRecurringDeals.length : 0;
  trends.push({ title: 'Average Deal Values', type: 'info', text: `Avg recurring MRR: ${money(avgMRR)}/mo | Avg NR value: ${money(avgNR)}. ${avgMRR > MRR_HIGH ? 'Deals skew large -- ensure lower-value volume.' : avgMRR < MRR_LOW ? 'Deals small -- look for anchor accounts.' : 'Healthy mid-range.'}` });

  if (domPct > 0.6 && domSvc) trends.push({ title: 'Service Concentration', type: 'info', text: `${domSvc.name} = ${pct(domPct)} of NR GP. Diversification reduces risk.` });

  const sizeDist = [
    { band: `Large (>=${money(MRR_HIGH)}/mo)`, count: bigRecurring.length, gp: bigRecurring.reduce((s, d) => s + d.profit, 0), p: recurringDeals.length > 0 ? pct(bigRecurring.length / recurringDeals.length) : '0%' },
    { band: `Mid (${money(MRR_LOW)}-${money(MRR_HIGH)})`, count: midRecurring.length, gp: midRecurring.reduce((s, d) => s + d.profit, 0), p: recurringDeals.length > 0 ? pct(midRecurring.length / recurringDeals.length) : '0%' },
    { band: `Small (<${money(MRR_LOW)}/mo)`, count: smallRecurring.length, gp: smallRecurring.reduce((s, d) => s + d.profit, 0), p: recurringDeals.length > 0 ? pct(smallRecurring.length / recurringDeals.length) : '0%' },
  ];
  const nrDist = [
    { band: `Large (>=${money(NRR_HIGH)})`, count: bigNR.length, gp: bigNR.reduce((s, d) => s + d.profit, 0), p: nonRecurringDeals.length > 0 ? pct(bigNR.length / nonRecurringDeals.length) : '0%' },
    { band: `Mid`, count: midNR.length, gp: midNR.reduce((s, d) => s + d.profit, 0), p: nonRecurringDeals.length > 0 ? pct(midNR.length / nonRecurringDeals.length) : '0%' },
    { band: `Small (<${money(NRR_LOW)})`, count: smallNR.length, gp: smallNR.reduce((s, d) => s + d.profit, 0), p: nonRecurringDeals.length > 0 ? pct(smallNR.length / nonRecurringDeals.length) : '0%' },
  ];

  return { theGood, theBad, trends, sizeDist, nrDist, repPerformance, breakevenMonth, gapBridgeDeals, gap, cwOnlyTotalGP, totalCostTotal };
}

// -- PDF Generator ------------------------------------------------------------

export async function generateBoardPDF(boardPlan, r78Data = {}) {
  try {
    // Normalize boardPlan with safe defaults
    boardPlan = boardPlan || {};
    boardPlan.closedWonDeals = boardPlan.closedWonDeals || [];
    boardPlan.negotiatingDeals = boardPlan.negotiatingDeals || [];
    boardPlan.quotingDeals = boardPlan.quotingDeals || [];
    boardPlan.earlyStageDeals = boardPlan.earlyStageDeals || [];
    boardPlan.monthlyData = boardPlan.monthlyData || [];
    boardPlan.costBreakdown = boardPlan.costBreakdown || [];
    boardPlan.gpByServiceType = boardPlan.gpByServiceType || [];
    boardPlan.employeeCosts = boardPlan.employeeCosts || [];
    boardPlan.totalGPTotal = boardPlan.totalGPTotal || 0;
    boardPlan.totalCostTotal = boardPlan.totalCostTotal || 0;
    boardPlan.netProfitTotal = boardPlan.netProfitTotal || 0;
    boardPlan.mdfTotal = boardPlan.mdfTotal || 0;
    boardPlan.closedRecurringGP = boardPlan.closedRecurringGP || 0;
    boardPlan.closedNonRecurringGP = boardPlan.closedNonRecurringGP || 0;
    boardPlan.grossProfitTotal = boardPlan.grossProfitTotal || 0;
    boardPlan.ebitdaTotal = boardPlan.ebitdaTotal || 0;
    boardPlan.cumulativeEBITDAFinal = boardPlan.cumulativeEBITDAFinal || 0;

  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const pageW = 210, pageH = 297, margin = 15;
  const contentW = pageW - margin * 2;
  let y = margin;

  const analysis = analyseData(boardPlan, r78Data);
  const dateStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const monthYear = new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  const ensureSpace = (n) => { if (y + n > pageH - 20) { pdf.addPage(); y = margin; } };

  const heading = (title, sub) => {
    ensureSpace(28);
    y += 6;
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

  // ===================================================================
  // COVER PAGE
  // ===================================================================
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
    pdf.text(`${st.l}: ${st.c} deals -- ${money(st.gp)}/mo GP`, margin + 4, 198 + i * 10);
  });

  pdf.setFontSize(8); pdf.setTextColor(...BRAND.muted);
  pdf.text('CONFIDENTIAL -- For Board & Senior Leadership Only', pageW / 2, pageH - 20, { align: 'center' });
  pdf.setFillColor(...BRAND.accent); pdf.rect(0, pageH - 4, pageW, 4, 'F');

  // ===================================================================
  // EXECUTIVE SUMMARY
  // ===================================================================
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
  if (analysis.theBad.length === 0) bullet('No significant concerns -- all on track.', BRAND.green);
  analysis.theBad.forEach(item => bullet(item, BRAND.red));
  y += 4;

  // -- Deals Bridging the Gap table --
  if (analysis.gapBridgeDeals.length > 0 && analysis.gap > 0) {
    heading('Deals Bridging the Gap', `CW GP: ${money(analysis.cwOnlyTotalGP)} | Costs: ${money(analysis.totalCostTotal)} | Gap: ${money(analysis.gap)} -- these negotiating deals must close AND deliver to reach profitability`);
    const gapRows = analysis.gapBridgeDeals.map(d => {
      const deliveryCol = d.deliveryDays > 0 ? `${d.deliveryDays}d` : '-';
      const riskFlag = d.hasDeliveryRisk ? ' !' : '';
      const desc = d.description.length > 30 ? d.description.substring(0, 28) + '..' : d.description;
      return [
        d.customer,
        desc || d.dealType,
        d.dealType,
        { text: money(d.monthlyGP), align: 'right' },
        d.expectedClose,
        deliveryCol + riskFlag,
      ];
    });
    const totalNegGP = analysis.gapBridgeDeals.reduce((s, d) => s + d.monthlyGP, 0);
    gapRows.push([
      { text: 'TOTAL', bold: true },
      '', '',
      { text: money(totalNegGP), align: 'right', bold: true },
      '', '',
    ]);
    y = drawTable(pdf, y, margin, contentW,
      ['Customer', 'Description', 'Type', { text: 'Mo. GP', align: 'right' }, 'Close', 'Delivery'],
      gapRows,
      { headColor: [180, 40, 40], colWidths: [32, 42, 22, 25, 28, 22], fontSize: 8, pageH }
    );

    // Delivery risk footnote
    const atRisk = analysis.gapBridgeDeals.filter(d => d.hasDeliveryRisk);
    if (atRisk.length > 0) {
      y += 2;
      pdf.setFontSize(8); pdf.setFont('helvetica', 'italic'); pdf.setTextColor(...BRAND.red);
      const riskNote = `! Delivery risk: ${atRisk.map(d => d.customer).join(', ')} -- billing may not start before Dec 2026. VCTo audits require 120 days, migrations 50-60 days.`;
      const riskLines = pdf.splitTextToSize(riskNote, contentW);
      riskLines.forEach(line => { ensureSpace(5); pdf.text(line, margin, y); y += 4; });
      pdf.setFont('helvetica', 'normal');
    }
    y += 4;
  }

  // ===================================================================
  // HOW CAN WE BRIDGE THE LOSS (only appears when loss-making)
  // ===================================================================
  if (analysis.gap > 0) {
    pdf.addPage(); y = margin;
    pdf.setFontSize(18); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(...BRAND.red);
    pdf.text('How Can We Bridge the Loss?', margin, y + 4); y += 8;
    pdf.setFontSize(9); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(...BRAND.muted);
    const bridgeIntro = `The current FY shows a projected loss of ${money(analysis.gap)}. Below is a strategic breakdown of levers available to close this gap before end of FY.`;
    const bridgeIntroLines = pdf.splitTextToSize(bridgeIntro, contentW);
    bridgeIntroLines.forEach(line => { pdf.text(line, margin, y); y += 4; });
    y += 4;

    // FY boundaries for analysis
    const bNow = new Date();
    const bCurMonth = bNow.getMonth(); // 0-indexed
    const bCurYear = bNow.getFullYear();
    const bFYStart = bCurMonth >= 10 ? bCurYear : bCurYear - 1;
    const bFYEndYM = (bFYStart + 1) * 12 + 9; // Oct end
    const bCurYM = bCurYear * 12 + bCurMonth;
    const bMonthsRemaining = bFYEndYM - bCurYM;
    const bMONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const bParseMon = (m) => {
      if (!m) return null;
      const parts = String(m).split(' ');
      const mi = bMONTHS.findIndex(n => parts[0]?.startsWith(n));
      const yr = parseInt(parts[1] || parts[0], 10);
      if (mi === -1 || isNaN(yr)) return null;
      return { month: mi, year: yr > 100 ? yr : 2000 + yr };
    };
    const bYmInt = (p) => p ? p.year * 12 + p.month : 0;
    const bInFY = (p) => p && ((p.year === bFYStart && p.month >= 10) || (p.year === bFYStart + 1 && p.month <= 9));

    // -- Lever 1: CW deals billing in new FY that could be brought forward --
    const cwBillingNewFY = boardPlan.closedWonDeals.filter(d => {
      const p = bParseMon(d.billingStart);
      return p && !bInFY(p) && bYmInt(p) > bFYEndYM;
    });
    const cwBringForwardGP = cwBillingNewFY.reduce((s, d) => s + d.profit, 0);

    if (cwBillingNewFY.length > 0) {
      heading('Lever 1: Bring Forward Closed Won Deals', `${cwBillingNewFY.length} deal(s) closed but billing after Oct ${bFYStart + 1} -- can any delivery be accelerated?`);
      const bfRows = cwBillingNewFY.map(d => [
        d.customer,
        (d.description || '').length > 35 ? d.description.substring(0, 33) + '..' : (d.description || d.serviceType || ''),
        d.dealType,
        { text: money(d.profit), align: 'right' },
        d.billingStart || 'TBC',
      ]);
      bfRows.push([{ text: 'Total Potential', bold: true }, '', '', { text: money(cwBringForwardGP), align: 'right', bold: true, color: BRAND.green }, '']);
      y = drawTable(pdf, y, margin, contentW,
        ['Customer', 'Description', 'Type', { text: 'GP', align: 'right' }, 'Billing Start'],
        bfRows,
        { headColor: BRAND.green, colWidths: [35, 50, 22, 25, 30], fontSize: 8, pageH }
      );
      pdf.setFontSize(8); pdf.setFont('helvetica', 'italic'); pdf.setTextColor(...BRAND.muted);
      const bfNote = `Question: Can we accelerate delivery on any of these to start billing before end of Oct ${bFYStart + 1}? Even partial billing would reduce the gap. These deals are already won -- no sales effort required, just delivery scheduling.`;
      const bfLines = pdf.splitTextToSize(bfNote, contentW);
      bfLines.forEach(line => { ensureSpace(5); pdf.text(line, margin, y); y += 4; });
      pdf.setFont('helvetica', 'normal');
      y += 4;
    }

    // -- Lever 2: Negotiation deals that could close and bill this FY --
    const negClosingThisFY = boardPlan.negotiatingDeals.filter(d => {
      const cp = bParseMon(d.predictedMonth || d.billingStart);
      return cp && bInFY(cp);
    });
    const negBillingThisFY = negClosingThisFY.filter(d => {
      const bp = bParseMon(d.billingStart);
      return bp && bYmInt(bp) <= bFYEndYM;
    });

    if (negBillingThisFY.length > 0) {
      const negBillGP = negBillingThisFY.reduce((s, d) => s + d.profit, 0);
      heading('Lever 2: Close Negotiation Deals', `${negBillingThisFY.length} deal(s) that can close AND start billing this FY`);
      const negRows = negBillingThisFY.map(d => [
        d.customer,
        (d.description || '').length > 35 ? d.description.substring(0, 33) + '..' : (d.description || d.serviceType || ''),
        d.dealType,
        { text: money(d.profit), align: 'right' },
        d.predictedMonth || 'TBC',
        d.billingStart || 'TBC',
      ]);
      negRows.push([{ text: 'Total', bold: true }, '', '', { text: money(negBillGP), align: 'right', bold: true, color: BRAND.amber }, '', '']);
      y = drawTable(pdf, y, margin, contentW,
        ['Customer', 'Description', 'Type', { text: 'GP', align: 'right' }, 'Close', 'Billing'],
        negRows,
        { headColor: BRAND.amber, colWidths: [30, 42, 20, 22, 24, 24], fontSize: 8, pageH }
      );
      y += 4;
    }

    // -- Lever 3: Short-term NR work --
    const nrDealsInPipeline = [...boardPlan.negotiatingDeals, ...(boardPlan.quotingDeals || [])].filter(d => d.dealType !== 'Recurring');
    const nrPipelineGP = nrDealsInPipeline.reduce((s, d) => s + d.profit, 0);

    heading('Lever 3: Short-Term Non-Recurring Work', `Can we close ${money(analysis.gap)} of NR GP before end of FY?`);
    const lever3Points = [];
    lever3Points.push(`We need ${money(analysis.gap)} additional GP to break even this FY.`);
    lever3Points.push(`There are ${bMonthsRemaining} months remaining (${bMONTHS[bCurMonth]} ${bCurYear} to Oct ${bFYStart + 1}).`);
    if (nrDealsInPipeline.length > 0) {
      lever3Points.push(`${nrDealsInPipeline.length} NR deal(s) already in pipeline (Negotiating/Quoting) worth ${money(nrPipelineGP)} GP -- can any be fast-tracked?`);
    }
    lever3Points.push(`Consider: consultancy engagements, engineering projects, audit work, or ad-hoc support that can be scoped, sold, and delivered within ${bMonthsRemaining} months.`);
    lever3Points.push(`At current team capacity, what is the realistic delivery bandwidth alongside existing commitments?`);
    lever3Points.forEach(point => bullet(point, BRAND.amber));
    y += 2;

    // -- Lever 4: What we should NOT do --
    heading('What We Should Not Do', 'Protecting the new FY pipeline');
    const protectPoints = [];
    protectPoints.push(`Do NOT pull forward new FY pipeline deals at the expense of ${`FY${String(bFYStart + 1).slice(2)}/${String(bFYStart + 2).slice(2)}`} positioning. Deals already secured for the new FY represent confirmed future revenue.`);
    if (cwBillingNewFY.length > 0) {
      protectPoints.push(`${cwBillingNewFY.length} closed deal(s) worth ${money(cwBringForwardGP)} GP are already banked for the new FY -- killing this pipeline to plug a short-term gap would be counterproductive.`);
    }
    protectPoints.push(`Focus should be on incremental short-term NR wins and delivery acceleration -- not cannibalising the future.`);
    protectPoints.forEach(point => bullet(point, BRAND.purple));
    y += 2;

    // -- New FY NR Project Revenue Impact --
    const newFYLabel = `FY${String(bFYStart + 1).slice(2)}/${String(bFYStart + 2).slice(2)}`;
    const bIsInNewFY = (bs) => {
      const p = bParseMon(bs);
      if (!p) return false;
      return (p.year === bFYStart + 1 && p.month >= 10) || (p.year === bFYStart + 2 && p.month <= 9);
    };
    // CW NR deals billing in new FY
    const cwNRNewFY = boardPlan.closedWonDeals.filter(d => d.dealType !== 'Recurring' && bIsInNewFY(d.billingStart));
    const cwNRNewFYGP = cwNRNewFY.reduce((s, d) => s + d.profit, 0);
    // Negotiation NR deals targeting new FY
    const negNRNewFY = boardPlan.negotiatingDeals.filter(d => d.dealType !== 'Recurring' && (bIsInNewFY(d.billingStart) || bIsInNewFY(d.predictedMonth)));
    const negNRNewFYGP = negNRNewFY.reduce((s, d) => s + d.profit, 0);
    const totalNRNewFYGP = cwNRNewFYGP + negNRNewFYGP;
    const allNRNewFYDeals = [...cwNRNewFY, ...negNRNewFY];
    // Monthly cost run-rate
    const bMonthlyCost = boardPlan.monthlyData[boardPlan.monthlyData.length - 1]?.totalCost || boardPlan.totalCostTotal / 12;
    const monthsCovered = bMonthlyCost > 0 ? totalNRNewFYGP / bMonthlyCost : 0;

    if (allNRNewFYDeals.length > 0) {
      ensureSpace(40);
      heading(`${newFYLabel} Project Revenue Already in the Bank`, `NR GP from closed + negotiation deals billing in the new FY`);

      pdf.setFontSize(9); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(...BRAND.muted);
      const nrIntro = `We already have ${money(cwNRNewFYGP)} of NR GP from ${cwNRNewFY.length} closed won deal(s), plus ${money(negNRNewFYGP)} from ${negNRNewFY.length} deal(s) in negotiation -- a combined ${money(totalNRNewFYGP)} of project GP expected to bill by early ${newFYLabel}. This covers approximately ${monthsCovered.toFixed(1)} months of operating costs (${money(bMonthlyCost)}/mo).`;
      const nrIntroLines = pdf.splitTextToSize(nrIntro, contentW);
      nrIntroLines.forEach(line => { ensureSpace(5); pdf.text(line, margin, y); y += 4; });
      y += 3;

      // Deal table
      const nrNewFYRows = allNRNewFYDeals.map(d => [
        d.customer,
        (d.description || '').length > 30 ? d.description.substring(0, 28) + '..' : (d.description || d.serviceType || ''),
        d.stage === 'Closed-Won' ? 'CW' : 'Neg',
        { text: money(d.revenue), align: 'right' },
        { text: money(d.profit), align: 'right', color: d.stage === 'Closed-Won' ? BRAND.green : BRAND.amber },
        d.billingStart || d.predictedMonth || 'TBC',
      ]);
      nrNewFYRows.push([
        { text: 'TOTAL NR GP', bold: true }, '', '',
        { text: money(allNRNewFYDeals.reduce((s, d) => s + d.revenue, 0)), align: 'right', bold: true },
        { text: money(totalNRNewFYGP), align: 'right', bold: true, color: BRAND.green },
        '',
      ]);
      y = drawTable(pdf, y, margin, contentW,
        ['Customer', 'Description', 'Stage', { text: 'Revenue', align: 'right' }, { text: 'GP', align: 'right' }, 'Billing'],
        nrNewFYRows,
        { headColor: BRAND.green, colWidths: [30, 45, 15, 25, 22, 25], fontSize: 8, pageH }
      );
      y += 3;

      // New FY P&L impact narrative
      // Recurring base carrying into new FY
      const newFYRecBase = boardPlan.closedWonDeals.filter(d => d.dealType === 'Recurring').reduce((s, d) => s + d.profit, 0);
      const negRecGP = boardPlan.negotiatingDeals.filter(d => d.dealType === 'Recurring').reduce((s, d) => s + d.profit, 0);
      const newFYAnnualRecGP = (newFYRecBase + negRecGP) * 12;
      const newFYAnnualCost = bMonthlyCost * 12;
      const newFYRecGap = newFYAnnualRecGP - newFYAnnualCost;
      const newFYWithNR = newFYRecGap + totalNRNewFYGP;

      ensureSpace(40);
      heading(`${newFYLabel} Cost vs Revenue Outlook`, `How NR project GP plugs the recurring gap`);

      const outlookRows = [
        ['Annual Recurring GP (CW + Neg)', { text: money(newFYAnnualRecGP), align: 'right', color: BRAND.green }],
        ['Annual Costs', { text: money(newFYAnnualCost), align: 'right', color: BRAND.red }],
        [{ text: 'Recurring Surplus / (Gap)', bold: true }, { text: money(newFYRecGap), align: 'right', bold: true, color: newFYRecGap >= 0 ? BRAND.green : BRAND.red }],
        ['+ NR Project GP (CW + Neg)', { text: '+' + money(totalNRNewFYGP), align: 'right', color: BRAND.amber }],
        [{ text: 'Net Position with NR', bold: true }, { text: money(newFYWithNR), align: 'right', bold: true, color: newFYWithNR >= 0 ? BRAND.green : BRAND.red }],
      ];
      y = drawTable(pdf, y, margin, contentW,
        ['Metric', { text: newFYLabel, align: 'right' }],
        outlookRows,
        { headColor: BRAND.navy, colWidths: [100, 70], fontSize: 9, pageH }
      );
      y += 3;

      pdf.setFontSize(8); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(...BRAND.muted);
      const outlookNote = newFYWithNR >= 0
        ? `With ${money(totalNRNewFYGP)} of NR project revenue expected to bill by early ${newFYLabel}, the new FY moves into a net positive position of ${money(newFYWithNR)}. The majority of this work is expected to complete and bill by April ${bFYStart + 2}, providing strong early-year cash flow without needing to close additional deals.`
        : `NR project revenue of ${money(totalNRNewFYGP)} reduces the annual gap from ${money(Math.abs(newFYRecGap))} to ${money(Math.abs(newFYWithNR))}. Additional recurring or NR wins will be needed to reach profitability in ${newFYLabel}.`;
      const outlookLines = pdf.splitTextToSize(outlookNote, contentW);
      outlookLines.forEach(line => { ensureSpace(5); pdf.text(line, margin, y); y += 4; });
      y += 4;
    }

    // -- Summary: The Bridge --
    heading('The Bridge Summary', `What needs to happen to close the ${money(analysis.gap)} gap`);
    const bridgeSummaryParts = [];
    let remainingGap = analysis.gap;
    if (cwBillingNewFY.length > 0) {
      bridgeSummaryParts.push(['Accelerate CW delivery', money(cwBringForwardGP) + ' (if all brought forward)', 'Low risk -- deals already won']);
      remainingGap = Math.max(0, remainingGap - cwBringForwardGP);
    }
    if (negBillingThisFY.length > 0) {
      const negGP = negBillingThisFY.reduce((s, d) => s + d.profit, 0);
      bridgeSummaryParts.push(['Close negotiation deals', money(negGP) + ' monthly GP', 'Medium risk -- deals in progress']);
      remainingGap = Math.max(0, remainingGap - negGP * bMonthsRemaining);
    }
    bridgeSummaryParts.push(['New short-term NR work', money(remainingGap > 0 ? remainingGap : 0) + ' needed', remainingGap > 0 ? 'Required to fully bridge' : 'May not be needed if above levers land']);

    y = drawTable(pdf, y, margin, contentW,
      ['Lever', 'Potential GP', 'Risk Level'],
      bridgeSummaryParts.map(p => [p[0], { text: p[1], align: 'right' }, p[2]]),
      { headColor: BRAND.red, colWidths: [50, 50, 70], fontSize: 8, pageH }
    );
    y += 4;

    if (remainingGap > 0) {
      pdf.setFontSize(9); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(...BRAND.red);
      ensureSpace(8);
      pdf.text(`Bottom line: We need to generate ${money(remainingGap)} in additional GP through short-term NR work over the next ${bMonthsRemaining} months.`, margin, y);
      y += 6;
      pdf.setFont('helvetica', 'normal'); pdf.setTextColor(...BRAND.muted);
      pdf.setFontSize(8);
      const blNote = `That equates to roughly ${money(Math.ceil(remainingGap / bMonthsRemaining))}/month of additional GP. Is this achievable with current resources and delivery capacity?`;
      const blLines = pdf.splitTextToSize(blNote, contentW);
      blLines.forEach(line => { ensureSpace(5); pdf.text(line, margin, y); y += 4; });
    } else {
      pdf.setFontSize(9); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(...BRAND.green);
      ensureSpace(8);
      pdf.text(`If the above levers land, we can bridge the ${money(analysis.gap)} gap without new pipeline -- focus on execution.`, margin, y);
      y += 6;
    }
  }

  // ===================================================================
  // SALES TRENDS
  // ===================================================================
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

  // ===================================================================
  // FINANCIAL OVERVIEW
  // ===================================================================
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
    ['Total Costs', { text: money(boardPlan.totalCostTotal), align: 'right', color: BRAND.red }, { text: money(boardPlan.totalCostTotal), align: 'right', color: BRAND.red }, { text: '--', align: 'right' }],
    [{ text: 'Gross Profit', bold: true }, { text: money(cwGross), align: 'right', bold: true, color: cwGross >= 0 ? BRAND.green : BRAND.red }, { text: money(boardPlan.grossProfitTotal), align: 'right', bold: true, color: boardPlan.grossProfitTotal >= 0 ? BRAND.green : BRAND.red }, { text: money(boardPlan.grossProfitTotal - cwGross), align: 'right' }],
  ];
  if (boardPlan.mdfTotal) fRows.push(['MDF Offset', { text: '+' + money(boardPlan.mdfTotal), align: 'right' }, { text: '+' + money(boardPlan.mdfTotal), align: 'right' }, { text: '--', align: 'right' }]);
  fRows.push([{ text: 'Net Profit', bold: true }, { text: money(cwNet), align: 'right', bold: true, color: cwNet >= 0 ? BRAND.green : BRAND.red }, { text: money(boardPlan.netProfitTotal), align: 'right', bold: true, color: boardPlan.netProfitTotal >= 0 ? BRAND.green : BRAND.red }, { text: money(boardPlan.netProfitTotal - cwNet), align: 'right' }]);
  fRows.push(['EBITDA', { text: '--', align: 'right' }, { text: money(boardPlan.ebitdaTotal), align: 'right' }, { text: '--', align: 'right' }]);

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

  // ===================================================================
  // JANUARY STARTING POSITION
  // ===================================================================
  y += 6;
  ensureSpace(60);
  heading('January ' + (new Date().getFullYear() + 1) + ' Starting Position', 'Monthly recurring GP vs monthly costs entering the new year');

  const cwRecMonthlyGP = boardPlan.closedWonDeals.filter(d => d.dealType === 'Recurring').reduce((s, d) => s + d.profit, 0);
  const cwRecMonthlyRev = boardPlan.closedWonDeals.filter(d => d.dealType === 'Recurring').reduce((s, d) => s + d.revenue, 0);
  const negRecDeals = boardPlan.negotiatingDeals.filter(d => d.dealType === 'Recurring');
  const negRecMonthlyGP = negRecDeals.reduce((s, d) => s + d.profit, 0);
  const negRecMonthlyRev = negRecDeals.reduce((s, d) => s + d.revenue, 0);
  const totalRecMonthlyGP = cwRecMonthlyGP + negRecMonthlyGP;
  const totalRecMonthlyRev = cwRecMonthlyRev + negRecMonthlyRev;
  const monthlyCostJan = boardPlan.monthlyData[boardPlan.monthlyData.length - 1]?.totalCost || boardPlan.totalCostTotal / 12;
  const cwMonthlyGapJan = cwRecMonthlyGP - monthlyCostJan;
  const forecastMonthlyGapJan = totalRecMonthlyGP - monthlyCostJan;

  const janRows = [
    ['CW Recurring Revenue', { text: money(cwRecMonthlyRev) + '/mo', align: 'right' }, { text: '-', align: 'right' }, { text: money(cwRecMonthlyRev) + '/mo', align: 'right' }],
    ['CW Recurring GP', { text: money(cwRecMonthlyGP) + '/mo', align: 'right', color: BRAND.green }, { text: '-', align: 'right' }, { text: money(cwRecMonthlyGP) + '/mo', align: 'right', color: BRAND.green }],
    ['+ Negotiating Recurring Revenue', { text: '-', align: 'right' }, { text: money(negRecMonthlyRev) + '/mo', align: 'right', color: BRAND.amber }, { text: money(totalRecMonthlyRev) + '/mo', align: 'right' }],
    ['+ Negotiating Recurring GP', { text: '-', align: 'right' }, { text: money(negRecMonthlyGP) + '/mo', align: 'right', color: BRAND.amber }, { text: money(totalRecMonthlyGP) + '/mo', align: 'right', color: BRAND.green }],
    [{ text: 'Monthly Costs', bold: true }, { text: money(monthlyCostJan) + '/mo', align: 'right', color: BRAND.red }, { text: '-', align: 'right' }, { text: money(monthlyCostJan) + '/mo', align: 'right', color: BRAND.red }],
    [{ text: 'Monthly Surplus / (Gap)', bold: true },
      { text: money(cwMonthlyGapJan) + '/mo', align: 'right', bold: true, color: cwMonthlyGapJan >= 0 ? BRAND.green : BRAND.red },
      { text: '+' + money(negRecMonthlyGP), align: 'right', color: BRAND.amber },
      { text: money(forecastMonthlyGapJan) + '/mo', align: 'right', bold: true, color: forecastMonthlyGapJan >= 0 ? BRAND.green : BRAND.red }],
    [{ text: 'Annualised Surplus / (Gap)', bold: true },
      { text: money(cwMonthlyGapJan * 12), align: 'right', bold: true, color: cwMonthlyGapJan >= 0 ? BRAND.green : BRAND.red },
      { text: '', align: 'right' },
      { text: money(forecastMonthlyGapJan * 12), align: 'right', bold: true, color: forecastMonthlyGapJan >= 0 ? BRAND.green : BRAND.red }],
  ];

  y = drawTable(pdf, y, margin, contentW,
    ['Metric', { text: 'CW Only', align: 'right' }, { text: '+ Negotiating', align: 'right' }, { text: 'Forecast Total', align: 'right' }],
    janRows,
    { headColor: BRAND.accent, colWidths: [55, 35, 35, 40], pageH }
  );
  y += 3;

  // Summary narrative
  pdf.setFontSize(8); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(...BRAND.muted);
  const janNarrative = cwMonthlyGapJan < 0
    ? `On confirmed deals alone, we enter January ${money(Math.abs(cwMonthlyGapJan))}/mo short of breakeven (${money(Math.abs(cwMonthlyGapJan * 12))}/yr). ${forecastMonthlyGapJan >= 0 ? `If all negotiating deals land, we start January in surplus at ${money(forecastMonthlyGapJan)}/mo.` : `Even with negotiating deals, still ${money(Math.abs(forecastMonthlyGapJan))}/mo short -- additional pipeline or cost reduction needed.`}`
    : `Confirmed deals already cover monthly costs with ${money(cwMonthlyGapJan)}/mo surplus. Strong starting position for the new year.`;
  const janLines = pdf.splitTextToSize(janNarrative, contentW);
  janLines.forEach(line => { ensureSpace(5); pdf.text(line, margin, y); y += 4; });

  // ===================================================================
  // NEW FY POSITION
  // ===================================================================
  pdf.addPage(); y = margin;
  pdf.setFontSize(18); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(30, 30, 30);
  pdf.text('New FY Starting Position', margin, y + 4); y += 12;

  // Determine FY boundaries
  const fyNow = new Date();
  const fyCurMonth = fyNow.getMonth();
  const fyCurYear = fyNow.getFullYear();
  const fyStartYr = fyCurMonth >= 9 ? fyCurYear : fyCurYear - 1;
  const newFYStartYr = fyStartYr + 1;
  const fyMonthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  const parseBillStart = (bs) => {
    if (!bs) return null;
    const parts = String(bs).split(' ');
    const mi = fyMonthNames.indexOf(parts[0]);
    const yr = parseInt(parts[1]);
    if (mi === -1 || isNaN(yr)) return null;
    return { mi, yr };
  };
  const isBeforeNewFYPdf = (bs) => {
    const p = parseBillStart(bs);
    if (!p) return false;
    return (p.yr < newFYStartYr) || (p.yr === newFYStartYr && p.mi < 9);
  };
  const isInNewFYPdf = (bs) => {
    const p = parseBillStart(bs);
    if (!p) return false;
    return (p.yr === newFYStartYr && p.mi >= 9) || (p.yr === newFYStartYr + 1 && p.mi <= 8);
  };

  // Recurring CW billing before new FY (carrying forward)
  const fyRecCarrying = boardPlan.closedWonDeals.filter(d => d.dealType === 'Recurring' && isBeforeNewFYPdf(d.billingStart));
  const fyRecCarryingGP = fyRecCarrying.reduce((s, d) => s + d.profit, 0);
  const fyRecCarryingRev = fyRecCarrying.reduce((s, d) => s + d.revenue, 0);

  // Recurring CW billing starts in new FY
  const fyRecNewFY = boardPlan.closedWonDeals.filter(d => d.dealType === 'Recurring' && isInNewFYPdf(d.billingStart));
  const fyRecNewFYGP = fyRecNewFY.reduce((s, d) => s + d.profit, 0);

  // NR CW deals billing in new FY
  const fyNRDeferred = boardPlan.closedWonDeals.filter(d => d.dealType !== 'Recurring' && !isBeforeNewFYPdf(d.billingStart));
  const fyNRDeferredGP = fyNRDeferred.reduce((s, d) => s + d.profit, 0);
  const fyNRDeferredRev = fyNRDeferred.reduce((s, d) => s + d.revenue, 0);

  // Negotiating recurring that would carry
  const fyNegRecCarrying = boardPlan.negotiatingDeals.filter(d => d.dealType === 'Recurring' && isBeforeNewFYPdf(d.billingStart));
  const fyNegRecCarryingGP = fyNegRecCarrying.reduce((s, d) => s + d.profit, 0);

  // Pipeline totals
  const fyNegAll = boardPlan.negotiatingDeals;
  const fyQuoting = (boardPlan.quotingDeals || []);
  const fyEarly = (boardPlan.earlyStageDeals || []);

  const fyMonthlyCost = boardPlan.monthlyData[boardPlan.monthlyData.length - 1]?.totalCost || boardPlan.totalCostTotal / 12;
  const fyTotalRecGP = fyRecCarryingGP + fyRecNewFYGP;
  const fyGapCW = fyTotalRecGP - fyMonthlyCost;
  const fyGapForecast = (fyTotalRecGP + fyNegRecCarryingGP) - fyMonthlyCost;

  heading(`Entering Oct ${newFYStartYr} - Sep ${newFYStartYr + 1}`, 'Confirmed monthly recurring position + pipeline for the new financial year');

  // Summary table
  const fyPosHead = ['', { text: 'CW Only', align: 'right' }, { text: '+ Negotiating', align: 'right' }, { text: 'Forecast', align: 'right' }];
  const fyPosBody = [
    ['Monthly Recurring Revenue', { text: money(fyRecCarryingRev) + '/mo', align: 'right' }, { text: '+' + money(fyNegRecCarrying.reduce((s, d) => s + d.revenue, 0)) + '/mo', align: 'right', color: BRAND.amber }, { text: money(fyRecCarryingRev + fyNegRecCarrying.reduce((s, d) => s + d.revenue, 0)) + '/mo', align: 'right' }],
    ['Monthly Recurring GP', { text: money(fyTotalRecGP) + '/mo', align: 'right', color: BRAND.green }, { text: '+' + money(fyNegRecCarryingGP) + '/mo', align: 'right', color: BRAND.amber }, { text: money(fyTotalRecGP + fyNegRecCarryingGP) + '/mo', align: 'right', color: BRAND.green }],
    [{ text: 'Monthly Costs', bold: true }, { text: money(fyMonthlyCost) + '/mo', align: 'right', color: BRAND.red }, { text: '-', align: 'right' }, { text: money(fyMonthlyCost) + '/mo', align: 'right', color: BRAND.red }],
    [{ text: 'Monthly Surplus / (Gap)', bold: true }, { text: money(fyGapCW) + '/mo', align: 'right', bold: true, color: fyGapCW >= 0 ? BRAND.green : BRAND.red }, { text: '+' + money(fyNegRecCarryingGP), align: 'right', color: BRAND.amber }, { text: money(fyGapForecast) + '/mo', align: 'right', bold: true, color: fyGapForecast >= 0 ? BRAND.green : BRAND.red }],
    [{ text: 'Annualised Surplus / (Gap)', bold: true }, { text: money(fyGapCW * 12), align: 'right', bold: true, color: fyGapCW >= 0 ? BRAND.green : BRAND.red }, { text: '-', align: 'right' }, { text: money(fyGapForecast * 12), align: 'right', bold: true, color: fyGapForecast >= 0 ? BRAND.green : BRAND.red }],
  ];
  drawTable(pdf, fyPosHead, fyPosBody, margin, y, contentW, { headerBg: [13, 35, 56], rowHeight: 7 });
  y += 7 + fyPosBody.length * 7 + 5;

  // NR deferred cash
  if (fyNRDeferred.length > 0) {
    ensureSpace(30);
    heading('Non-Recurring Revenue (Billing in New FY)', 'Closed-Won project/NR deals generating cash flow in the new FY');
    const nrHead = ['Customer', 'Description', 'Service', 'Billing', { text: 'Revenue', align: 'right' }, { text: 'GP', align: 'right' }];
    const nrBody = fyNRDeferred.map(d => [
      d.customer, (d.description || '').substring(0, 25), d.serviceType || '', d.billingStart || '',
      { text: money(d.revenue), align: 'right' }, { text: money(d.profit), align: 'right', color: BRAND.amber }
    ]);
    nrBody.push([{ text: 'Total NR in New FY', bold: true }, '', '', '', { text: money(fyNRDeferredRev), align: 'right', bold: true }, { text: money(fyNRDeferredGP), align: 'right', bold: true, color: BRAND.amber }]);
    drawTable(pdf, nrHead, nrBody, margin, y, contentW, { headerBg: [13, 35, 56], rowHeight: 6 });
    y += 7 + nrBody.length * 6 + 5;
  }

  // Pipeline summary
  ensureSpace(30);
  heading('Pipeline for New FY', 'Deals in Negotiating, Quoting, Qualified, and Lead stages');
  const pipeHead = ['Stage', { text: 'Deals', align: 'right' }, { text: 'Revenue', align: 'right' }, { text: 'GP', align: 'right' }];
  const pipeBody = [
    ['Negotiating', { text: String(fyNegAll.length), align: 'right' }, { text: money(fyNegAll.reduce((s, d) => s + d.revenue, 0)), align: 'right' }, { text: money(fyNegAll.reduce((s, d) => s + d.profit, 0)), align: 'right', color: BRAND.amber }],
    ['Quoting', { text: String(fyQuoting.length), align: 'right' }, { text: money(fyQuoting.reduce((s, d) => s + d.revenue, 0)), align: 'right' }, { text: money(fyQuoting.reduce((s, d) => s + d.profit, 0)), align: 'right' }],
    ['Qualified / Lead', { text: String(fyEarly.length), align: 'right' }, { text: money(fyEarly.reduce((s, d) => s + d.revenue, 0)), align: 'right' }, { text: money(fyEarly.reduce((s, d) => s + d.profit, 0)), align: 'right' }],
    [{ text: 'Total Pipeline', bold: true }, { text: String(fyNegAll.length + fyQuoting.length + fyEarly.length), align: 'right', bold: true }, { text: money(fyNegAll.reduce((s, d) => s + d.revenue, 0) + fyQuoting.reduce((s, d) => s + d.revenue, 0) + fyEarly.reduce((s, d) => s + d.revenue, 0)), align: 'right', bold: true }, { text: money(fyNegAll.reduce((s, d) => s + d.profit, 0) + fyQuoting.reduce((s, d) => s + d.profit, 0) + fyEarly.reduce((s, d) => s + d.profit, 0)), align: 'right', bold: true }],
  ];
  drawTable(pdf, pipeHead, pipeBody, margin, y, contentW, { headerBg: [13, 35, 56], rowHeight: 7 });
  y += 7 + pipeBody.length * 7 + 5;

  // FY narrative
  ensureSpace(20);
  pdf.setFontSize(8); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(...BRAND.muted);
  const fyNarrative = fyGapCW < 0
    ? `Entering the new FY, confirmed recurring GP of ${money(fyTotalRecGP)}/mo against ${money(fyMonthlyCost)}/mo costs leaves a ${money(Math.abs(fyGapCW))}/mo gap. ${fyGapForecast >= 0 ? `If negotiating deals close, surplus of ${money(fyGapForecast)}/mo.` : `Even with negotiating deals, still ${money(Math.abs(fyGapForecast))}/mo short.`}${fyNRDeferred.length > 0 ? ` Additionally ${money(fyNRDeferredGP)} NR GP from ${fyNRDeferred.length} closed deals will bill in the new FY.` : ''}`
    : `Strong position entering new FY -- confirmed recurring GP of ${money(fyTotalRecGP)}/mo covers ${money(fyMonthlyCost)}/mo costs with ${money(fyGapCW)}/mo surplus.${fyNRDeferred.length > 0 ? ` Plus ${money(fyNRDeferredGP)} NR project revenue.` : ''}`;
  const fyNarrLines = pdf.splitTextToSize(fyNarrative, contentW);
  fyNarrLines.forEach(line => { ensureSpace(5); pdf.text(line, margin, y); y += 4; });

  // ===================================================================
  // MONTHLY P&L
  // ===================================================================
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

  // ===================================================================
  // REP PERFORMANCE
  // ===================================================================
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
      { text: r.annualCost > 0 ? money(r.annualCost) : '--', align: 'right' },
      { text: r.annualCost > 0 ? ((r.totalGP / r.annualCost) * 100).toFixed(0) + '%' : '--', align: 'right', color: r.annualCost > 0 ? (r.totalGP >= r.annualCost ? BRAND.green : BRAND.red) : BRAND.muted },
    ]),
    { headColor: BRAND.accent, colWidths: [35, 18, 26, 26, 22, 26, 22], pageH }
  );

  // ===================================================================
  // DEAL TABLES
  // ===================================================================
  const sections = [
    { title: 'Closed Won Deals', sub: 'Confirmed revenue', deals: boardPlan.closedWonDeals, color: BRAND.green },
    { title: 'Negotiating Deals', sub: 'In negotiation -- at risk', deals: boardPlan.negotiatingDeals, color: BRAND.amber },
    { title: 'Quoting Deals', sub: 'Proposals sent', deals: boardPlan.quotingDeals, color: BRAND.purple },
    { title: 'Early Stage Pipeline', sub: 'Lead / Qualified', deals: boardPlan.earlyStageDeals, color: BRAND.muted },
  ];

  for (const sec of sections) {
    if (sec.deals.length === 0) continue;
    ensureSpace(40);
    heading(sec.title, `${sec.sub} -- ${sec.deals.length} deals`);

    const totRev = sec.deals.reduce((s, d) => s + d.revenue, 0);
    const totGP = sec.deals.reduce((s, d) => s + d.profit, 0);

    y = drawTable(pdf, y, margin, contentW,
      ['Customer', 'Description', 'Type', { text: 'Revenue', align: 'right' }, { text: 'GP', align: 'right' }, 'Start'],
      sec.deals.sort((a, b) => b.profit - a.profit).map(d => {
        const desc = (d.description || '').length > 25 ? d.description.substring(0, 23) + '..' : (d.description || '-');
        return [
          d.customer, desc, d.dealType,
          { text: money(d.revenue), align: 'right' },
          { text: money(d.profit), align: 'right', color: BRAND.green },
          d.billingStart || d.predictedMonth || '-',
        ];
      }),
      { headColor: sec.color, fontSize: 7, rowHeight: 6, colWidths: [30, 36, 20, 24, 22, 24], footRow: ['TOTAL', '', '', money(totRev), money(totGP), ''], pageH }
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

  // ===================================================================
  // NOTES
  // ===================================================================
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
    'Deal bands: Large recurring >= £1,000/mo MRR, Large NR >= £10,000.',
    'Rep target: £24,000 monthly recurring GP per sales rep.',
    'Auto-generated from uploaded Board Business Plan Excel.',
  ].forEach(line => {
    ensureSpace(8);
    const l = pdf.splitTextToSize('* ' + line, contentW);
    pdf.text(l, margin, y); y += l.length * 3.8 + 1;
  });

  // Page footers
  const tp = pdf.getNumberOfPages();
  for (let i = 2; i <= tp; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8); pdf.setTextColor(...BRAND.muted);
    pdf.text(`Unleashed -- Board Sales Report | ${dateStr}`, margin, pageH - 8);
    pdf.text(`Page ${i} of ${tp}`, pageW - margin, pageH - 8, { align: 'right' });
    pdf.setDrawColor(...BRAND.accent); pdf.setLineWidth(0.3);
    pdf.line(margin, pageH - 12, pageW - margin, pageH - 12);
  }

  // DOWNLOAD (not print!)
  const filename = `Unleashed-Board-Sales-Report-${new Date().toISOString().split('T')[0]}.pdf`;
  pdf.save(filename);
  return filename;
  } catch (err) {
    console.error('[BoardPDF] Generation failed:', err);
    throw err;
  }
}
