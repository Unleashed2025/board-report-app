export const stageProbabilities = {
  Lead: 0.1,
  'To Be Contacted': 0.15,
  Qualified: 0.3,
  Quoting: 0.6,
  Negotiating: 0.8,
  'Closed-Won': 1,
};

export const annualTargetPerRep = 138000;

export const deals = [
  { id: 'OPP-1008', customer: 'Tall Oaks', owner: 'Chris B', stage: 'Closed-Won', predictedMonth: '2026-01', billingStart: '2026-01', dealType: 'Recurring', description: 'Unleashed premium', serviceType: 'Managed Support', revenue: 600, cost: 300, profit: 300 },
  { id: 'OPP-1009', customer: 'TWAM', owner: 'Chris B', stage: 'Closed-Won', predictedMonth: '2026-01', billingStart: '2026-01', dealType: 'Recurring', description: 'Unleashed Premium', serviceType: 'Managed Support', revenue: 1000, cost: 400, profit: 600 },
  { id: 'OPP-1001', customer: 'West Trust', owner: 'Jason B', stage: 'Closed-Won', predictedMonth: '2026-05', billingStart: '2026-06', dealType: 'Non-Recurring', description: 'Heles Tenancy Migration', serviceType: 'Consultancy', revenue: 13500, cost: 0, profit: 13500 },
  { id: 'OPP-1002', customer: 'West Trust', owner: 'Chris B', stage: 'Closed-Won', predictedMonth: '2026-05', billingStart: '2026-07', dealType: 'Non-Recurring', description: 'Cyber Smart software installation', serviceType: 'Engineering', revenue: 21000, cost: 0, profit: 21000 },
  { id: 'OPP-1003', customer: 'West Trust', owner: 'Chris B', stage: 'Closed-Won', predictedMonth: '2026-05', billingStart: '2026-07', dealType: 'Recurring', description: 'Cyber Smart Software', serviceType: 'Licensing', revenue: 3833, cost: 2833, profit: 1000 },
  { id: 'OPP-1004', customer: 'West Trust', owner: 'Jason B', stage: 'Closed-Won', predictedMonth: '2026-05', billingStart: '2026-06', dealType: 'Non-Recurring', description: 'Documentation - Roles and Responsibilities', serviceType: 'Consultancy', revenue: 1000, cost: 0, profit: 1000 },
  { id: 'OPP-1005', customer: 'West Trust', owner: 'Chris B', stage: 'Closed-Won', predictedMonth: '2026-05', billingStart: '2026-08', dealType: 'Non-Recurring', description: 'Cyber Essentials Certifications', serviceType: 'Other', revenue: 16000, cost: 15200, profit: 800 },
  { id: 'OPP-1006', customer: 'West Trust', owner: 'Jason B', stage: 'Closed-Won', predictedMonth: '2026-05', billingStart: '2026-06', dealType: 'Recurring', description: 'Incident response service', serviceType: 'Managed Support', revenue: 300, cost: 0, profit: 300 },
  { id: 'OPP-1007', customer: 'West Trust', owner: 'Jason B', stage: 'Closed-Won', predictedMonth: '2026-05', billingStart: '2026-06', dealType: 'Non-Recurring', description: 'Incident response days', serviceType: 'Managed Support', revenue: 3000, cost: 0, profit: 3000 },
  { id: 'OPP-1041', customer: 'West Trust', owner: 'Chris B', stage: 'Closed-Won', predictedMonth: '2026-06', billingStart: '2026-08', dealType: 'Non-Recurring', description: 'onsite network manager 5 weeks', serviceType: 'Consultancy', revenue: 4750, cost: 1500, profit: 3250 },
  { id: 'OPP-1042', customer: 'West Trust', owner: 'Chris B', stage: 'Closed-Won', predictedMonth: '2026-06', billingStart: '2026-08', dealType: 'Non-Recurring', description: 'st james - full site audit', serviceType: 'Consultancy', revenue: 4800, cost: 0, profit: 4800 },
  { id: 'OPP-1043', customer: 'West Trust', owner: 'Jason B', stage: 'Closed-Won', predictedMonth: '2026-06', billingStart: '2026-08', dealType: 'Non-Recurring', description: 'chaddlewood tenancy readiness & migration', serviceType: 'Consultancy', revenue: 6475, cost: 0, profit: 6475 },
  { id: 'OPP-1044', customer: 'West Trust', owner: 'Chris B', stage: 'Closed-Won', predictedMonth: '2026-06', billingStart: '2026-08', dealType: 'Non-Recurring', description: 'heles 10 hours emergency', serviceType: 'Consultancy', revenue: 475, cost: 0, profit: 475 },
  { id: 'OPP-1048', customer: 'West Trust', owner: 'Chris B', stage: 'Closed-Won', predictedMonth: '2026-08', billingStart: '2026-10', dealType: 'Recurring', description: 'azure sandbox usage', serviceType: 'Other', revenue: 500, cost: 450, profit: 50 },
  { id: 'OPP-1049', customer: 'West Trust', owner: 'Jason B', stage: 'Closed-Won', predictedMonth: '2026-05', billingStart: '2026-07', dealType: 'Non-Recurring', description: 'AI configuration', serviceType: 'Consultancy', revenue: 7500, cost: 0, profit: 7500 },
  { id: 'OPP-1010', customer: 'West Trust', owner: 'Jason B', stage: 'Negotiating', predictedMonth: '2026-10', billingStart: '2026-12', dealType: 'Non-Recurring', description: '4 out of 6 remaining migrations', serviceType: 'Engineering', revenue: 35000, cost: 0, profit: 35000 },
  { id: 'OPP-1014', customer: 'ION', owner: 'Chris B', stage: 'Negotiating', predictedMonth: '2026-06', billingStart: '2026-08', dealType: 'Recurring', description: 'Unleashed Premium', serviceType: 'Managed Support', revenue: 2300, cost: 1150, profit: 1150 },
  { id: 'OPP-1024', customer: 'Self Help', owner: 'Chris B', stage: 'Quoting', predictedMonth: '2026-06', billingStart: '2026-08', dealType: 'Recurring', description: 'Unleashed premium', serviceType: 'Managed Support', revenue: 1600, cost: 900, profit: 700 },
  { id: 'OPP-1026', customer: 'London Rowing Club', owner: 'Jason B', stage: 'Quoting', predictedMonth: '2026-08', billingStart: '2026-10', dealType: 'Recurring', description: 'Unleashed premium', serviceType: 'Managed Support', revenue: 600, cost: 300, profit: 300 },
  { id: 'OPP-1011', customer: 'West Trust', owner: 'Jason B', stage: 'Negotiating', predictedMonth: '2026-09', billingStart: '2026-11', dealType: 'Recurring', description: 'VCTO', serviceType: 'Consultancy', revenue: 3500, cost: 0, profit: 3500 },
  { id: 'OPP-1016', customer: 'Age UK Bristol', owner: 'Alysha', stage: 'Quoting', predictedMonth: '2026-09', billingStart: '2026-11', dealType: 'Recurring', description: 'Unleashed premium', serviceType: 'Managed Support', revenue: 1800, cost: 1000, profit: 800 },
  { id: 'OPP-1018', customer: 'Hamelin Trust', owner: 'Rich W', stage: 'Qualified', predictedMonth: '2026-09', billingStart: '2026-11', dealType: 'Recurring', description: 'Unleashed premium', serviceType: 'Managed Support', revenue: 4000, cost: 2000, profit: 2000 },
  { id: 'OPP-1012', customer: 'West Trust', owner: 'Chris B', stage: 'Negotiating', predictedMonth: '2026-10', billingStart: '2026-12', dealType: 'Recurring', description: 'SOC lite email', serviceType: 'Consultancy', revenue: 1500, cost: 0, profit: 1500 },
  { id: 'OPP-1013', customer: 'West Trust', owner: 'Chris B', stage: 'Negotiating', predictedMonth: '2026-10', billingStart: '2026-12', dealType: 'Recurring', description: 'SOC lite AV', serviceType: 'Consultancy', revenue: 1500, cost: 0, profit: 1500 },
  { id: 'OPP-1019', customer: 'Blueprint for business', owner: 'Alysha', stage: 'Qualified', predictedMonth: '2026-03', billingStart: '2027-03', dealType: 'Recurring', description: 'Unleashed premium', serviceType: 'Managed Support', revenue: 250, cost: 100, profit: 150 },
  { id: 'OPP-1020', customer: 'Exan', owner: 'Chris B', stage: 'Qualified', predictedMonth: '2026-03', billingStart: '2027-03', dealType: 'Recurring', description: 'Unleashed premium', serviceType: 'Managed Support', revenue: 300, cost: 150, profit: 150 },
  { id: 'OPP-1021', customer: 'Museum of the Home', owner: 'Alysha', stage: 'Qualified', predictedMonth: '2026-05', billingStart: '2027-05', dealType: 'Recurring', description: 'Unleashed premium', serviceType: 'Managed Support', revenue: 2750, cost: 1250, profit: 1500 },
  { id: 'OPP-1022', customer: 'Royal Foundation', owner: 'Alysha', stage: 'Qualified', predictedMonth: '2026-11', billingStart: '2027-11', dealType: 'Recurring', description: 'Unleashed premium', serviceType: 'Managed Support', revenue: 6000, cost: 3000, profit: 3000 },
  { id: 'OPP-1025', customer: 'FPM', owner: 'Chris B', stage: 'Qualified', predictedMonth: '2026-10', billingStart: '2026-12', dealType: 'Recurring', description: 'Unleashed premium', serviceType: 'Managed Support', revenue: 2500, cost: 1000, profit: 1500 },
  { id: 'OPP-1017', customer: 'Coulson Partners', owner: 'Chris B', stage: 'Quoting', predictedMonth: '2026-11', billingStart: '2027-01', dealType: 'Recurring', description: 'Unleashed premium', serviceType: 'Managed Support', revenue: 800, cost: 400, profit: 400 },
  { id: 'OPP-1023', customer: 'Society of Authors', owner: 'Alysha', stage: 'Quoting', predictedMonth: '2026-11', billingStart: '2027-01', dealType: 'Recurring', description: 'Unleashed premium', serviceType: 'Managed Support', revenue: 2000, cost: 1000, profit: 1000 },
  { id: 'OPP-1015', customer: 'Modus Rail', owner: 'Chris B', stage: 'Quoting', predictedMonth: '2026-12', billingStart: '2027-02', dealType: 'Recurring', description: 'Unleashed premium', serviceType: 'Managed Support', revenue: 1000, cost: 500, profit: 500 },
  { id: 'OPP-1027', customer: 'FOWA', owner: 'Rich W', stage: 'Lead', predictedMonth: '2027-01', billingStart: '2027-03', dealType: 'Recurring', description: 'Unleashed premium', serviceType: 'Managed Support', revenue: 1500, cost: 750, profit: 750 },
  { id: 'OPP-1028', customer: 'Bromford', owner: 'Rich W', stage: 'Lead', predictedMonth: '2027-01', billingStart: '2027-03', dealType: 'Recurring', description: 'Unleashed premium', serviceType: 'Managed Support', revenue: 500, cost: 250, profit: 250 },
  { id: 'OPP-1029', customer: 'Divers community cic', owner: 'Rich W', stage: 'Lead', predictedMonth: '2027-01', billingStart: '2027-03', dealType: 'Recurring', description: 'Unleashed premium', serviceType: 'Managed Support', revenue: 500, cost: 250, profit: 250 },
  { id: 'OPP-1030', customer: 'merchant navy welfare', owner: 'Rich W', stage: 'Lead', predictedMonth: '2026-12', billingStart: '2027-02', dealType: 'Recurring', description: 'Unleashed premium', serviceType: 'Managed Support', revenue: 500, cost: 250, profit: 250 },
  { id: 'OPP-1031', customer: 'St davids hospice', owner: 'Rich W', stage: 'Lead', predictedMonth: '2027-01', billingStart: '2027-03', dealType: 'Recurring', description: 'Unleashed premium', serviceType: 'Managed Support', revenue: 500, cost: 250, profit: 250 },
  { id: 'OPP-1032', customer: 'The duke edinburgh award', owner: 'Rich W', stage: 'Lead', predictedMonth: '2027-01', billingStart: '2027-03', dealType: 'Recurring', description: 'Unleashed premium', serviceType: 'Managed Support', revenue: 500, cost: 250, profit: 250 },
  { id: 'OPP-1033', customer: 'Changan UK', owner: 'Chris B', stage: 'To Be Contacted', predictedMonth: '2027-01', billingStart: '2027-03', dealType: 'Recurring', description: '365 back-up', serviceType: 'Licensing', revenue: 800, cost: 400, profit: 400 },
  { id: 'OPP-1034', customer: 'IES', owner: 'Alysha', stage: 'To Be Contacted', predictedMonth: '2027-01', billingStart: '2027-03', dealType: 'Recurring', description: 'Unleashed premium', serviceType: 'Managed Support', revenue: 10000, cost: 5000, profit: 5000 },
  { id: 'OPP-1035', customer: 'Midland mencap', owner: 'Rich W', stage: 'Lead', predictedMonth: '2027-01', billingStart: '2027-03', dealType: 'Recurring', description: 'Unleashed premium', serviceType: 'Managed Support', revenue: 500, cost: 250, profit: 250 },
  { id: 'OPP-1036', customer: 'Here East', owner: 'Chris B', stage: 'To Be Contacted', predictedMonth: '2027-01', billingStart: '2027-03', dealType: 'Recurring', description: 'Unleashed premium', serviceType: 'Managed Support', revenue: 2500, cost: 1250, profit: 1250 },
  { id: 'OPP-1037', customer: 'Gloucester Disability fund', owner: 'Chris B', stage: 'To Be Contacted', predictedMonth: '2027-03', billingStart: '2027-05', dealType: 'Recurring', description: 'Unleashed premium', serviceType: 'Managed Support', revenue: 600, cost: 300, profit: 300 },
  { id: 'OPP-1038', customer: 'Young Gloucester', owner: 'Chris B', stage: 'To Be Contacted', predictedMonth: '2027-03', billingStart: '2027-05', dealType: 'Recurring', description: 'Unleashed premium', serviceType: 'Managed Support', revenue: 3000, cost: 1500, profit: 1500 },
  { id: 'OPP-1039', customer: 'Hercules', owner: 'Alysha', stage: 'To Be Contacted', predictedMonth: '2027-01', billingStart: '2027-03', dealType: 'Recurring', description: 'Unleashed premium', serviceType: 'Managed Support', revenue: 7000, cost: 3500, profit: 3500 },
  { id: 'OPP-1040', customer: 'Figo', owner: 'Chris B', stage: 'Qualified', predictedMonth: '2026-05', billingStart: '2027-05', dealType: 'Recurring', description: 'Unleashed premium', serviceType: 'Managed Support', revenue: 5000, cost: 2500, profit: 2500 },
  { id: 'OPP-1045', customer: 'West Trust', owner: 'Jason B', stage: 'Negotiating', predictedMonth: '2026-08', billingStart: '2026-09', dealType: 'Recurring', description: 'RMM', serviceType: 'Licensing', revenue: 2925, cost: 2405, profit: 520 },
  { id: 'OPP-1046', customer: 'West Trust', owner: 'Jason B', stage: 'Negotiating', predictedMonth: '2026-07', billingStart: '2026-09', dealType: 'Non-Recurring', description: 'Callington Tenancy readiness and migration', serviceType: 'Consultancy', revenue: 10000, cost: 0, profit: 10000 },
  { id: 'OPP-1047', customer: 'West Trust', owner: 'Jason B', stage: 'Negotiating', predictedMonth: '2026-07', billingStart: '2026-09', dealType: 'Non-Recurring', description: 'St James Migration', serviceType: 'Consultancy', revenue: 4000, cost: 0, profit: 4000 },
  { id: 'OPP-1050', customer: 'Historical Association', owner: 'Alysha', stage: 'Qualified', predictedMonth: '2027-01', billingStart: '2027-03', dealType: 'Recurring', description: 'Unleashed Premium', serviceType: 'Managed Support', revenue: 1000, cost: 500, profit: 500 },
  { id: 'OPP-1051', customer: 'Leodis Trust', owner: 'Chris B', stage: 'Qualified', predictedMonth: '2026-07', billingStart: '2026-10', dealType: 'Recurring', description: 'Back-up', serviceType: 'Other', revenue: 4000, cost: 2000, profit: 2000 },
  { id: 'OPP-1052', customer: 'Vista Retail', owner: 'Chris B', stage: 'Lead', predictedMonth: '2026-08', billingStart: '2026-10', dealType: 'Recurring', description: 'microsoft', serviceType: 'Licensing', revenue: 5000, cost: 4500, profit: 500 },
  { id: 'OPP-1053', customer: 'Minerva Learning Trust', owner: 'Chris B', stage: 'Quoting', predictedMonth: '2026-07', billingStart: '2026-09', dealType: 'Recurring', description: 'Microsoft', serviceType: 'Licensing', revenue: 3000, cost: 2750, profit: 250 },
  { id: 'OPP-1054', customer: 'blessed school', owner: 'Chris B', stage: 'Quoting', predictedMonth: '2026-07', billingStart: '2026-09', dealType: 'Recurring', description: 'Microsoft', serviceType: 'Licensing', revenue: 600, cost: 500, profit: 100 },
  { id: 'OPP-1055', customer: 'Sahir Charity', owner: 'Chris B', stage: 'Quoting', predictedMonth: '2026-07', billingStart: '2026-09', dealType: 'Recurring', description: 'Unleashed Premium', serviceType: 'Managed Support', revenue: 1000, cost: 500, profit: 500 },
  { id: 'OPP-1056', customer: 'Sahir Charity', owner: 'Chris B', stage: 'Quoting', predictedMonth: '2026-07', billingStart: '2026-09', dealType: 'Non-Recurring', description: 'Install of network kit and teams telephony', serviceType: 'Engineering', revenue: 6500, cost: 0, profit: 6500 },
];

