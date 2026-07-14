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

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const money = (value) => {
  if (value == null || Number.isNaN(Number(value))) return '£0';
  const n = Math.round(Number(value));
  return `${n < 0 ? '-£' : '£'}${Math.abs(n).toLocaleString('en-GB')}`;
};

function parseMonth(label) {
  if (!label) return null;
  if (/^\d{4}-\d{2}/.test(String(label))) {
    const [year, month] = String(label).split('-').map(Number);
    return { year, month: month - 1 };
  }
  const date = new Date(label);
  if (Number.isNaN(date.getTime())) return null;
  return { month: date.getMonth(), year: date.getFullYear() };
}

function getFY() {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  const start = month >= 10 ? year : year - 1;
  return {
    start,
    newStart: start + 1,
    label: `FY${String(start).slice(2)}/${String(start + 1).slice(2)}`,
    newLabel: `FY${String(start + 1).slice(2)}/${String(start + 2).slice(2)}`,
  };
}

function inFY(parsed, fyStart) {
  if (!parsed) return false;
  return (parsed.year === fyStart && parsed.month >= 10) || (parsed.year === fyStart + 1 && parsed.month <= 9);
}

function ymInt(parsed) {
  return parsed ? parsed.year * 12 + parsed.month : 0;
}

function monthName(parsed) {
  return parsed ? `${MONTH_NAMES[parsed.month]} ${parsed.year}` : 'TBC';
}

function summarise(deals) {
  const recurring = deals.filter((deal) => deal.dealType === 'Recurring');
  const nonRecurring = deals.filter((deal) => deal.dealType !== 'Recurring');
  return {
    count: deals.length,
    recCount: recurring.length,
    nrCount: nonRecurring.length,
    monthlyRev: recurring.reduce((sum, deal) => sum + (deal.revenue || 0), 0),
    monthlyGP: recurring.reduce((sum, deal) => sum + (deal.profit || 0), 0),
    nrRev: nonRecurring.reduce((sum, deal) => sum + (deal.revenue || 0), 0),
    nrGP: nonRecurring.reduce((sum, deal) => sum + (deal.profit || 0), 0),
  };
}

function buildFYMonths(fyStart) {
  return Array.from({ length: 12 }, (_, idx) => {
    const month = (10 + idx) % 12;
    const year = month >= 10 ? fyStart : fyStart + 1;
    return {
      idx,
      month,
      year,
      shortLabel: MONTH_NAMES[month],
      label: `${MONTH_NAMES[month]} ${year}`,
    };
  });
}

function getFYIndex(parsed, fyStart) {
  if (!parsed) return 0;
  let idx;
  if (parsed.month >= 10) idx = parsed.month - 10 + (parsed.year === fyStart ? 0 : 12);
  else idx = parsed.month + 2 + (parsed.year === fyStart + 1 ? 0 : (parsed.year > fyStart + 1 ? 12 : -12));
  return Math.max(0, Math.min(11, idx));
}

function calcFYContribution(deal, fyStart) {
  const billing = deal._bill || parseMonth(deal.billingStart);
  if (!billing || !inFY(billing, fyStart)) return 0;
  if (deal.dealType === 'Recurring') {
    return (12 - getFYIndex(billing, fyStart)) * (deal.profit || 0);
  }
  return deal.profit || 0;
}

function drawFootRow(pdf, y, margin, head, footRow, widths, opts = {}) {
  const { headColor = BRAND.accent, fontSize = 8.5, rowHeight = 7 } = opts;
  const totalWidth = widths.reduce((sum, width) => sum + width, 0);
  pdf.setFillColor(...headColor);
  pdf.rect(margin, y, totalWidth, rowHeight + 1, 'F');
  pdf.setFontSize(fontSize);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...BRAND.white);
  let x = margin + 2;
  footRow.forEach((cell, idx) => {
    const value = typeof cell === 'object' ? String(cell.text) : String(cell);
    const align = typeof cell === 'object' && cell.align ? cell.align : (typeof head[idx] === 'object' ? head[idx].align : 'left');
    if (align === 'right') {
      pdf.text(value, margin + widths.slice(0, idx + 1).reduce((sum, width) => sum + width, 0) - 2, y + 5, { align: 'right' });
    } else {
      pdf.text(value, x, y + 5);
    }
    x += widths[idx];
  });
  return y + rowHeight + 2;
}

function drawTable(pdf, startY, margin, contentW, head, body, opts = {}) {
  const {
    headColor = BRAND.accent,
    fontSize = 8.5,
    rowHeight = 7,
    colWidths,
    footRow,
    pageH = 297,
  } = opts;
  const widths = colWidths || head.map(() => contentW / head.length);
  let y = startY;

  const ensurePage = (needed) => {
    if (y + needed > pageH - 20) {
      pdf.addPage();
      y = 15;
    }
  };

  ensurePage(rowHeight + 2);
  pdf.setFillColor(...headColor);
  pdf.rect(margin, y - 1, widths.reduce((sum, width) => sum + width, 0), rowHeight + 1, 'F');
  pdf.setFontSize(fontSize);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...BRAND.white);

  let x = margin + 2;
  head.forEach((cell, idx) => {
    const value = typeof cell === 'object' ? cell.text : cell;
    const align = typeof cell === 'object' && cell.align ? cell.align : 'left';
    if (align === 'right') {
      pdf.text(String(value), margin + widths.slice(0, idx + 1).reduce((sum, width) => sum + width, 0) - 2, y + 4, { align: 'right' });
    } else {
      pdf.text(String(value), x, y + 4);
    }
    x += widths[idx];
  });
  y += rowHeight + 1;

  body.forEach((row, rowIdx) => {
    ensurePage(rowHeight + 1);
    if (rowIdx % 2 === 0) {
      pdf.setFillColor(242, 246, 250);
      pdf.rect(margin, y - 1, widths.reduce((sum, width) => sum + width, 0), rowHeight, 'F');
    }
    x = margin + 2;
    pdf.setFontSize(fontSize);
    row.forEach((cell, idx) => {
      const value = typeof cell === 'object' ? String(cell.text ?? '') : String(cell ?? '');
      const align = typeof cell === 'object' && cell.align ? cell.align : (typeof head[idx] === 'object' ? head[idx].align : 'left');
      const color = typeof cell === 'object' && cell.color ? cell.color : [45, 55, 72];
      const bold = typeof cell === 'object' && cell.bold;
      pdf.setTextColor(...color);
      pdf.setFont('helvetica', bold ? 'bold' : 'normal');
      const truncated = value.length > 34 ? `${value.slice(0, 32)}..` : value;
      if (align === 'right') {
        pdf.text(truncated, margin + widths.slice(0, idx + 1).reduce((sum, width) => sum + width, 0) - 2, y + 4, { align: 'right' });
      } else {
        pdf.text(truncated, x, y + 4);
      }
      x += widths[idx];
    });
    y += rowHeight;
  });

  if (footRow) {
    ensurePage(rowHeight + 2);
    y = drawFootRow(pdf, y, margin, head, footRow, widths, { headColor, fontSize, rowHeight });
  }

  return y + 2;
}

