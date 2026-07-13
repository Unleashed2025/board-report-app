import * as XLSX from 'xlsx';
import { annualTargetPerRep, stageProbabilities } from './salesData.js';

const TARGET_YEAR = 2026;
const MANAGED_SUPPORT_WHITESPACE = 169120;
export const stageList = ['Lead', 'To Be Contacted', 'Qualified', 'Quoting', 'Negotiating', 'Closed-Won', 'Closed-Lost'];

// Excel serial date → "Mon YYYY" label
function serialToMonthLabel(serial) {
  if (typeof serial !== 'number' || serial < 40000) return '';
  const d = new Date((serial - 25569) * 86400 * 1000);
  return d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
}

// Parse any date value (serial number, Date object, or text string) → "Mon YYYY"
function parseDateToMonthLabel(val) {
  if (val == null || val === '') return '';
  // Excel serial number
  if (typeof val === 'number' && val > 40000) return serialToMonthLabel(val);
  // Date object (xlsx sometimes returns these)
  if (val instanceof Date && !isNaN(val.getTime())) {
    return val.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
  }
  // Text string - try parsing
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return '';
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
    }
    // Try UK format DD/MM/YYYY
    const parts = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (parts) {
      const ukDate = new Date(Number(parts[3]), Number(parts[2]) - 1, Number(parts[1]));
      if (!isNaN(ukDate.getTime())) {
        return ukDate.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
      }
    }
  }
  return '';
}

/**
 * Detect and parse a Board Business Plan workbook.
 * Returns null if the workbook isn't a business plan format.
 */