export const reps = [
  { owner: 'Alysha', openDeals: 8, openRecGP: 15450, openNRGP: 0, closedDeals: 0, closedRecGP: 0, closedNRGP: 0, totalClosedGP: 0 },
  { owner: 'Chris B', openDeals: 19, openRecGP: 16700, openNRGP: 6500, closedDeals: 9, closedRecGP: 1950, closedNRGP: 30325, totalClosedGP: 32275 },
  { owner: 'Rich W', openDeals: 8, openRecGP: 4250, openNRGP: 0, closedDeals: 0, closedRecGP: 0, closedNRGP: 0, totalClosedGP: 0 },
  { owner: 'Jason B', openDeals: 6, openRecGP: 4320, openNRGP: 49000, closedDeals: 6, closedRecGP: 300, closedNRGP: 31475, totalClosedGP: 31775 },
];

export const kpis = {
  openPipelineRevenue: 138825,
  openPipelineGP: 96220,
  closedWonRevenue: 84733,
  openOpportunities: 41,
  recurringPipeline: 83325,
  nonRecurringPipeline: 55500,
  managedSupportWhitespace: 169120,
};

export const forecast = [
  { owner: 'Alysha', target: 138000, closedRecGPInYear: 0, closedNRGP: 0, totalClosedGP: 0, openRecGPInYear: 1600, openNRGP: 0, openTotalGP: 1600 },
  { owner: 'Chris B', target: 138000, closedRecGPInYear: 16950, closedNRGP: 30325, totalClosedGP: 47275, openRecGPInYear: 24650, openNRGP: 6500, openTotalGP: 31150 },
  { owner: 'Rich W', target: 138000, closedRecGPInYear: 0, closedNRGP: 0, totalClosedGP: 0, openRecGPInYear: 4000, openNRGP: 0, openTotalGP: 4000 },
  { owner: 'Jason B', target: 138000, closedRecGPInYear: 2100, closedNRGP: 31475, totalClosedGP: 33575, openRecGPInYear: 9460, openNRGP: 49000, openTotalGP: 58460 },
].map((entry) => ({
  ...entry,
  remainingGap: Math.max(entry.target - entry.totalClosedGP - entry.openTotalGP, 0),
  closedPct: (entry.totalClosedGP / entry.target) * 100,
  forecastPct: ((entry.totalClosedGP + entry.openTotalGP) / entry.target) * 100,
}));