function prepareNewFYData(boardPlan) {
  const fy = getFY();
  const allDeals = boardPlan.deals || [
    ...(boardPlan.closedWonDeals || []),
    ...(boardPlan.negotiatingDeals || []),
    ...(boardPlan.quotingDeals || []),
    ...(boardPlan.earlyStageDeals || []),
  ];
  const enrich = (deal) => ({ ...deal, _bill: parseMonth(deal.billingStart), _close: parseMonth(deal.predictedMonth) });
  const closedWon = allDeals.filter((deal) => deal.stage === 'Closed-Won').map(enrich);
  const negotiating = allDeals.filter((deal) => deal.stage === 'Negotiating').map(enrich);
  const fyEndYM = (fy.start + 1) * 12 + 9;

  const newFYRecurringBase = closedWon.filter((deal) => deal.dealType === 'Recurring' && deal._bill && ymInt(deal._bill) <= fyEndYM);
  const newFYNewDeals = closedWon.filter((deal) => deal._bill && inFY(deal._bill, fy.newStart));
  const negCloseThisFY = negotiating.filter((deal) => inFY(deal._close, fy.start));
  const negRecurringCarry = negCloseThisFY.filter((deal) => deal.dealType === 'Recurring' && deal._bill && ymInt(deal._bill) <= fyEndYM);
  const newFYCombinedBase = [...newFYRecurringBase, ...negRecurringCarry];

  const pipelineStages = ['Negotiating', 'Quoting', 'Qualified', 'Lead', 'To Be Contacted'];
  const newFYPipeline = allDeals
    .filter((deal) => pipelineStages.includes(deal.stage))
    .map(enrich)
    .filter((deal) => inFY(deal._close, fy.newStart) || inFY(deal._bill, fy.newStart));

  const fyMonths = buildFYMonths(fy.newStart);
  const monthlyData = boardPlan.monthlyData || [];
  const newFYMonthlyData = fyMonths.map((month) => {
    const entry = monthlyData.find((row) => {
      const parsed = parseMonth(row.month);
      return parsed && parsed.month === month.month && parsed.year === month.year;
    });
    return {
      ...month,
      recurringGP: entry ? entry.recurringGP || 0 : 0,
      nonRecurringGP: entry ? entry.nonRecurringGP || 0 : 0,
      totalGP: entry ? entry.totalGP || 0 : 0,
      totalCost: entry ? entry.totalCost || 0 : 0,
      netProfit: entry ? entry.netProfit || 0 : 0,
      ebitda: entry ? entry.ebitda || 0 : 0,
    };
  });

  const employeeCosts = boardPlan.employeeCosts || [];
  const newHires = employeeCosts
    .map((employee) => {
      const firstIdx = (employee.monthlyData || []).findIndex((value) => value > 0);
      if (firstIdx <= 0 || !monthlyData[firstIdx]) return null;
      const startParsed = parseMonth(monthlyData[firstIdx].month);
      if (!inFY(startParsed, fy.newStart)) return null;

      const monthlySalary = Math.round((employee.monthlyData || [])[firstIdx] || 0);
      const annualSalary = Math.round(monthlySalary * 12);
      const annualNI = Math.round(0.15 * Math.max(0, annualSalary - 5000));
      const monthlyNI = Math.round(annualNI / 12);
      const totalMonthlyCost = Math.round(monthlySalary + monthlyNI);
      const monthsActive = 12 - getFYIndex(startParsed, fy.newStart);
      const fyCost = totalMonthlyCost * monthsActive;

      return {
        name: employee.name,
        startMonth: monthName(startParsed),
        startIdx: getFYIndex(startParsed, fy.newStart),
        annualSalary,
        monthlySalary,
        annualNI,
        monthlyNI,
        totalMonthlyCost,
        fyCost,
        monthsActive,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.startIdx - b.startIdx);

  const newFYCombinedBaseSummary = summarise(newFYCombinedBase);
  const newFYNewSummary = summarise(newFYNewDeals);
  const negotiatingDeals = newFYPipeline.filter((deal) => deal.stage === 'Negotiating');
  const quotingDeals = newFYPipeline.filter((deal) => deal.stage === 'Quoting');
  const earlyDeals = newFYPipeline.filter((deal) => ['Qualified', 'Lead', 'To Be Contacted'].includes(deal.stage));

  const baseAnnualGP = newFYCombinedBaseSummary.monthlyGP * 12;
  const securedDealsContribution = newFYNewDeals.reduce((sum, deal) => sum + calcFYContribution(deal, fy.newStart), 0);
  const likelyGP = negotiatingDeals.reduce((sum, deal) => sum + calcFYContribution(deal, fy.newStart), 0);
  const possibleGP = [...quotingDeals, ...earlyDeals].reduce((sum, deal) => sum + calcFYContribution(deal, fy.newStart), 0);
  const securedGP = baseAnnualGP + securedDealsContribution;
  const totalGP = securedGP + likelyGP + possibleGP;
  const totalCosts = newFYMonthlyData.reduce((sum, month) => sum + (month.totalCost || 0), 0);
  const monthlyCostRunRate = newFYMonthlyData[newFYMonthlyData.length - 1]?.totalCost || 0;

  const allNewFYDeals = [...newFYNewDeals, ...newFYPipeline]
    .map((deal) => ({ ...deal, fyIdx: getFYIndex(deal._bill || parseMonth(deal.billingStart), fy.newStart) }))
    .sort((a, b) => a.fyIdx - b.fyIdx || (b.profit || 0) - (a.profit || 0));

  const monthRows = fyMonths.map((month, idx) => {
    const activeDeals = allNewFYDeals.filter((deal) => deal.fyIdx <= idx);
    const recurringGP = activeDeals.filter((deal) => deal.dealType === 'Recurring').reduce((sum, deal) => sum + (deal.profit || 0), 0);
    const nrGP = allNewFYDeals.filter((deal) => deal.fyIdx === idx && deal.dealType !== 'Recurring').reduce((sum, deal) => sum + (deal.profit || 0), 0);
    const cwActiveRecurring = newFYNewDeals
      .map((deal) => ({ ...deal, fyIdx: getFYIndex(deal._bill || parseMonth(deal.billingStart), fy.newStart) }))
      .filter((deal) => deal.dealType === 'Recurring' && deal.fyIdx <= idx)
      .reduce((sum, deal) => sum + (deal.profit || 0), 0);
    const cwNR = newFYNewDeals
      .map((deal) => ({ ...deal, fyIdx: getFYIndex(deal._bill || parseMonth(deal.billingStart), fy.newStart) }))
      .filter((deal) => deal.dealType !== 'Recurring' && deal.fyIdx === idx)
      .reduce((sum, deal) => sum + (deal.profit || 0), 0);
    const costRow = newFYMonthlyData[idx] || {};
    const recGP = newFYCombinedBaseSummary.monthlyGP + recurringGP;
    const totalMonthGP = recGP + nrGP;
    const securedOnly = newFYCombinedBaseSummary.monthlyGP + cwActiveRecurring + cwNR;

    return {
      ...month,
      recGP,
      nrGP,
      totalGP: totalMonthGP,
      costs: costRow.totalCost || 0,
      monthlyNet: totalMonthGP - (costRow.totalCost || 0),
      securedOnly,
      newDeals: allNewFYDeals.filter((deal) => deal.fyIdx === idx),
    };
  });

  let runningCash = 0;
  let runningSecuredCash = 0;
  const cashflowRows = monthRows.map((row) => {
    runningCash += row.monthlyNet;
    runningSecuredCash += row.securedOnly - row.costs;
    return {
      ...row,
      cashBalance: runningCash,
      securedCashBalance: runningSecuredCash,
    };
  });

  const realisticDeals = [...newFYNewDeals, ...negotiatingDeals]
    .map((deal) => ({ ...deal, fyIdx: getFYIndex(deal._bill || parseMonth(deal.billingStart), fy.newStart) }))
    .sort((a, b) => a.fyIdx - b.fyIdx || (b.profit || 0) - (a.profit || 0));

  let realisticCash = 0;
  const realisticRows = fyMonths.map((month, idx) => {
    const activeRecurring = realisticDeals
      .filter((deal) => deal.fyIdx <= idx && deal.dealType === 'Recurring')
      .reduce((sum, deal) => sum + (deal.profit || 0), 0);
    const nrGP = realisticDeals
      .filter((deal) => deal.fyIdx === idx && deal.dealType !== 'Recurring')
      .reduce((sum, deal) => sum + (deal.profit || 0), 0);
    const cost = newFYMonthlyData[idx]?.totalCost || 0;
    const recGP = newFYCombinedBaseSummary.monthlyGP + activeRecurring;
    const net = recGP + nrGP - cost;
    realisticCash += net;
    return {
      ...month,
      recGP,
      nrGP,
      costs: cost,
      net,
      cashBalance: realisticCash,
      newDeals: realisticDeals.filter((deal) => deal.fyIdx === idx),
    };
  });

  const alyshaConfig = (r78Data) => {
    const alysha = r78Data && r78Data.alysha ? r78Data.alysha : {};
    const startIdx = typeof alysha.startIndex === 'number' ? alysha.startIndex : 2;
    const monthsActive = Math.max(0, 12 - startIdx);
    const monthlyRecurringGP = alysha.monthlyRecurringGP || 1000;
    const monthlyNRGP = alysha.monthlyNRGP || 5000;
    const name = alysha.name || 'Alysha';
    const r78Rows = [];
    let r78Total = 0;
    for (let i = 0; i < monthsActive; i += 1) {
      const remaining = monthsActive - i;
      const contribution = monthlyRecurringGP * remaining;
      r78Total += contribution;
      r78Rows.push({
        month: fyMonths[startIdx + i]?.shortLabel || '',
        remaining,
        contribution,
      });
    }
    return {
      name,
      startIdx,
      monthsActive,
      monthlyRecurringGP,
      monthlyNRGP,
      r78Rows,
      r78Total,
      totalNRGP: monthlyNRGP * monthsActive,
      endOfFYMonthlyRec: monthlyRecurringGP * monthsActive,
    };
  };

  return {
    fy,
    newFYRecurringBase,
    newFYNewDeals,
    newFYPipeline,
    newFYCombinedBase,
    newFYCombinedBaseSummary,
    newFYNewSummary,
    negotiatingDeals,
    quotingDeals,
    earlyDeals,
    newFYMonthlyData,
    newHires,
    baseAnnualGP,
    securedDealsContribution,
    securedGP,
    likelyGP,
    possibleGP,
    totalGP,
    totalCosts,
    monthlyCostRunRate,
    monthRows,
    cashflowRows,
    realisticDeals,
    realisticRows,
    alyshaConfig,
  };
}

export async function generateNewFYPDF(boardPlan, r78Data = {}) {
  const data = prepareNewFYData(boardPlan);
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const pageW = 210;
  const pageH = 297;
  const margin = 15;
  const contentW = pageW - margin * 2;
  let y = margin;

  const ensureSpace = (needed) => {
    if (y + needed > pageH - 18) {
      pdf.addPage();
      y = margin;
    }
  };

  const heading = (title, subtitle) => {
    ensureSpace(18);
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
      pdf.setFontSize(8.5);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(...BRAND.muted);
      const lines = pdf.splitTextToSize(subtitle, contentW);
      pdf.text(lines, margin, y);
      y += lines.length * 4 + 2;
    }
  };

  const bullet = (text, color) => {
    ensureSpace(12);
    pdf.setFillColor(...color);
    pdf.circle(margin + 2, y - 1.2, 1.4, 'F');
    pdf.setFontSize(8.8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(60, 60, 60);
    const lines = pdf.splitTextToSize(text, contentW - 9);
    pdf.text(lines, margin + 6, y);
    y += lines.length * 4 + 1;
  };

  const trendCard = (card) => {
    const palette = {
      warning: BRAND.amber,
      critical: BRAND.red,
      positive: BRAND.green,
      info: BRAND.accent,
      purple: BRAND.purple,
    };
    const color = palette[card.type] || BRAND.accent;
    const lines = pdf.splitTextToSize(card.text, contentW - 14);
    const height = 8 + lines.length * 4 + 4;
    ensureSpace(height + 2);
    pdf.setFillColor(...color);
    pdf.roundedRect(margin, y - 2, 2.5, height, 1, 1, 'F');
    pdf.setFontSize(9.5);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...color);
    pdf.text(card.title, margin + 6, y + 1.5);
    y += 6;
    pdf.setFontSize(8.2);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(60, 60, 60);
    pdf.text(lines, margin + 6, y);
    y += lines.length * 4 + 4;
  };

  const stageCounts = {
    cw: data.newFYNewDeals.length,
    negotiating: data.negotiatingDeals.length,
    quoting: data.quotingDeals.length,
    lead: data.earlyDeals.length,
  };

  const bestCasePL = data.totalGP - data.totalCosts;
  const securedOnlyPL = data.securedGP - data.totalCosts;
  const totalPipelineGP = data.securedDealsContribution + data.likelyGP + data.possibleGP;
  const startingGap = data.newFYCombinedBaseSummary.monthlyGP - data.monthlyCostRunRate;
  const positiveMonths = data.cashflowRows.filter((row) => row.cashBalance >= 0).length;
  const peakCashRow = data.cashflowRows.reduce((best, row) => (row.cashBalance > best.cashBalance ? row : best), data.cashflowRows[0] || { cashBalance: 0, label: '-' });
  const decRow = data.cashflowRows.find((row) => row.month === 11) || data.cashflowRows[1];

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

  pdf.setFontSize(28);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...BRAND.white);
  pdf.text('New FY Forecast Report', margin, 68);
  pdf.setFontSize(13);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...BRAND.light);
  pdf.text('FY26/27 Sales Forecast & Financial Position', margin, 80);
  pdf.setFontSize(11);
  pdf.setTextColor(...BRAND.accent);
  pdf.text(data.fy.newLabel, margin, 92);
  pdf.setFontSize(10);
  pdf.setTextColor(...BRAND.muted);
  pdf.text(new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }), margin, 108);

  const coverKPIs = [
    { label: 'Total Pipeline GP', value: money(totalPipelineGP), color: BRAND.accent },
    { label: 'Secured GP', value: money(data.securedGP), color: BRAND.green },
    { label: 'Total Costs', value: money(data.totalCosts), color: BRAND.red },
    { label: 'Best Case P&L', value: money(bestCasePL), color: bestCasePL >= 0 ? BRAND.green : BRAND.amber },
  ];
  const boxWidth = (contentW - 12) / 4;
  coverKPIs.forEach((item, idx) => {
    const x = margin + idx * (boxWidth + 4);
    pdf.setFillColor(...BRAND.darkPanel);
    pdf.roundedRect(x, 140, boxWidth, 32, 2, 2, 'F');
    pdf.setFillColor(...item.color);
    pdf.rect(x, 140, boxWidth, 2, 'F');
    pdf.setFontSize(7.5);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...BRAND.muted);
    pdf.text(item.label, x + boxWidth / 2, 151, { align: 'center' });
    pdf.setFontSize(12.5);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...item.color);
    pdf.text(item.value, x + boxWidth / 2, 163, { align: 'center' });
  });

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...BRAND.light);
  pdf.text('FY Pipeline Shape', margin, 190);
  [
    { label: `Closed Won: ${stageCounts.cw} deal(s)`, sub: `Secured contribution ${money(data.securedDealsContribution)}`, color: BRAND.green },
    { label: `Negotiating: ${stageCounts.negotiating} deal(s)`, sub: `Likely contribution ${money(data.likelyGP)}`, color: BRAND.amber },
    { label: `Quoting + Lead: ${stageCounts.quoting + stageCounts.lead} deal(s)`, sub: `Possible contribution ${money(data.possibleGP)}`, color: BRAND.accent },
  ].forEach((item, idx) => {
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...item.color);
    pdf.text(item.label, margin + 4, 198 + idx * 12);
    pdf.setTextColor(...BRAND.muted);
    pdf.text(item.sub, margin + 8, 203 + idx * 12);
  });

  pdf.setFontSize(8);
  pdf.setTextColor(...BRAND.muted);
  pdf.text('CONFIDENTIAL -- For Board & Senior Leadership Only', pageW / 2, pageH - 20, { align: 'center' });
  pdf.setFillColor(...BRAND.accent);
  pdf.rect(0, pageH - 4, pageW, 4, 'F');

  pdf.addPage();
  y = margin;
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(30, 30, 30);
  pdf.text('Executive Summary', margin, y + 4);
  y += 10;
  pdf.setFontSize(8.8);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...BRAND.muted);
  pdf.text(`Report period: ${data.fy.newLabel} | Nov ${data.fy.newStart} to Oct ${data.fy.newStart + 1}`, margin, y);
  y += 8;

  heading('Starting Position', 'Recurring base already carried into the new FY before any new wins are added.');
  bullet(
    `${data.newFYCombinedBaseSummary.recCount} recurring deals carry forward into ${data.fy.newLabel}, contributing ${money(data.newFYCombinedBaseSummary.monthlyGP)}/mo GP and ${money(data.baseAnnualGP)} across the year.`,
    BRAND.green,
  );
  bullet(
    `Exit run-rate costs are ${money(data.monthlyCostRunRate)}/mo. The opening monthly ${startingGap >= 0 ? 'surplus' : 'gap'} is ${money(startingGap)} before any new FY-only deals land.`,
    startingGap >= 0 ? BRAND.green : BRAND.red,
  );

  heading('The Good', 'Positive indicators and board-level upside.');
  bullet(`Best-case P&L reaches ${money(bestCasePL)} if the full pipeline converts and bills in line with plan.`, bestCasePL >= 0 ? BRAND.green : BRAND.amber);
  bullet(`Cash stays positive for ${positiveMonths}/12 months in the full-pipeline case, peaking at ${money(peakCashRow.cashBalance)} in ${peakCashRow.label}.`, BRAND.accent);
  bullet(`Closed Won billing in FY already contributes ${money(data.securedDealsContribution)} on top of the recurring base.`, BRAND.green);

  heading('The Bad', 'Key dependencies and downside risks.');
  bullet(`Secured-only P&L is ${money(securedOnlyPL)} once recurring base, closed-won deals and planned costs are combined.`, securedOnlyPL >= 0 ? BRAND.green : BRAND.red);
  bullet(`Negotiating deals carry ${money(data.likelyGP)} of value. Slippage here would materially change the FY outcome.`, BRAND.amber);
  bullet(`Quoting + Qualified/Lead pipeline still accounts for ${money(data.possibleGP)} of upside, so the plan is not fully de-risked.`, BRAND.red);

  heading('Stage Mix', 'Shape of the new FY sales forecast by certainty.');
  bullet(`Closed Won billing in FY: ${stageCounts.cw} deal(s).`, BRAND.green);
  bullet(`Negotiating: ${stageCounts.negotiating} deal(s).`, BRAND.amber);
  bullet(`Quoting + Qualified/Lead: ${stageCounts.quoting + stageCounts.lead} deal(s).`, BRAND.accent);

  y += 2;
  trendCard({
    title: 'Base Position',
    type: startingGap >= 0 ? 'positive' : 'critical',
    text: `${data.fy.newLabel} opens at ${money(data.newFYCombinedBaseSummary.monthlyGP)}/mo recurring GP against ${money(data.monthlyCostRunRate)}/mo costs. ${startingGap >= 0 ? 'The business starts above monthly breakeven.' : 'The business starts below monthly breakeven and needs early-year conversions.'}`,
  });
  trendCard({
    title: 'Pipeline Conversion Requirement',
    type: securedOnlyPL >= 0 ? 'info' : 'warning',
    text: securedOnlyPL >= 0
      ? 'Secured business already covers the annual cost base. Pipeline improves resilience and upside rather than plugging a deficit.'
      : `Secured business alone leaves a ${money(Math.abs(securedOnlyPL))} annual shortfall, so negotiating and quoting deals are material to the FY outcome.`,
  });
  trendCard({
    title: 'Early-Year Cash Buffer',
    type: (decRow?.nrGP || 0) > 0 ? 'positive' : 'warning',
    text: (decRow?.nrGP || 0) > 0
      ? `December delivers ${money(decRow.nrGP)} of NR GP, which creates an important runway buffer while recurring GP builds.`
      : 'No meaningful December NR injection is scheduled, so runway depends more heavily on monthly recurring conversion.',
  });

  // ===================================================================
  // DEAL ANALYSIS PAGE
  // ===================================================================
  pdf.addPage();
  y = margin;
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(30, 30, 30);
  pdf.text('Deal Analysis & Pipeline Shape', margin, y + 4);
  y += 10;

  // All new FY deals for analysis
  const allAnalysisDeals = [...data.newFYNewDeals, ...data.newFYPipeline];
  const recDeals = allAnalysisDeals.filter((d) => d.dealType === 'Recurring');
  const nrDeals = allAnalysisDeals.filter((d) => d.dealType !== 'Recurring');

  // Deal size bands
  const microRec = recDeals.filter((d) => (d.profit || 0) < 500);
  const smallRec = recDeals.filter((d) => (d.profit || 0) >= 500 && (d.profit || 0) < 1000);
  const midRec = recDeals.filter((d) => (d.profit || 0) >= 1000 && (d.profit || 0) < 2000);
  const largeRec = recDeals.filter((d) => (d.profit || 0) >= 2000);
  const avgRecGP = recDeals.length > 0 ? Math.round(recDeals.reduce((s, d) => s + (d.profit || 0), 0) / recDeals.length) : 0;
  const avgNRGP = nrDeals.length > 0 ? Math.round(nrDeals.reduce((s, d) => s + (d.profit || 0), 0) / nrDeals.length) : 0;
  const medianRecGP = recDeals.length > 0 ? [...recDeals].sort((a, b) => (a.profit || 0) - (b.profit || 0))[Math.floor(recDeals.length / 2)].profit || 0 : 0;

  // Service type breakdown
  const serviceTypes = {};
  allAnalysisDeals.forEach((d) => {
    const svc = d.serviceType || 'Other';
    if (!serviceTypes[svc]) serviceTypes[svc] = { count: 0, recGP: 0, nrGP: 0 };
    serviceTypes[svc].count += 1;
    if (d.dealType === 'Recurring') serviceTypes[svc].recGP += d.profit || 0;
    else serviceTypes[svc].nrGP += d.profit || 0;
  });
  const svcRows = Object.entries(serviceTypes)
    .sort((a, b) => (b[1].recGP + b[1].nrGP) - (a[1].recGP + a[1].nrGP))
    .map(([name, v]) => [
      name,
      String(v.count),
      { text: money(v.recGP) + '/mo', align: 'right', color: v.recGP > 0 ? BRAND.green : BRAND.muted },
      { text: money(v.nrGP), align: 'right', color: v.nrGP > 0 ? BRAND.amber : BRAND.muted },
    ]);

  // Customer concentration
  const customerDeals = {};
  allAnalysisDeals.forEach((d) => {
    const cust = (d.customer || 'Unknown').split('—')[0].split('–')[0].trim();
    if (!customerDeals[cust]) customerDeals[cust] = { count: 0, totalGP: 0 };
    customerDeals[cust].count += 1;
    customerDeals[cust].totalGP += d.profit || 0;
  });
  const topCustomers = Object.entries(customerDeals)
    .sort((a, b) => b[1].totalGP - a[1].totalGP)
    .slice(0, 5);

  heading('Deal Size Overview', `${allAnalysisDeals.length} deals in the new FY pipeline across all stages.`);
  y = drawTable(
    pdf, y, margin, contentW,
    ['Metric', { text: 'Value', align: 'right' }],
    [
      ['Total deals in pipeline', { text: String(allAnalysisDeals.length), align: 'right', bold: true }],
      ['Recurring deals', { text: `${recDeals.length} (${money(recDeals.reduce((s, d) => s + (d.profit || 0), 0))}/mo total)`, align: 'right', color: BRAND.green }],
      ['Non-recurring deals', { text: `${nrDeals.length} (${money(nrDeals.reduce((s, d) => s + (d.profit || 0), 0))} total)`, align: 'right', color: BRAND.amber }],
      ['Average recurring deal GP', { text: money(avgRecGP) + '/mo', align: 'right' }],
      ['Median recurring deal GP', { text: money(medianRecGP) + '/mo', align: 'right' }],
      ['Average NR deal GP', { text: money(avgNRGP), align: 'right' }],
      ['Largest recurring deal', { text: recDeals.length > 0 ? `${[...recDeals].sort((a, b) => (b.profit || 0) - (a.profit || 0))[0].customer} (${money([...recDeals].sort((a, b) => (b.profit || 0) - (a.profit || 0))[0].profit)}/mo)` : '-', align: 'right' }],
      ['Largest NR deal', { text: nrDeals.length > 0 ? `${[...nrDeals].sort((a, b) => (b.profit || 0) - (a.profit || 0))[0].customer} (${money([...nrDeals].sort((a, b) => (b.profit || 0) - (a.profit || 0))[0].profit)})` : '-', align: 'right' }],
    ],
    { headColor: BRAND.navy, colWidths: [90, 80], pageH },
  );

  heading('Recurring Deal Size Distribution', 'Monthly GP bands showing pipeline depth at each tier.');
  y = drawTable(
    pdf, y, margin, contentW,
    ['Band', 'Deals', { text: 'Total GP/mo', align: 'right' }, { text: 'Avg GP/mo', align: 'right' }],
    [
      [{ text: 'Micro (< £500/mo)', color: microRec.length > 0 ? [45, 55, 72] : BRAND.red }, String(microRec.length), { text: money(microRec.reduce((s, d) => s + (d.profit || 0), 0)), align: 'right' }, { text: microRec.length > 0 ? money(Math.round(microRec.reduce((s, d) => s + (d.profit || 0), 0) / microRec.length)) : '-', align: 'right' }],
      ['Small (£500-£999/mo)', String(smallRec.length), { text: money(smallRec.reduce((s, d) => s + (d.profit || 0), 0)), align: 'right' }, { text: smallRec.length > 0 ? money(Math.round(smallRec.reduce((s, d) => s + (d.profit || 0), 0) / smallRec.length)) : '-', align: 'right' }],
      ['Mid (£1,000-£1,999/mo)', String(midRec.length), { text: money(midRec.reduce((s, d) => s + (d.profit || 0), 0)), align: 'right' }, { text: midRec.length > 0 ? money(Math.round(midRec.reduce((s, d) => s + (d.profit || 0), 0) / midRec.length)) : '-', align: 'right' }],
      ['Large (£2,000+/mo)', String(largeRec.length), { text: money(largeRec.reduce((s, d) => s + (d.profit || 0), 0)), align: 'right' }, { text: largeRec.length > 0 ? money(Math.round(largeRec.reduce((s, d) => s + (d.profit || 0), 0) / largeRec.length)) : '-', align: 'right' }],
    ],
    {
      headColor: BRAND.accent,
      colWidths: [50, 20, 50, 50],
      footRow: ['Total', String(recDeals.length), { text: money(recDeals.reduce((s, d) => s + (d.profit || 0), 0)), align: 'right' }, { text: money(avgRecGP), align: 'right' }],
      pageH,
    },
  );

  heading('GP by Service Type', 'Where the new FY GP is coming from by service line.');
  y = drawTable(
    pdf, y, margin, contentW,
    ['Service Type', 'Deals', { text: 'Recurring GP/mo', align: 'right' }, { text: 'NR GP', align: 'right' }],
    svcRows,
    { headColor: BRAND.green, colWidths: [50, 20, 50, 50], pageH },
  );

  heading('Customer Concentration', 'Top 5 customers by GP contribution — flags single-customer dependency risk.');
  y = drawTable(
    pdf, y, margin, contentW,
    ['Customer', 'Deals', { text: 'Total GP', align: 'right' }, { text: '% of Pipeline', align: 'right' }],
    topCustomers.map(([name, v]) => {
      const totalPipeGP = allAnalysisDeals.reduce((s, d) => s + (d.profit || 0), 0);
      const pctVal = totalPipeGP > 0 ? ((v.totalGP / totalPipeGP) * 100).toFixed(1) : '0';
      return [
        name,
        String(v.count),
        { text: money(v.totalGP), align: 'right', color: BRAND.accent },
        { text: `${pctVal}%`, align: 'right', color: parseFloat(pctVal) > 30 ? BRAND.red : BRAND.muted },
      ];
    }),
    { headColor: BRAND.navy, colWidths: [55, 20, 45, 50], pageH },
  );

  // Pipeline gap analysis
  heading('Pipeline Gaps & Observations', 'What the current pipeline is missing and where to focus.');

  if (microRec.length === 0 && smallRec.length === 0) {
    trendCard({
      title: 'No Small MRR Deals',
      type: 'warning',
      text: `The pipeline contains zero recurring deals under £500/mo GP. Small managed support deals (£250-£500/mo) are typically the fastest to close and provide a steady stream of base-building revenue. Consider targeting smaller organisations or upselling existing relationships.`,
    });
  } else if (microRec.length + smallRec.length < 3) {
    trendCard({
      title: 'Thin Small Deal Pipeline',
      type: 'warning',
      text: `Only ${microRec.length + smallRec.length} deal(s) under £1,000/mo GP in the pipeline. These quick-win deals build recurring base fastest. Consider increasing lead generation activity at the sub-£1,000 tier.`,
    });
  }

  if (largeRec.length === 0) {
    trendCard({
      title: 'No Large Recurring Deals',
      type: 'info',
      text: `No recurring deals above £2,000/mo GP are in the pipeline. Landing even one deal at this level would meaningfully shift the monthly position and reduce dependency on volume.`,
    });
  }

  if (nrDeals.length > 0 && recDeals.length > 0) {
    const nrPct = nrDeals.reduce((s, d) => s + (d.profit || 0), 0) / (allAnalysisDeals.reduce((s, d) => s + (d.profit || 0), 0) || 1);
    if (nrPct > 0.5) {
      trendCard({
        title: 'NR Heavy Pipeline',
        type: 'warning',
        text: `${(nrPct * 100).toFixed(0)}% of pipeline GP is non-recurring. While NR deals provide important cashflow, the long-term goal is to build recurring revenue that covers costs sustainably. Ensure each NR engagement includes a recurring upsell path.`,
      });
    }
  }

  const uniqueCustomers = Object.keys(customerDeals).length;
  if (topCustomers.length > 0) {
    const topCustPct = (topCustomers[0][1].totalGP / (allAnalysisDeals.reduce((s, d) => s + (d.profit || 0), 0) || 1)) * 100;
    if (topCustPct > 30) {
      trendCard({
        title: 'Customer Concentration Risk',
        type: 'critical',
        text: `${topCustomers[0][0]} accounts for ${topCustPct.toFixed(0)}% of pipeline GP across ${topCustomers[0][1].count} deal(s). Losing or delaying this customer would significantly impact the FY position. Consider diversifying the pipeline.`,
      });
    }
  }

  if (uniqueCustomers < 8) {
    trendCard({
      title: 'Narrow Customer Base',
      type: 'warning',
      text: `Only ${uniqueCustomers} distinct customer(s) in the new FY pipeline. A broader customer base reduces risk and improves forecast resilience. Focus lead generation on new logos alongside existing account expansion.`,
    });
  }

  // Positive observations
  if (recDeals.length >= 10) {
    trendCard({
      title: 'Strong Pipeline Volume',
      type: 'positive',
      text: `${recDeals.length} recurring deals in the pipeline provides good volume. Even at a 50% conversion rate, this would add ${money(Math.round(recDeals.reduce((s, d) => s + (d.profit || 0), 0) * 0.5))}/mo to the recurring base.`,
    });
  }

  if (avgRecGP > 800) {
    trendCard({
      title: 'Healthy Average Deal Size',
      type: 'positive',
      text: `Average recurring deal size is ${money(avgRecGP)}/mo GP. This suggests the team is targeting meaningful contracts rather than sub-scale engagements.`,
    });
  } else if (avgRecGP > 0) {
    trendCard({
      title: 'Deal Size Opportunity',
      type: 'info',
      text: `Average recurring deal size is ${money(avgRecGP)}/mo GP. There may be an opportunity to increase average deal value through premium tier offerings or bundled services.`,
    });
  }

  // ===================================================================
  // LEAD GENERATION & SMALL DEAL STRATEGY PAGE
  // ===================================================================
  pdf.addPage();
  y = margin;
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(30, 30, 30);
  pdf.text('Lead Generation & Growth Strategy', margin, y + 4);
  y += 10;

  const sub500Deals = recDeals.filter((d) => (d.profit || 0) > 0 && (d.profit || 0) < 500);
  const sub1kDeals = recDeals.filter((d) => (d.profit || 0) >= 500 && (d.profit || 0) < 1000);
  const totalRecBase = recDeals.reduce((s, d) => s + (d.profit || 0), 0);
  const targetSmallDeals = 10;
  const avgSmallDealGP = 350;
  const potentialSmallMRR = targetSmallDeals * avgSmallDealGP;

  heading('The Small Deal Gap', 'Why building a pipeline of sub-£500/mo deals is critical for sustainable growth.');

  bullet(`Current pipeline has ${sub500Deals.length} deal(s) under £500/mo GP and ${sub1kDeals.length} deal(s) in the £500-£999 range.`, sub500Deals.length === 0 ? BRAND.red : BRAND.amber);
  bullet(`The average deal size across the pipeline is ${money(avgRecGP)}/mo, which means the business is overly reliant on landing larger, slower-moving contracts.`, BRAND.amber);
  bullet(`Smaller deals (£250-£500/mo) typically close 2-3x faster than enterprise deals and build predictable recurring revenue with lower churn risk.`, BRAND.accent);
  bullet(`If ${targetSmallDeals} small managed support deals at ~${money(avgSmallDealGP)}/mo were added, that would contribute an additional ${money(potentialSmallMRR)}/mo to the recurring base.`, BRAND.green);

  trendCard({
    title: 'Revenue Base Building',
    type: 'info',
    text: `Small recurring deals are the foundation of a resilient MSP business. Each £350/mo managed support deal adds £4,200/yr GP. Ten of these adds £42,000/yr — enough to cover a junior resource or materially close the monthly GP vs costs gap. These deals also require less sales effort and shorter procurement cycles.`,
  });

  heading('Lead Generation Recommendations', 'Tactical initiatives to build a pipeline of smaller, faster-closing opportunities that will carry into and through the new FY.');

  trendCard({
    title: '1. Targeted Outbound for SME Managed Support',
    type: 'positive',
    text: `Focus outbound on businesses with 10-50 employees that lack internal IT. Offer packaged managed support tiers (e.g. Bronze £250/mo, Silver £400/mo, Gold £600/mo). These close within 2-4 weeks and provide immediate recurring GP with minimal onboarding cost.`,
  });
  trendCard({
    title: '2. Referral & Partner Programme',
    type: 'positive',
    text: `Establish a simple referral incentive for existing customers (e.g. one month free for a successful intro). Current customers are the best source of like-for-like small deals. Also explore partnerships with accountants and business advisors who work with SMEs.`,
  });
  trendCard({
    title: '3. Upsell Existing Relationships',
    type: 'info',
    text: `Customers on ad-hoc or break-fix arrangements are prime candidates for recurring managed support contracts. Converting even a few project-only clients to £300-£500/mo managed agreements directly builds the recurring base without new customer acquisition cost.`,
  });
  trendCard({
    title: '4. Digital Lead Generation',
    type: 'info',
    text: `Invest in SEO-optimised content around "IT support for small business", Google Ads targeting local IT support queries, and LinkedIn outreach to business owners. A modest £500-£1,000/mo digital spend can generate 5-10 qualified leads per month at the sub-£500 MRR tier.`,
  });
  trendCard({
    title: '5. Quarterly Quick-Win Campaigns',
    type: 'info',
    text: `Run time-limited offers (e.g. "Free IT health check" or "First 3 months at 50%") to create urgency and generate a burst of small-deal pipeline at the start of each quarter. These fills gaps between larger deal conversions and smooth out revenue growth.`,
  });

  heading('Impact on New FY', 'How a stronger small-deal pipeline changes the financial outlook.');

  const smallDealScenarios = [
    ['Current pipeline only', { text: money(totalRecBase) + '/mo', align: 'right' }, { text: money(totalRecBase * 12), align: 'right' }],
    [`+ 5 small deals (${money(avgSmallDealGP)}/mo avg)`, { text: money(totalRecBase + 5 * avgSmallDealGP) + '/mo', align: 'right', color: BRAND.green }, { text: money((totalRecBase + 5 * avgSmallDealGP) * 12), align: 'right', color: BRAND.green }],
    [`+ 10 small deals (${money(avgSmallDealGP)}/mo avg)`, { text: money(totalRecBase + 10 * avgSmallDealGP) + '/mo', align: 'right', color: BRAND.green }, { text: money((totalRecBase + 10 * avgSmallDealGP) * 12), align: 'right', color: BRAND.green }],
    [`+ 15 small deals (${money(avgSmallDealGP)}/mo avg)`, { text: money(totalRecBase + 15 * avgSmallDealGP) + '/mo', align: 'right', color: BRAND.green }, { text: money((totalRecBase + 15 * avgSmallDealGP) * 12), align: 'right', color: BRAND.green }],
  ];
  y = drawTable(
    pdf, y, margin, contentW,
    ['Scenario', { text: 'Monthly Rec GP', align: 'right' }, { text: 'Annual Rec GP', align: 'right' }],
    smallDealScenarios,
    { headColor: BRAND.green, colWidths: [70, 50, 50], pageH },
  );

  bullet(`Even modest lead generation success — 5 new small deals — would add ${money(5 * avgSmallDealGP)}/mo (${money(5 * avgSmallDealGP * 12)}/yr) to the recurring base and reduce dependency on large deal conversion.`, BRAND.green);
  bullet(`Building this pipeline now means these deals start billing in Q1/Q2 of the new FY, compounding through the Rule of 78 across the full year.`, BRAND.accent);

  pdf.addPage();
  y = margin;
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(30, 30, 30);
  pdf.text('Financial Forecast - GP vs Costs', margin, y + 4);
  y += 10;

  const securedDealsRows = data.newFYNewDeals.map((deal) => [
    deal.customer || '-',
    deal.dealType,
    deal.billingStart || 'TBC',
    { text: money(deal.profit || 0) + (deal.dealType === 'Recurring' ? '/mo' : ''), align: 'right', color: BRAND.green },
    { text: money(calcFYContribution(deal, data.fy.newStart)), align: 'right', color: BRAND.green },
  ]);
  const likelyRows = data.negotiatingDeals.map((deal) => [
    deal.customer || '-',
    deal.dealType,
    deal.billingStart || deal.predictedMonth || 'TBC',
    { text: money(deal.profit || 0) + (deal.dealType === 'Recurring' ? '/mo' : ''), align: 'right', color: BRAND.amber },
    { text: money(calcFYContribution(deal, data.fy.newStart)), align: 'right', color: BRAND.amber },
  ]);
  const possibleRows = [...data.quotingDeals, ...data.earlyDeals].map((deal) => [
    deal.customer || '-',
    deal.stage,
    deal.billingStart || deal.predictedMonth || 'TBC',
    { text: money(deal.profit || 0) + (deal.dealType === 'Recurring' ? '/mo' : ''), align: 'right', color: BRAND.accent },
    { text: money(calcFYContribution(deal, data.fy.newStart)), align: 'right', color: BRAND.accent },
  ]);

  heading('Secured (Recurring Base + Closed Won)', `Recurring base contributes ${money(data.baseAnnualGP)}. Closed-won new FY deals add ${money(data.securedDealsContribution)}.`);
  y = drawTable(
    pdf,
    y,
    margin,
    contentW,
    ['Customer', 'Type', 'Billing', { text: 'GP', align: 'right' }, { text: 'FY GP', align: 'right' }],
    [
      [{ text: 'Recurring base carry forward', bold: true }, `${data.newFYCombinedBaseSummary.recCount} deals`, `${data.fy.newLabel}`, { text: money(data.newFYCombinedBaseSummary.monthlyGP) + '/mo', align: 'right', color: BRAND.green, bold: true }, { text: money(data.baseAnnualGP), align: 'right', color: BRAND.green, bold: true }],
      ...securedDealsRows,
    ],
    {
      headColor: BRAND.green,
      colWidths: [50, 28, 28, 28, 36],
      footRow: ['Secured total', '', '', '', { text: money(data.securedGP), align: 'right' }],
      pageH,
    },
  );

  heading('Likely (Negotiating)', `${data.negotiatingDeals.length} deal(s) in negotiation contribute ${money(data.likelyGP)} in the likely case.`);
  y = drawTable(
    pdf,
    y,
    margin,
    contentW,
    ['Customer', 'Type', 'Billing', { text: 'GP', align: 'right' }, { text: 'FY GP', align: 'right' }],
    likelyRows.length > 0 ? likelyRows : [['No negotiating deals', '-', '-', { text: '-', align: 'right' }, { text: '-', align: 'right' }]],
    {
      headColor: BRAND.amber,
      colWidths: [50, 28, 28, 28, 36],
      footRow: ['Likely total', '', '', '', { text: money(data.likelyGP), align: 'right' }],
      pageH,
    },
  );

  heading('Possible (Quoting + Qualified/Lead)', `${data.quotingDeals.length + data.earlyDeals.length} deal(s) contribute ${money(data.possibleGP)} in the upside case.`);
  y = drawTable(
    pdf,
    y,
    margin,
    contentW,
    ['Customer', 'Stage', 'Billing', { text: 'GP', align: 'right' }, { text: 'FY GP', align: 'right' }],
    possibleRows.length > 0 ? possibleRows : [['No quoting or lead deals', '-', '-', { text: '-', align: 'right' }, { text: '-', align: 'right' }]],
    {
      headColor: BRAND.accent,
      colWidths: [50, 28, 28, 28, 36],
      footRow: ['Possible total', '', '', '', { text: money(data.possibleGP), align: 'right' }],
      pageH,
    },
  );

  heading('Totals', 'Full-year picture once GP, costs and plan scenarios are combined.');
  y = drawTable(
    pdf,
    y,
    margin,
    contentW,
    ['Metric', { text: data.fy.newLabel, align: 'right' }],
    [
      ['Recurring base GP', { text: money(data.baseAnnualGP), align: 'right', color: BRAND.green }],
      ['Closed Won GP', { text: money(data.securedDealsContribution), align: 'right', color: BRAND.green }],
      ['Negotiating GP', { text: money(data.likelyGP), align: 'right', color: BRAND.amber }],
      ['Quoting + Lead GP', { text: money(data.possibleGP), align: 'right', color: BRAND.accent }],
      [{ text: 'Total GP', bold: true }, { text: money(data.totalGP), align: 'right', bold: true }],
      ['Total Costs', { text: money(data.totalCosts), align: 'right', color: BRAND.red }],
      [{ text: 'Best Case P&L', bold: true }, { text: money(bestCasePL), align: 'right', bold: true, color: bestCasePL >= 0 ? BRAND.green : BRAND.red }],
      [{ text: 'Secured Only P&L', bold: true }, { text: money(securedOnlyPL), align: 'right', bold: true, color: securedOnlyPL >= 0 ? BRAND.green : BRAND.red }],
    ],
    { headColor: BRAND.navy, colWidths: [105, 65], pageH },
  );

  pdf.addPage();
  y = margin;
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(30, 30, 30);
  pdf.text('New Hire Costs', margin, y + 4);
  y += 10;

  heading('Planned New Hires', 'Detected from employee cost rows that start after month 0 and begin in the new FY.');
  y = drawTable(
    pdf,
    y,
    margin,
    contentW,
    ['Role', 'Start', { text: 'Salary', align: 'right' }, { text: 'NI', align: 'right' }, { text: 'Monthly', align: 'right' }, { text: 'FY Cost', align: 'right' }],
    data.newHires.length > 0
      ? data.newHires.map((hire) => [
          hire.name,
          hire.startMonth,
          { text: money(hire.monthlySalary), align: 'right' },
          { text: money(hire.monthlyNI), align: 'right', color: BRAND.amber },
          { text: money(hire.totalMonthlyCost), align: 'right', color: BRAND.red },
          { text: money(hire.fyCost), align: 'right', color: BRAND.red },
        ])
      : [['No new hires detected', '-', { text: '-', align: 'right' }, { text: '-', align: 'right' }, { text: '-', align: 'right' }, { text: '-', align: 'right' }]],
    {
      headColor: BRAND.red,
      colWidths: [48, 26, 24, 20, 24, 28],
      footRow: [
        'Total',
        '',
        '',
        '',
        { text: money(data.newHires.reduce((sum, hire) => sum + hire.totalMonthlyCost, 0)), align: 'right' },
        { text: money(data.newHires.reduce((sum, hire) => sum + hire.fyCost, 0)), align: 'right' },
      ],
      pageH,
    },
  );

  if (data.newHires.length > 0) {
    bullet(
      `${data.newHires.length} new hire(s) join in ${data.fy.newLabel}. Combined monthly impact reaches ${money(data.newHires.reduce((sum, hire) => sum + hire.totalMonthlyCost, 0))} once fully on-plan.`,
      BRAND.red,
    );
  }

  pdf.addPage();
  y = margin;
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(30, 30, 30);
  pdf.text('Cashflow Runway', margin, y + 4);
  y += 10;

  heading('Runway Metrics', 'Month-by-month cumulative cash view using full pipeline and secured-only scenarios.');
  y = drawTable(
    pdf,
    y,
    margin,
    contentW,
    ['Metric', { text: 'Value', align: 'right' }],
    [
      ['Dec NR injection', { text: money(decRow?.nrGP || 0), align: 'right', color: BRAND.accent }],
      ['Peak cash position', { text: `${money(peakCashRow.cashBalance)} (${peakCashRow.label})`, align: 'right', color: BRAND.green }],
      ['End of FY cash', { text: money(data.cashflowRows[data.cashflowRows.length - 1]?.cashBalance || 0), align: 'right', color: (data.cashflowRows[data.cashflowRows.length - 1]?.cashBalance || 0) >= 0 ? BRAND.green : BRAND.red }],
      ['Secured only end cash', { text: money(data.cashflowRows[data.cashflowRows.length - 1]?.securedCashBalance || 0), align: 'right', color: (data.cashflowRows[data.cashflowRows.length - 1]?.securedCashBalance || 0) >= 0 ? BRAND.green : BRAND.red }],
    ],
    { headColor: BRAND.accent, colWidths: [90, 80], pageH },
  );

  heading('Month-by-Month Cashflow', 'Recurring GP, NR GP and costs stacked into a cumulative runway view.');
  y = drawTable(
    pdf,
    y,
    margin,
    contentW,
    ['Month', { text: 'Rec GP', align: 'right' }, { text: 'NR GP', align: 'right' }, { text: 'Costs', align: 'right' }, { text: 'Net', align: 'right' }, { text: 'Cash', align: 'right' }, { text: 'Secured', align: 'right' }],
    data.cashflowRows.map((row) => [
      row.label,
      { text: money(row.recGP), align: 'right', color: BRAND.green },
      { text: row.nrGP ? money(row.nrGP) : '-', align: 'right', color: BRAND.accent },
      { text: money(row.costs), align: 'right', color: BRAND.red },
      { text: money(row.monthlyNet), align: 'right', color: row.monthlyNet >= 0 ? BRAND.green : BRAND.red },
      { text: money(row.cashBalance), align: 'right', color: row.cashBalance >= 0 ? BRAND.green : BRAND.red },
      { text: money(row.securedCashBalance), align: 'right', color: row.securedCashBalance >= 0 ? BRAND.green : BRAND.red },
    ]),
    {
      headColor: BRAND.navy,
      colWidths: [24, 24, 22, 24, 24, 26, 26],
      footRow: [
        'FY Total',
        { text: money(data.cashflowRows.reduce((sum, row) => sum + row.recGP, 0)), align: 'right' },
        { text: money(data.cashflowRows.reduce((sum, row) => sum + row.nrGP, 0)), align: 'right' },
        { text: money(data.cashflowRows.reduce((sum, row) => sum + row.costs, 0)), align: 'right' },
        { text: money(data.cashflowRows.reduce((sum, row) => sum + row.monthlyNet, 0)), align: 'right' },
        { text: money(data.cashflowRows[data.cashflowRows.length - 1]?.cashBalance || 0), align: 'right' },
        { text: money(data.cashflowRows[data.cashflowRows.length - 1]?.securedCashBalance || 0), align: 'right' },
      ],
      pageH,
    },
  );

  pdf.addPage();
  y = margin;
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(30, 30, 30);
  pdf.text('Realistic Scenario', margin, y + 4);
  y += 10;

  const realisticGP = data.realisticDeals.reduce((sum, deal) => sum + calcFYContribution(deal, data.fy.newStart), 0) + data.baseAnnualGP;
  const realisticPL = data.realisticRows.reduce((sum, row) => sum + row.net, 0);

  heading('CW + Negotiating Only', 'Scenario strips out quoting and early-stage pipeline, leaving only the most credible conversion path.');
  y = drawTable(
    pdf,
    y,
    margin,
    contentW,
    ['Customer', 'Stage', 'Type', 'Billing', { text: 'GP', align: 'right' }, { text: 'FY GP', align: 'right' }],
    data.realisticDeals.map((deal) => [
      deal.customer || '-',
      deal.stage,
      deal.dealType,
      deal.billingStart || deal.predictedMonth || 'TBC',
      { text: money(deal.profit || 0) + (deal.dealType === 'Recurring' ? '/mo' : ''), align: 'right' },
      { text: money(calcFYContribution(deal, data.fy.newStart)), align: 'right', color: BRAND.amber },
    ]),
    {
      headColor: BRAND.amber,
      colWidths: [42, 22, 22, 28, 24, 32],
      footRow: ['Total', '', '', '', '', { text: money(realisticGP), align: 'right' }],
      pageH,
    },
  );

  heading('Without Alysha', 'Recurring base plus CW and negotiating deals only.');
  y = drawTable(
    pdf,
    y,
    margin,
    contentW,
    ['Month', { text: 'Rec GP', align: 'right' }, { text: 'NR', align: 'right' }, { text: 'Costs', align: 'right' }, { text: 'Cash', align: 'right' }],
    data.realisticRows.map((row) => [
      row.label,
      { text: money(row.recGP), align: 'right', color: BRAND.green },
      { text: row.nrGP ? money(row.nrGP) : '-', align: 'right', color: BRAND.accent },
      { text: money(row.costs), align: 'right', color: BRAND.red },
      { text: money(row.cashBalance), align: 'right', color: row.cashBalance >= 0 ? BRAND.green : BRAND.red },
    ]),
    {
      headColor: BRAND.amber,
      colWidths: [34, 32, 28, 32, 34],
      footRow: ['End FY', '', '', '', { text: money(data.realisticRows[data.realisticRows.length - 1]?.cashBalance || 0), align: 'right' }],
      pageH,
    },
  );

  const alysha = data.alyshaConfig(r78Data);
  let alyshaCash = 0;
  const alyshaRows = data.realisticRows.map((row, idx) => {
    const recurringLift = idx >= alysha.startIdx ? alysha.monthlyRecurringGP * (idx - alysha.startIdx + 1) : 0;
    const nrLift = idx >= alysha.startIdx ? alysha.monthlyNRGP : 0;
    const recGP = row.recGP + recurringLift;
    const nrGP = row.nrGP + nrLift;
    const net = recGP + nrGP - row.costs;
    alyshaCash += net;
    return {
      ...row,
      recGP,
      nrGP,
      cashBalance: alyshaCash,
      net,
    };
  });
  const alyshaPL = alyshaRows.reduce((sum, row) => sum + row.net, 0);

  heading(`With ${alysha.name}`, `${alysha.name} overlay adds ${money(alysha.monthlyRecurringGP)}/mo recurring from January and ${money(alysha.monthlyNRGP)}/mo NR from January.`);
  y = drawTable(
    pdf,
    y,
    margin,
    contentW,
    ['Month', { text: 'Rec GP', align: 'right' }, { text: 'NR', align: 'right' }, { text: 'Costs', align: 'right' }, { text: 'Cash', align: 'right' }],
    alyshaRows.map((row) => [
      row.label,
      { text: money(row.recGP), align: 'right', color: BRAND.green },
      { text: row.nrGP ? money(row.nrGP) : '-', align: 'right', color: BRAND.purple },
      { text: money(row.costs), align: 'right', color: BRAND.red },
      { text: money(row.cashBalance), align: 'right', color: row.cashBalance >= 0 ? BRAND.green : BRAND.red },
    ]),
    {
      headColor: BRAND.purple,
      colWidths: [34, 32, 28, 32, 34],
      footRow: ['End FY', '', '', '', { text: money(alyshaRows[alyshaRows.length - 1]?.cashBalance || 0), align: 'right' }],
      pageH,
    },
  );

  heading('End of Year Comparison', 'Incremental effect of Alysha on the realistic scenario.');
  y = drawTable(
    pdf,
    y,
    margin,
    contentW,
    ['Metric', { text: 'Without', align: 'right' }, { text: 'With', align: 'right' }, { text: 'Delta', align: 'right' }],
    [
      ['FY P&L', { text: money(realisticPL), align: 'right', color: realisticPL >= 0 ? BRAND.green : BRAND.red }, { text: money(alyshaPL), align: 'right', color: alyshaPL >= 0 ? BRAND.green : BRAND.red }, { text: money(alyshaPL - realisticPL), align: 'right', color: BRAND.purple }],
      ['End FY cash', { text: money(data.realisticRows[data.realisticRows.length - 1]?.cashBalance || 0), align: 'right' }, { text: money(alyshaRows[alyshaRows.length - 1]?.cashBalance || 0), align: 'right' }, { text: money((alyshaRows[alyshaRows.length - 1]?.cashBalance || 0) - (data.realisticRows[data.realisticRows.length - 1]?.cashBalance || 0)), align: 'right', color: BRAND.purple }],
      ['End FY rec GP', { text: money(data.realisticRows[data.realisticRows.length - 1]?.recGP || 0), align: 'right' }, { text: money(alyshaRows[alyshaRows.length - 1]?.recGP || 0), align: 'right' }, { text: `+${money(alysha.endOfFYMonthlyRec)}`, align: 'right', color: BRAND.purple }],
    ],
    { headColor: BRAND.navy, colWidths: [68, 34, 34, 34], pageH },
  );

  pdf.addPage();
  y = margin;
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(30, 30, 30);
  pdf.text(`Hidden Benefits (${alysha.name})`, margin, y + 4);
  y += 10;

  heading('Rule of 78 Breakdown', `${alysha.name}'s recurring upside is modelled separately from the main forecast.`);
  y = drawTable(
    pdf,
    y,
    margin,
    contentW,
    ['Month Closed', { text: 'GP/mo', align: 'right' }, { text: 'FY Months', align: 'right' }, { text: 'FY GP', align: 'right' }],
    alysha.r78Rows.map((row) => [
      row.month,
      { text: money(alysha.monthlyRecurringGP), align: 'right' },
      { text: `${row.remaining}`, align: 'right' },
      { text: money(row.contribution), align: 'right', color: BRAND.purple },
    ]),
    {
      headColor: BRAND.purple,
      colWidths: [50, 35, 35, 50],
      footRow: ['Total R78 recurring GP', '', '', { text: money(alysha.r78Total), align: 'right' }],
      pageH,
    },
  );

  heading('NR GP Contribution', `${alysha.name} also adds NR project GP alongside recurring wins.`);
  y = drawTable(
    pdf,
    y,
    margin,
    contentW,
    ['Metric', { text: 'Value', align: 'right' }],
    [
      ['Months active', { text: String(alysha.monthsActive), align: 'right' }],
      ['Monthly NR GP', { text: money(alysha.monthlyNRGP), align: 'right', color: BRAND.amber }],
      ['Total NR GP', { text: money(alysha.totalNRGP), align: 'right', color: BRAND.amber }],
      ['R78 recurring GP', { text: money(alysha.r78Total), align: 'right', color: BRAND.purple }],
      [{ text: 'Total hidden benefit GP', bold: true }, { text: money(alysha.totalNRGP + alysha.r78Total), align: 'right', bold: true }],
    ],
    { headColor: BRAND.amber, colWidths: [95, 75], pageH },
  );

  heading('Combined Total with Main Forecast', 'Shows the upside if the hidden benefit is layered on top of the core plan.');
  y = drawTable(
    pdf,
    y,
    margin,
    contentW,
    ['Metric', { text: 'Value', align: 'right' }],
    [
      ['Main forecast GP', { text: money(data.monthRows.reduce((sum, row) => sum + row.totalGP, 0)), align: 'right', color: BRAND.accent }],
      [`+ ${alysha.name} hidden GP`, { text: money(alysha.totalNRGP + alysha.r78Total), align: 'right', color: BRAND.purple }],
      [{ text: 'Combined GP', bold: true }, { text: money(data.monthRows.reduce((sum, row) => sum + row.totalGP, 0) + alysha.totalNRGP + alysha.r78Total), align: 'right', bold: true }],
      [{ text: 'Combined P&L', bold: true }, { text: money(data.monthRows.reduce((sum, row) => sum + row.totalGP, 0) + alysha.totalNRGP + alysha.r78Total - data.totalCosts), align: 'right', bold: true, color: (data.monthRows.reduce((sum, row) => sum + row.totalGP, 0) + alysha.totalNRGP + alysha.r78Total - data.totalCosts) >= 0 ? BRAND.green : BRAND.red }],
      ['Added end FY recurring run-rate', { text: `+${money(alysha.endOfFYMonthlyRec)}/mo`, align: 'right', color: BRAND.green }],
    ],
    { headColor: BRAND.navy, colWidths: [105, 65], pageH },
  );

  const pageCount = pdf.internal.getNumberOfPages();
  for (let page = 2; page <= pageCount; page += 1) {
    pdf.setPage(page);
    pdf.setDrawColor(225, 232, 240);
    pdf.setLineWidth(0.2);
    pdf.line(15, 285, 195, 285);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...BRAND.muted);
    pdf.text(`New FY Forecast Report • ${data.fy.newLabel}`, 15, 290);
    pdf.text(`Page ${page} of ${pageCount}`, 195, 290, { align: 'right' });
  }

  pdf.save(`New-FY-Forecast-${data.fy.newLabel.replace('/', '-')}.pdf`);
}