export function parseBoardPlan(workbook) {
  // Find the best "figures" sheet - prefer sheets with "figures" in the name
  const figuresSheet = workbook.SheetNames.find(n => /figures/i.test(n) && /new|july|latest/i.test(n))
    || workbook.SheetNames.find(n => /figures/i.test(n))
    || workbook.SheetNames.find(n => /business plan/i.test(n));

  // Find matching tracker sheet
  const trackerSheet = workbook.SheetNames.find(n => /tracker/i.test(n) && /new|july|latest/i.test(n))
    || workbook.SheetNames.find(n => /tracker/i.test(n) && !/rollback/i.test(n));

  if (!figuresSheet) return null;

  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[figuresSheet], { header: 1, raw: true, defval: null });

  // Validate structure: row 0 should mention "Business Plan"
  const firstCell = String(rows[0]?.[0] || '');
  console.log('[parseExcel] Figures sheet:', figuresSheet, '| Tracker sheet:', trackerSheet, '| First cell:', firstCell, '| Sheet names:', workbook.SheetNames.join(', '));
  if (!firstCell.includes('Business Plan') && !firstCell.includes('Clean 2026') && !firstCell.includes('Board') && !firstCell.includes('Unleashed')) {
    console.warn('[parseExcel] First cell does not match expected pattern:', firstCell);
    return null;
  }

  // Row 3 has month headers (Excel serial dates in cols 1-14, col 15 = "Total")
  const monthRow = rows[3] || [];
  const months = [];
  for (let i = 1; i <= 14; i++) {
    const val = monthRow[i];
    if (typeof val === 'number' && val > 40000) {
      months.push({ index: i, serial: val, label: serialToMonthLabel(val) });
    }
  }

  if (months.length === 0) return null;

  const toNum = (v) => (typeof v === 'number' && Number.isFinite(v)) ? v : 0;
  const getRow = (rowIdx) => months.map(m => toNum((rows[rowIdx] || [])[m.index]));
  const getTotal = (rowIdx) => toNum((rows[rowIdx] || [])[months.length + 1]);

  // Parse GP data (rows 5-14)
  const newRecurringGP = getRow(5);
  const accumRecurringGP = getRow(6);
  const consultancyGP = getRow(7);
  const engineeringGP = getRow(8);
  const managedSupportGP = getRow(9);
  const licensingGP = getRow(10);
  const hardwareGP = getRow(11);
  const otherGP = getRow(12);
  const totalNonRecurringGP = getRow(13);
  const totalGP = getRow(14);

  // Parse costs (rows 17-29)
  const wages = getRow(17);
  const ni = getRow(23);
  const pensions = getRow(24);
  const car = getRow(25);
  const phones = getRow(26);
  const insurance = getRow(27);
  const marketing = getRow(28);
  const totalCost = getRow(29);

  // Parse individual employee costs (rows 18-22, between Wages and NI)
  // Then apportion NI, pensions, car proportionally by wage share for true cost
  const totalWagesAnnual = toNum((rows[17] || [])[months.length + 1]);
  const totalNIAnnual = toNum((rows[23] || [])[months.length + 1]);
  const totalPensionsAnnual = toNum((rows[24] || [])[months.length + 1]);

  const employeeCosts = [];
  for (let r = 18; r < 23; r++) {
    const name = String((rows[r] || [])[0] || '').trim();
    if (!name) continue;
    const grossWage = toNum((rows[r] || [])[months.length + 1]);
    if (grossWage > 0) {
      const wageShare = totalWagesAnnual > 0 ? grossWage / totalWagesAnnual : 0;
      const niShare = Math.round(totalNIAnnual * wageShare);
      const pensionShare = Math.round(totalPensionsAnnual * wageShare);
      const trueCost = grossWage + niShare + pensionShare;
      employeeCosts.push({ name, grossWage, niShare, pensionShare, trueCost, monthlyData: getRow(r) });
    }
  }

  // Parse outputs (rows 35-40)
  const grossProfit = getRow(35);
  const netProfit = getRow(37);
  const ebitdaBeforeMDF = getRow(38);
  const ebitdaAfterMDF = getRow(39);
  const cumulativeEBITDA = getRow(40);

  // MDF offset (row 32)
  const mdfOffset = getRow(32);

  // Totals
  const totalGPTotal = getTotal(14);
  const totalCostTotal = getTotal(29);
  const totalRecurringGP = getTotal(6); // accumulative total
  const totalNonRecurringGPTotal = getTotal(13);

  // Compute closed GP split from accumulative recurring vs non-recurring
  // The "Total" column for row 6 is sum of accumulative (in-year value), row 13 is NR total
  const closedRecurringGP = totalRecurringGP;
  const closedNonRecurringGP = totalNonRecurringGPTotal;
  const closedTotalGP = totalGPTotal;

  // Monthly data for charts
  const monthlyData = months.map((m, i) => ({
    month: m.label,
    serial: m.serial,
    recurringGP: accumRecurringGP[i],
    newRecurringGP: newRecurringGP[i],
    nonRecurringGP: totalNonRecurringGP[i],
    totalGP: totalGP[i],
    totalCost: totalCost[i],
    netProfit: netProfit[i],
    ebitda: ebitdaAfterMDF[i],
    cumulativeEBITDA: cumulativeEBITDA[i],
    wages: wages[i],
    ni: ni[i],
    pensions: pensions[i],
    car: car[i],
    phones: phones[i],
    insurance: insurance[i],
    marketing: marketing[i],
    mdf: mdfOffset[i],
    consultancyGP: consultancyGP[i],
    engineeringGP: engineeringGP[i],
    managedSupportGP: managedSupportGP[i],
    licensingGP: licensingGP[i],
    hardwareGP: hardwareGP[i],
    otherGP: otherGP[i],
  }));

  // Cost breakdown totals
  const costBreakdown = [
    { name: 'Wages (gross)', value: getTotal(17) },
    { name: 'National Insurance', value: getTotal(23) },
    { name: 'Pensions', value: getTotal(24) },
    { name: 'Car Allowance', value: getTotal(25) },
    { name: 'Phones', value: getTotal(26) },
    { name: 'Insurance', value: getTotal(27) },
    { name: 'Marketing / SoPro', value: getTotal(28) },
  ].filter(c => c.value > 0);

  // GP breakdown by service type
  const gpByServiceType = [
    { name: 'Consultancy', value: getTotal(7) },
    { name: 'Engineering', value: getTotal(8) },
    { name: 'Managed Support', value: getTotal(9) },
    { name: 'Licensing', value: getTotal(10) },
    { name: 'Hardware', value: getTotal(11) },
    { name: 'Other', value: getTotal(12) },
  ].filter(s => s.value > 0);

  // Parse tracker deals if available
  let deals = [];
  if (trackerSheet) {
    const tRows = XLSX.utils.sheet_to_json(workbook.Sheets[trackerSheet], { header: 1, raw: true, defval: '' });
    const tHeaders = tRows[3] || [];
    const idCol = tHeaders.indexOf('Opportunity ID');
    if (idCol !== -1) {
      for (const row of tRows.slice(4)) {
        const id = String(row[idCol] || '').trim();
        if (!id || (!id.startsWith('OPP-') && id !== 'Totals')) continue;
        if (id === 'Totals') break;
        const predMonth = row[tHeaders.indexOf('Predicted Sales Month')];
        const billStart = row[tHeaders.indexOf('Predicted Billing Start Date')];
        const parsedPredMonth = parseDateToMonthLabel(predMonth);
        const parsedBillStart = parseDateToMonthLabel(billStart);
        const deliveryDaysCol = tHeaders.indexOf('Delivery Days');
        const deliveryDaysVal = deliveryDaysCol !== -1 ? toNum(row[deliveryDaysCol]) : 0;
        deals.push({
          id,
          customer: String(row[tHeaders.indexOf('Customer')] || '').trim(),
          owner: String(row[tHeaders.indexOf('Sales Owner')] || '').trim(),
          stage: String(row[tHeaders.indexOf('Stage')] || '').trim(),
          dealType: String(row[tHeaders.indexOf('Deal Type')] || '').trim(),
          serviceType: String(row[tHeaders.indexOf('Service Type')] || '').trim(),
          description: String(row[tHeaders.indexOf('Description')] || '').trim(),
          revenue: toNum(row[tHeaders.indexOf('Revenue')]),
          cost: toNum(row[tHeaders.indexOf('Cost')]),
          profit: toNum(row[tHeaders.indexOf('Profit')]),
          predictedMonth: parsedPredMonth,
          billingStart: parsedBillStart || parsedPredMonth,
          deliveryDays: deliveryDaysVal, // 0 if column not present yet
        });
      }
    }
  }

  const closedWonDeals = deals.filter(d => d.stage === 'Closed-Won');
  const negotiatingDeals = deals.filter(d => d.stage === 'Negotiating');
  const quotingDeals = deals.filter(d => d.stage === 'Quoting');
  const earlyStageDeals = deals.filter(d => ['Lead', 'To Be Contacted', 'Qualified'].includes(d.stage));
  const boardDeals = [...closedWonDeals, ...negotiatingDeals];

  // GP by rep (from tracker deals in forecast scope: Closed-Won + Negotiating)
  const owners = [...new Set(boardDeals.map(d => d.owner).filter(Boolean))].sort();
  const gpByRep = owners.map(owner => {
    const repDeals = boardDeals.filter(d => d.owner === owner);
    return {
      owner,
      dealCount: repDeals.length,
      totalGP: repDeals.reduce((s, d) => s + d.profit, 0),
      recurringGP: repDeals.filter(d => d.dealType === 'Recurring').reduce((s, d) => s + d.profit, 0),
      nonRecurringGP: repDeals.filter(d => d.dealType === 'Non-Recurring').reduce((s, d) => s + d.profit, 0),
    };
  });

  // Significant deals (top 5 by profit)
  const significantDeals = [...boardDeals].sort((a, b) => b.profit - a.profit).slice(0, 5);

  // Parse new hire costs (rows 96-105, 0-indexed 95-104)
  // These are predicted future hires with salary, monthly cost, and start date
  // NI is calculated at 15% employer rate above £5,000 secondary threshold
  const EMPLOYER_NI_RATE = 0.15;
  const NI_THRESHOLD = 5000; // annual secondary threshold
  const newHireCosts = [];
  for (let r = 95; r < 105; r++) {
    const row = rows[r] || [];
    const name = String(row[0] || '').trim();
    // Skip header rows and empty rows
    if (!name || /new hire/i.test(name) || /cost/i.test(name.toLowerCase()) && name.length < 20) continue;
    
    // Scan row for: annual salary (>15000), monthly cost (1000-10000), start date
    let annualSalary = 0;
    let monthlySalary = 0;
    let startMonth = '';
    
    for (let c = 1; c <= 15; c++) {
      const val = row[c];
      if (val == null) continue;
      // Date detection (serial or text like "Jan-27")
      if (!startMonth) {
        const dateLabel = parseDateToMonthLabel(val);
        if (dateLabel) { startMonth = dateLabel; continue; }
        // Handle short date format like "Jan-27" which parseDateToMonthLabel might miss
        if (typeof val === 'string' && /^[A-Za-z]{3}-\d{2}$/.test(val.trim())) {
          const parts = val.trim().split('-');
          const monthStr = parts[0];
          const yearStr = '20' + parts[1];
          const d = new Date(monthStr + ' 1 ' + yearStr);
          if (!isNaN(d.getTime())) {
            startMonth = d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
            continue;
          }
        }
      }
      // Numeric detection
      if (typeof val === 'number' && val > 0) {
        if (val >= 15000 && !annualSalary) {
          annualSalary = val;
        } else if (val >= 1000 && val < 15000 && !monthlySalary) {
          monthlySalary = val;
        }
      }
    }
    
    // If we found a salary but no monthly, derive it
    if (annualSalary > 0 && !monthlySalary) monthlySalary = annualSalary / 12;
    // If we found monthly but no annual, derive it
    if (monthlySalary > 0 && !annualSalary) annualSalary = monthlySalary * 12;
    
    if (annualSalary > 0 && startMonth) {
      const annualNI = Math.round(EMPLOYER_NI_RATE * Math.max(0, annualSalary - NI_THRESHOLD));
      const monthlyNI = Math.round(annualNI / 12);
      const totalMonthlyCost = Math.round(monthlySalary + monthlyNI);
      newHireCosts.push({
        name,
        annualSalary,
        monthlySalary: Math.round(monthlySalary),
        annualNI,
        monthlyNI,
        totalMonthlyCost,
        startMonth,
      });
    }
  }

  // Extract the scenario name from row 4
  const scenarioLabel = String(rows[4]?.[0] || '').replace(/^SALES FROM\s*/i, '').trim();

  return {
    isBoardPlan: true,
    scenarioLabel,
    figuresSheet,
    trackerSheet,
    monthlyData,
    costBreakdown,
    gpByServiceType,
    gpByRep,
    employeeCosts,
    newHireCosts,
    closedTotalGP,
    closedRecurringGP,
    closedNonRecurringGP,
    totalCostTotal,
    totalGPTotal,
    ebitdaTotal: toNum((rows[39] || [])[months.length + 1]),
    grossProfitTotal: getTotal(35),
    netProfitTotal: getTotal(37),
    cumulativeEBITDAFinal: cumulativeEBITDA[cumulativeEBITDA.length - 1] || 0,
    mdfTotal: getTotal(32),
    deals,
    closedWonDeals,
    negotiatingDeals,
    quotingDeals,
    earlyStageDeals,
    boardDeals,
    significantDeals,
    closedWonCount: closedWonDeals.length,
    negotiatingCount: negotiatingDeals.length,
    quotingCount: quotingDeals.length,
    earlyStageCount: earlyStageDeals.length,
  };
}