const openDeals = deals.filter((deal) => deal.stage !== 'Closed-Won');
const unique = (values) => [...new Set(values)];
const sum = (items, field) => items.reduce((total, item) => total + item[field], 0);

export const stageList = Object.keys(stageProbabilities);
export const ownerList = unique(deals.map((deal) => deal.owner));
export const dealTypes = unique(deals.map((deal) => deal.dealType));

export const pipelineByStage = stageList
  .filter((stage) => stage !== 'Closed-Won')
  .map((stage) => {
    const stageDeals = openDeals.filter((deal) => deal.stage === stage);
    const probability = stageProbabilities[stage];
    return {
      stage,
      probability,
      count: stageDeals.length,
      revenue: sum(stageDeals, 'revenue'),
      profit: sum(stageDeals, 'profit'),
      weightedProfit: stageDeals.reduce((total, deal) => total + deal.profit * probability, 0),
    };
  })
  .filter((entry) => entry.count > 0);

export const pipelineByOwner = ownerList.map((owner) => {
  const ownerDeals = openDeals.filter((deal) => deal.owner === owner);
  return {
    owner,
    count: ownerDeals.length,
    revenue: sum(ownerDeals, 'revenue'),
    profit: sum(ownerDeals, 'profit'),
    weightedProfit: ownerDeals.reduce((total, deal) => total + deal.profit * stageProbabilities[deal.stage], 0),
  };
});

export const pipelineByServiceType = unique(openDeals.map((deal) => deal.serviceType)).map((serviceType) => {
  const serviceDeals = openDeals.filter((deal) => deal.serviceType === serviceType);
  return {
    serviceType,
    count: serviceDeals.length,
    revenue: sum(serviceDeals, 'revenue'),
    profit: sum(serviceDeals, 'profit'),
  };
});

export const monthlyForecast = unique(deals.map((deal) => deal.predictedMonth))
  .sort((left, right) => left.localeCompare(right))
  .map((month) => {
    const monthDeals = deals.filter((deal) => deal.predictedMonth === month);
    const closedDeals = monthDeals.filter((deal) => deal.stage === 'Closed-Won');
    const pipelineDeals = monthDeals.filter((deal) => deal.stage !== 'Closed-Won');
    return {
      month,
      closedRevenue: sum(closedDeals, 'revenue'),
      pipelineRevenue: sum(pipelineDeals, 'revenue'),
      closedProfit: sum(closedDeals, 'profit'),
      pipelineProfit: sum(pipelineDeals, 'profit'),
      weightedPipelineProfit: pipelineDeals.reduce((total, deal) => total + deal.profit * stageProbabilities[deal.stage], 0),
    };
  });
