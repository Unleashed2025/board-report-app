/**
 * Extract data from the Sales Dashboard Excel file into JSON for the web dashboard.
 * Run: node extract-data.js
 */
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const SOURCE = path.join(
  'C:\\Users\\ChrisBurgess\\OneDrive - Unleashed\\Desktop\\Sales forecast',
  'New Salesdashboard - TOUCH IF YOU DARE !!!.xlsx'
);

const wb = XLSX.readFile(SOURCE);

// Helper: convert Excel serial date to ISO string
function excelDateToISO(serial) {
  if (!serial || typeof serial !== 'number') return null;
  const epoch = new Date(1899, 11, 30);
  const d = new Date(epoch.getTime() + serial * 86400000);
  return d.toISOString().slice(0, 10);
}

// --- Sales Tracker ---
const stRows = XLSX.utils.sheet_to_json(wb.Sheets['Sales Tracker'], { header: 1 });
const stHeader = stRows[3];
const deals = [];
for (let i = 4; i < stRows.length; i++) {
  const r = stRows[i];
  if (!r[0] || !r[0].toString().startsWith('OPP-')) continue;
  deals.push({
    id: r[0],
    customer: r[1],
    owner: r[2],
    stage: r[3],
    predictedMonth: excelDateToISO(r[4]),
    billingStart: excelDateToISO(r[5]),
    dealType: r[6],
    description: r[7],
    serviceType: r[8],
    revenue: r[9] || 0,
    cost: r[10] || 0,
    profit: r[11] || 0,
    pipelineRevenue: r[12] || 0,
    pipelineProfit: r[13] || 0,
    closedRevenue: r[14] || 0,
    closedProfit: r[15] || 0
  });
}

// --- Sales Rep Scorecard ---
const scRows = XLSX.utils.sheet_to_json(wb.Sheets['Sales Rep Scorecard'], { header: 1 });
const reps = [];
for (let i = 4; i < scRows.length; i++) {
  const r = scRows[i];
  if (!r[0] || r[0] === 'All Reps') continue;
  reps.push({
    name: r[0],
    openDeals: r[1] || 0,
    openRecRevenue: r[2] || 0,
    openRecGP: r[3] || 0,
    openNRRevenue: r[4] || 0,
    openNRGP: r[5] || 0,
    closedDeals: r[6] || 0,
    closedRecRevenue: r[7] || 0,
    closedRecGP: r[8] || 0,
    closedNRRevenue: r[9] || 0,
    closedNRGP: r[10] || 0,
    totalClosedGP: r[11] || 0,
    monthlyRecTarget: r[12] || 0,
    annualRecTarget: r[13] || 0,
    annualNRTarget: r[14] || 0,
    totalAnnualTarget: r[15] || 0,
    progressVsTarget: r[16] || 0
  });
}

// --- Forecast vs Target ---
const fvtRows = XLSX.utils.sheet_to_json(wb.Sheets['Forecast vs Target'], { header: 1 });
const forecast = [];
for (let i = 4; i < fvtRows.length; i++) {
  const r = fvtRows[i];
  if (!r[0] || r[0] === 'All Reps' || r[0] === '') break;
  forecast.push({
    rep: r[0],
    monthlyRecTarget: r[1] || 0,
    annualRecTarget: r[2] || 0,
    monthlyNRTarget: r[3] || 0,
    annualNRTarget: r[4] || 0,
    totalAnnualTarget: r[5] || 0,
    closedRecGPInYear: r[6] || 0,
    closedNRGP: r[7] || 0,
    totalClosedGP: r[8] || 0,
    openRecGPInYear: r[9] || 0,
    openNRGP: r[10] || 0,
    openTotalGP: r[11] || 0
  });
}

// --- Management Dashboard KPIs ---
const mdRows = XLSX.utils.sheet_to_json(wb.Sheets['Management Dashboard'], { header: 1 });
const kpis = {
  openPipelineRevenue: mdRows[4]?.[0] || 0,
  openPipelineRecRevenue: mdRows[4]?.[1] || 0,
  openPipelineNRRevenue: mdRows[4]?.[2] || 0,
  openPipelineGP: mdRows[4]?.[3] || 0,
  openPipelineRecGP: mdRows[4]?.[4] || 0,
  openPipelineNRGP: mdRows[4]?.[5] || 0,
  openOpportunities: mdRows[4]?.[6] || 0,
  currentMonthRevenue: mdRows[4]?.[7] || 0,
  currentMonthGP: mdRows[4]?.[8] || 0,
  closedWonRevenue: mdRows[4]?.[9] || 0,
  closedWonRecRevenue: mdRows[4]?.[10] || 0,
  closedWonNRRevenue: mdRows[4]?.[11] || 0,
  highPriorityAccounts: mdRows[4]?.[12] || 0,
  managedSupportWhitespace: mdRows[4]?.[13] || 0
};

// --- Weighted Pipeline ---
const wpRows = XLSX.utils.sheet_to_json(wb.Sheets['Weighted Pipeline'], { header: 1 });
const stageProbabilities = {};
for (let i = 4; i <= 10; i++) {
  const r = wpRows[i];
  if (r && r[0]) stageProbabilities[r[0]] = r[1] || 0;
}

// Aggregate data
const stageOrder = ['Lead', 'To Be Contacted', 'Qualified', 'Quoting', 'Negotiating', 'Closed-Won'];
const pipelineByStage = {};
const pipelineByOwner = {};
const pipelineByServiceType = {};

deals.forEach(d => {
  if (d.stage === 'Closed-Lost') return;
  // By stage
  if (!pipelineByStage[d.stage]) pipelineByStage[d.stage] = { count: 0, revenue: 0, profit: 0 };
  pipelineByStage[d.stage].count++;
  pipelineByStage[d.stage].revenue += d.revenue;
  pipelineByStage[d.stage].profit += d.profit;
  // By owner
  if (!pipelineByOwner[d.owner]) pipelineByOwner[d.owner] = { count: 0, revenue: 0, profit: 0 };
  pipelineByOwner[d.owner].count++;
  pipelineByOwner[d.owner].revenue += d.revenue;
  pipelineByOwner[d.owner].profit += d.profit;
  // By service type
  if (!pipelineByServiceType[d.serviceType]) pipelineByServiceType[d.serviceType] = { count: 0, revenue: 0, profit: 0 };
  pipelineByServiceType[d.serviceType].count++;
  pipelineByServiceType[d.serviceType].revenue += d.revenue;
  pipelineByServiceType[d.serviceType].profit += d.profit;
});

// Monthly forecast (group by predicted month)
const monthlyForecast = {};
deals.forEach(d => {
  if (d.stage === 'Closed-Lost' || !d.predictedMonth) return;
  const month = d.predictedMonth.slice(0, 7);
  if (!monthlyForecast[month]) monthlyForecast[month] = { revenue: 0, profit: 0, closed: 0, pipeline: 0 };
  monthlyForecast[month].revenue += d.revenue;
  monthlyForecast[month].profit += d.profit;
  if (d.stage === 'Closed-Won') monthlyForecast[month].closed += d.revenue;
  else monthlyForecast[month].pipeline += d.revenue;
});

const output = {
  extractedAt: new Date().toISOString(),
  kpis,
  deals,
  reps,
  forecast,
  stageProbabilities,
  pipelineByStage,
  pipelineByOwner,
  pipelineByServiceType,
  monthlyForecast,
  stageOrder
};

fs.writeFileSync(path.join(__dirname, 'data', 'sales-data.json'), JSON.stringify(output, null, 2));
console.log(`Extracted ${deals.length} deals, ${reps.length} reps. Written to data/sales-data.json`);