const openStages = stageList.filter((stage) => !['Closed-Won', 'Closed-Lost'].includes(stage));
const unique = (values) => [...new Set(values.filter(Boolean))];
const sum = (items, selector) =>
  items.reduce((total, item) => total + (typeof selector === 'function' ? selector(item) : Number(item[selector] || 0)), 0);
const normalizeString = (value) => String(value ?? '').trim();

function normalizeStage(value) {
  const normalized = normalizeString(value);
  return stageList.find((stage) => stage.toLowerCase() === normalized.toLowerCase()) || normalized;
}

function normalizeDealType(value) {
  const normalized = normalizeString(value).toLowerCase();

  if (normalized.includes('non')) {
    return 'Non-Recurring';
  }

  if (normalized.includes('recurring')) {
    return 'Recurring';
  }

  return normalizeString(value);
}

function toNumber(value) {
  const numeric = typeof value === 'number' ? value : Number(String(value ?? '').replace(/,/g, ''));
  return Number.isFinite(numeric) ? numeric : 0;
}

function toYearMonth(value) {
  if (value == null || value === '') {
    return '';
  }

  if (typeof value === 'number') {
    const date = new Date((value - 25569) * 86400 * 1000);
    return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 7);
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 7);
  }

  const normalized = normalizeString(value);
  if (/^\d{4}-\d{2}/.test(normalized)) {
    return normalized.slice(0, 7);
  }

  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 7);
}

