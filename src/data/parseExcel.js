import * as XLSX from 'xlsx';
import { annualTargetPerRep, stageProbabilities } from './salesData.js';

const TARGET_YEAR = 2026;
const MANAGED_SUPPORT_WHITESPACE = 169120;
export const stageList = ['Lead', 'To Be Contacted', 'Qualified', 'Quoting', 'Negotiating', 'Closed-Won', 'Closed-Lost'];

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
  const sheet = workbook.Sheets['Sales Tracker'];

  if (!sheet) {
    throw new Error('Sheet "Sales Tracker" not found.');
  }

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