function getMonthsRemainingInYear(yearMonth, targetYear = TARGET_YEAR) {
  if (!yearMonth) {
    return 0;
  }

  const [yearValue, monthValue] = yearMonth.split('-');
  const year = Number(yearValue);
  const month = Number(monthValue);

  if (!Number.isFinite(year) || !Number.isFinite(month)) {
    return 0;
  }

  if (year < targetYear) {
    return 12;
  }

  if (year > targetYear) {
    return 0;
  }

  return Math.max(13 - month, 0);
}

function recurringGpInYear(deal) {
  return getMonthsRemainingInYear(deal.billingStart) * deal.profit;
}

function nonRecurringGpInYear(deal) {
  if (!deal.billingStart) {
    return 0;
  }

  const [yearValue] = deal.billingStart.split('-');
  return Number(yearValue) === TARGET_YEAR ? deal.profit : 0;
}

export function buildSalesData(deals) {
  const openDeals = deals.filter((deal) => !['Closed-Won', 'Closed-Lost'].includes(deal.stage));
  const closedWonDeals = deals.filter((deal) => deal.stage === 'Closed-Won');
  const owners = unique(deals.map((deal) => deal.owner)).sort((left, right) => left.localeCompare(right));
  const types = unique(deals.map((deal) => deal.dealType)).sort((left, right) => left.localeCompare(right));
  const serviceTypes = unique(openDeals.map((deal) => deal.serviceType)).sort((left, right) => left.localeCompare(right));
  const months = unique(deals.map((deal) => deal.predictedMonth)).sort((left, right) => left.localeCompare(right));

  const reps = owners.map((owner) => {
    const ownerOpenDeals = openDeals.filter((deal) => deal.owner === owner);
    const ownerClosedDeals = closedWonDeals.filter((deal) => deal.owner === owner);

    const openRecGP = sum(ownerOpenDeals.filter((deal) => deal.dealType === 'Recurring'), 'profit');
    const openNRGP = sum(ownerOpenDeals.filter((deal) => deal.dealType === 'Non-Recurring'), 'profit');
    const closedRecGP = sum(ownerClosedDeals.filter((deal) => deal.dealType === 'Recurring'), 'profit');
    const closedNRGP = sum(ownerClosedDeals.filter((deal) => deal.dealType === 'Non-Recurring'), 'profit');

    return {
      owner,
      openDeals: ownerOpenDeals.length,
      openRecGP,
      openNRGP,
      closedDeals: ownerClosedDeals.length,
      closedRecGP,
      closedNRGP,
      totalClosedGP: closedRecGP + closedNRGP,
    };
  });

  const kpis = {
    openPipelineRevenue: sum(openDeals, 'revenue'),
    openPipelineGP: sum(openDeals, 'profit'),
    closedWonRevenue: sum(closedWonDeals, 'revenue'),
    openOpportunities: openDeals.length,
    recurringPipeline: sum(openDeals.filter((deal) => deal.dealType === 'Recurring'), 'revenue'),
    nonRecurringPipeline: sum(openDeals.filter((deal) => deal.dealType === 'Non-Recurring'), 'revenue'),
    managedSupportWhitespace: MANAGED_SUPPORT_WHITESPACE,
  };

  const forecast = owners.map((owner) => {
    const ownerClosedDeals = closedWonDeals.filter((deal) => deal.owner === owner);
    const ownerOpenDeals = openDeals.filter((deal) => deal.owner === owner);

    const closedRecGPInYear = sum(ownerClosedDeals.filter((deal) => deal.dealType === 'Recurring'), recurringGpInYear);
    const closedNRGP = sum(ownerClosedDeals.filter((deal) => deal.dealType === 'Non-Recurring'), nonRecurringGpInYear);
    const openRecGPInYear = sum(ownerOpenDeals.filter((deal) => deal.dealType === 'Recurring'), recurringGpInYear);
    const openNRGP = sum(ownerOpenDeals.filter((deal) => deal.dealType === 'Non-Recurring'), nonRecurringGpInYear);
    const totalClosedGP = closedRecGPInYear + closedNRGP;
    const openTotalGP = openRecGPInYear + openNRGP;

    return {
      owner,
      target: annualTargetPerRep,
      closedRecGPInYear,
      closedNRGP,
      totalClosedGP,
      openRecGPInYear,
      openNRGP,
      openTotalGP,
      remainingGap: Math.max(annualTargetPerRep - totalClosedGP - openTotalGP, 0),
      closedPct: annualTargetPerRep ? (totalClosedGP / annualTargetPerRep) * 100 : 0,
      forecastPct: annualTargetPerRep ? ((totalClosedGP + openTotalGP) / annualTargetPerRep) * 100 : 0,
    };
  });

  const pipelineByStage = openStages
    .map((stage) => {
      const stageDeals = openDeals.filter((deal) => deal.stage === stage);
      const probability = stageProbabilities[stage] || 0;

      return {
        stage,
        probability,
        count: stageDeals.length,
        revenue: sum(stageDeals, 'revenue'),
        profit: sum(stageDeals, 'profit'),
        weightedProfit: sum(stageDeals, (deal) => deal.profit * probability),
      };
    })
    .filter((entry) => entry.count > 0);

  const pipelineByOwner = owners.map((owner) => {
    const ownerDeals = openDeals.filter((deal) => deal.owner === owner);

    return {
      owner,
      count: ownerDeals.length,
      revenue: sum(ownerDeals, 'revenue'),
      profit: sum(ownerDeals, 'profit'),
      weightedProfit: sum(ownerDeals, (deal) => deal.profit * (stageProbabilities[deal.stage] || 0)),
    };
  });

  const pipelineByServiceType = serviceTypes.map((serviceType) => {
    const serviceDeals = openDeals.filter((deal) => deal.serviceType === serviceType);

    return {
      serviceType,
      count: serviceDeals.length,
      revenue: sum(serviceDeals, 'revenue'),
      profit: sum(serviceDeals, 'profit'),
    };
  });

  const monthlyForecast = months.map((month) => {
    const monthDeals = deals.filter((deal) => deal.predictedMonth === month);
    const monthClosedDeals = monthDeals.filter((deal) => deal.stage === 'Closed-Won');
    const monthPipelineDeals = monthDeals.filter((deal) => !['Closed-Won', 'Closed-Lost'].includes(deal.stage));

    return {
      month,
      closedRevenue: sum(monthClosedDeals, 'revenue'),
      pipelineRevenue: sum(monthPipelineDeals, 'revenue'),
      closedProfit: sum(monthClosedDeals, 'profit'),
      pipelineProfit: sum(monthPipelineDeals, 'profit'),
      weightedPipelineProfit: sum(monthPipelineDeals, (deal) => deal.profit * (stageProbabilities[deal.stage] || 0)),
    };
  });

  return {
    deals,
    reps,
    kpis,
    forecast,
    pipelineByStage,
    pipelineByOwner,
    pipelineByServiceType,
    monthlyForecast,
    stageList,
    ownerList: owners,
    dealTypes: types,
  };
}

export default function parseExcel(workbook) {
  // Try Board Business Plan format first
  const boardPlan = parseBoardPlan(workbook);
  if (boardPlan) {
    // Also build sales data from the tracker if available
    const trackerSheet = boardPlan.trackerSheet;
    let salesData = null;
    if (trackerSheet && workbook.Sheets[trackerSheet]) {
      try {
        salesData = parseTrackerSheet(workbook.Sheets[trackerSheet]);
      } catch (e) { /* ignore - tracker parsing is optional */ }
    }
    return { ...salesData, boardPlan };
  }

  // Also check if Sales Tracker exists in this workbook (original format)
  const sheet = workbook.Sheets['Sales Tracker'] || workbook.Sheets['new june tracker'] || workbook.Sheets['July Tracker'];

  if (!sheet) {
    throw new Error('No recognised sheet found. Upload a Sales Dashboard or Board Business Plan workbook.');
  }

  return { ...parseTrackerSheet(sheet), boardPlan: null };
}

function parseTrackerSheet(sheet) {

  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: '' });
  const headers = rows[3] || [];
  const requiredHeaders = [
    'Opportunity ID',
    'Customer',
    'Sales Owner',
    'Stage',
    'Predicted Sales Month',
    'Predicted Billing Start Date',
    'Deal Type',
    'Description',
    'Service Type',
    'Revenue',
    'Cost',
    'Profit',
  ];

  const headerMap = Object.fromEntries(requiredHeaders.map((header) => [header, headers.indexOf(header)]));
  const missingHeaders = requiredHeaders.filter((header) => headerMap[header] === -1);

  if (missingHeaders.length) {
    throw new Error(`Missing expected columns: ${missingHeaders.join(', ')}`);
  }

  const deals = [];

  for (const row of rows.slice(4)) {
    const opportunityId = normalizeString(row[headerMap['Opportunity ID']]);

    if (!opportunityId || !opportunityId.startsWith('OPP-')) {
      break;
    }

    deals.push({
      id: opportunityId,
      customer: normalizeString(row[headerMap.Customer]),
      owner: normalizeString(row[headerMap['Sales Owner']]),
      stage: normalizeStage(row[headerMap.Stage]),
      predictedMonth: toYearMonth(row[headerMap['Predicted Sales Month']]),
      billingStart: toYearMonth(row[headerMap['Predicted Billing Start Date']]),
      dealType: normalizeDealType(row[headerMap['Deal Type']]),
      description: normalizeString(row[headerMap.Description]),
      serviceType: normalizeString(row[headerMap['Service Type']]),
      revenue: toNumber(row[headerMap.Revenue]),
      cost: toNumber(row[headerMap.Cost]),
      profit: toNumber(row[headerMap.Profit]),
    });
  }

  if (!deals.length) {
    throw new Error('No opportunities were found in the workbook.');
  }

  return buildSalesData(deals);
}
