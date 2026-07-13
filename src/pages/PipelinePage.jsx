import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { useData } from '../data/DataContext.jsx';

const cardClass = 'rounded-xl border border-[#2A4A6F] bg-[#1A334F] p-6';
const axisColor = '#5A7A95';
const gridColor = 'rgba(90, 122, 149, 0.18)';
const currency = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 });
const money = (v) => currency.format(v);
const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function PipelinePage() {
  const { deals, reps, ownerList, dataLoaded } = useData();
  const [selectedRep, setSelectedRep] = useState('');

  if (!dataLoaded || !deals || deals.length === 0) {
    return (
      <div className="min-h-screen bg-[#0D2338] text-white">
        <header className="border-b border-[#1A334F] px-6 py-4 flex items-center gap-4">
          <Link to="/" className="text-[#5A7A95] hover:text-white text-xs font-medium">← Home</Link>
          <h1 className="text-lg font-bold text-white">Pipeline Analysis</h1>
        </header>
        <main className="max-w-7xl mx-auto px-6 py-8">
          <div className={cardClass}>
            <p className="text-[#5A7A95]">Upload a <strong className="text-white">Sales Tracker</strong> workbook from the home page to view your pipeline.</p>
          </div>
        </main>
      </div>
    );
  }

  const repList = ownerList || [...new Set(deals.map(d => d.owner).filter(Boolean))].sort();
  const activeRep = selectedRep || repList[0] || '';
  const repDeals = deals.filter(d => d.owner === activeRep);

  // Stage breakdowns
  const closedWon = repDeals.filter(d => d.stage === 'Closed-Won');
  const closedLost = repDeals.filter(d => d.stage === 'Closed-Lost');
  const negotiating = repDeals.filter(d => d.stage === 'Negotiating');
  const quoting = repDeals.filter(d => d.stage === 'Quoting');
  const earlyStage = repDeals.filter(d => ['Lead', 'To Be Contacted', 'Qualified'].includes(d.stage));
  const activePipeline = repDeals.filter(d => !['Closed-Won', 'Closed-Lost'].includes(d.stage));

  // Revenue & GP totals
  const cwRecurring = closedWon.filter(d => d.dealType === 'Recurring');
  const cwNonRecurring = closedWon.filter(d => d.dealType !== 'Recurring');
  const cwRecurringRev = cwRecurring.reduce((s, d) => s + d.revenue, 0);
  const cwRecurringGP = cwRecurring.reduce((s, d) => s + d.profit, 0);
  const cwNonRecurringRev = cwNonRecurring.reduce((s, d) => s + d.revenue, 0);
  const cwNonRecurringGP = cwNonRecurring.reduce((s, d) => s + d.profit, 0);
  const totalCWGP = cwRecurringGP + cwNonRecurringGP;
  const totalCWRev = cwRecurringRev + cwNonRecurringRev;

  const pipelineRecurringGP = activePipeline.filter(d => d.dealType === 'Recurring').reduce((s, d) => s + d.profit, 0);
  const pipelineNonRecurringGP = activePipeline.filter(d => d.dealType !== 'Recurring').reduce((s, d) => s + d.profit, 0);
  const totalPipelineGP = pipelineRecurringGP + pipelineNonRecurringGP;
  const totalPipelineRev = activePipeline.reduce((s, d) => s + d.revenue, 0);

  // Win rate
  const totalDecided = closedWon.length + closedLost.length;
  const winRate = totalDecided > 0 ? ((closedWon.length / totalDecided) * 100).toFixed(0) : '--';

  // Target progress
  const TARGET = 24000;
  const allRecurringGP = cwRecurringGP + activePipeline.filter(d => d.dealType === 'Recurring').reduce((s, d) => s + d.profit, 0);
  const targetPct = (allRecurringGP / TARGET * 100).toFixed(0);

  // Top deals (by GP, active pipeline)
  const topDeals = [...activePipeline].sort((a, b) => b.profit - a.profit).slice(0, 5);

  // Period breakdown helpers
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const currentQuarter = Math.floor(currentMonth / 3);
  const fyStartYear = currentMonth >= 10 ? currentYear : currentYear - 1;

  const parseMonth = (label) => {
    if (!label) return null;
    const parts = String(label).split(' ');
    const mi = monthNames.indexOf(parts[0]);
    const yr = parseInt(parts[1]);
    if (mi === -1 || isNaN(yr)) return null;
    return { month: mi, year: yr };
  };

  const isThisMonth = (p) => p && p.year === currentYear && p.month === currentMonth;
  const isThisQuarter = (p) => p && p.year === currentYear && Math.floor(p.month / 3) === currentQuarter;
  const nextQ = currentQuarter === 3 ? 0 : currentQuarter + 1;
  const nextQYear = currentQuarter === 3 ? currentYear + 1 : currentYear;
  const isNextQuarter = (p) => p && p.year === nextQYear && Math.floor(p.month / 3) === nextQ;
  const isThisFY = (p) => {
    if (!p) return false;
    if (p.year === fyStartYear && p.month >= 10) return true;
    if (p.year === fyStartYear + 1 && p.month <= 9) return true;
    return false;
  };
  const isThisCalYear = (p) => p && p.year === currentYear;

  const pipelineDeals = repDeals.filter(d => !['Closed-Lost'].includes(d.stage));
  const periods = [
    { label: 'This Month', subtitle: `${monthNames[currentMonth]} ${currentYear}`, filter: isThisMonth },
    { label: 'This Quarter', subtitle: `Q${currentQuarter + 1} ${currentYear}`, filter: isThisQuarter },
    { label: 'Next Quarter', subtitle: `Q${nextQ + 1} ${nextQYear}`, filter: isNextQuarter },
    { label: 'This FY', subtitle: `Nov ${fyStartYear} \u2013 Oct ${fyStartYear + 1}`, filter: isThisFY },
    { label: 'Calendar Year', subtitle: `Jan \u2013 Dec ${currentYear}`, filter: isThisCalYear },
  ];

  // Monthly GP timeline (for line chart)
  const allMonths = [...new Set(repDeals.map(d => d.predictedMonth).filter(Boolean))].sort();
  const timelineMonths = allMonths.slice(-12);
  const timelineData = timelineMonths.map(m => {
    const monthDeals = repDeals.filter(d => d.predictedMonth === m && d.stage !== 'Closed-Lost');
    return {
      label: m,
      recurringGP: monthDeals.filter(d => d.dealType === 'Recurring').reduce((s, d) => s + d.profit, 0),
      nonRecurringGP: monthDeals.filter(d => d.dealType !== 'Recurring').reduce((s, d) => s + d.profit, 0),
    };
  });

  const DealTable = ({ sectionDeals, showStage = false }) => (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead><tr className="text-[#5A7A95] border-b border-[#2A4A6F]">
          <th className="text-left py-1.5">Customer</th>
          <th className="text-left py-1.5">Description</th>
          {showStage && <th className="text-left py-1.5">Stage</th>}
          <th className="text-left py-1.5">Type</th>
          <th className="text-left py-1.5">Service</th>
          <th className="text-right py-1.5">Revenue</th>
          <th className="text-right py-1.5">GP</th>
          <th className="text-right py-1.5">Month</th>
        </tr></thead>
        <tbody>
          {sectionDeals.sort((a, b) => b.profit - a.profit).map((d, i) => (
            <tr key={(d.id || d.customer) + i} className="border-b border-[#2A4A6F]/30 text-white">
              <td className="py-1.5 pr-2 font-medium">{d.customer}</td>
              <td className="py-1.5 pr-2 text-[#5A7A95] truncate max-w-[180px]">{d.description}</td>
              {showStage && <td className="py-1.5 pr-2"><span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${d.stage === 'Negotiating' ? 'bg-[#f59e0b]/20 text-[#f59e0b]' : d.stage === 'Quoting' ? 'bg-[#8b5cf6]/20 text-[#8b5cf6]' : 'bg-[#5A7A95]/20 text-[#5A7A95]'}`}>{d.stage}</span></td>}
              <td className="py-1.5 pr-2"><span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${d.dealType === 'Recurring' ? 'bg-[#0EA5E9]/20 text-[#0EA5E9]' : 'bg-[#f59e0b]/20 text-[#f59e0b]'}`}>{d.dealType}</span></td>
              <td className="py-1.5 pr-2 text-[#5A7A95]">{d.serviceType}</td>
              <td className="py-1.5 text-right">{money(d.revenue)}</td>
              <td className="py-1.5 text-right text-[#059669]">{money(d.profit)}</td>
              <td className="py-1.5 text-right text-[#5A7A95]">{d.predictedMonth}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0D2338] text-white">
      <header className="border-b border-[#1A334F] px-6 py-4 flex items-center gap-4">
        <Link to="/" className="text-[#5A7A95] hover:text-white text-xs font-medium">\u2190 Home</Link>
        <h1 className="text-lg font-bold text-white">Pipeline Analysis</h1>
        <select
          value={activeRep}
          onChange={(e) => setSelectedRep(e.target.value)}
          className="ml-auto rounded-lg bg-[#0D2338] border border-[#2A4A6F] text-white px-4 py-2 text-sm focus:border-[#0EA5E9] focus:outline-none"
        >
          {repList.map(rep => <option key={rep} value={rep}>{rep}</option>)}
        </select>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">

        {/* KPI Row 1: Closed Won */}
        <section>
          <h2 className="text-xs uppercase tracking-wider text-[#5A7A95] mb-3 font-semibold">Closed Won Summary</h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <div className={cardClass}>
              <p className="text-xs text-[#5A7A95]">Monthly Recurring Revenue</p>
              <p className="mt-1 text-2xl font-bold text-[#0EA5E9]">{money(cwRecurringRev)}</p>
              <p className="text-[10px] text-[#5A7A95] mt-1">{cwRecurring.length} recurring deals won</p>
            </div>
            <div className={cardClass}>
              <p className="text-xs text-[#5A7A95]">Monthly Recurring GP</p>
              <p className="mt-1 text-2xl font-bold text-[#059669]">{money(cwRecurringGP)}</p>
              <p className="text-[10px] text-[#5A7A95] mt-1">Gross profit on recurring</p>
            </div>
            <div className={cardClass}>
              <p className="text-xs text-[#5A7A95]">Non-Recurring Revenue</p>
              <p className="mt-1 text-2xl font-bold text-[#f59e0b]">{money(cwNonRecurringRev)}</p>
              <p className="text-[10px] text-[#5A7A95] mt-1">{cwNonRecurring.length} one-off deals won</p>
            </div>
            <div className={cardClass}>
              <p className="text-xs text-[#5A7A95]">Non-Recurring GP</p>
              <p className="mt-1 text-2xl font-bold text-[#059669]">{money(cwNonRecurringGP)}</p>
              <p className="text-[10px] text-[#5A7A95] mt-1">Gross profit on NR</p>
            </div>
            <div className={cardClass}>
              <p className="text-xs text-[#5A7A95]">Win Rate</p>
              <p className="mt-1 text-2xl font-bold text-white">{winRate}%</p>
              <p className="text-[10px] text-[#5A7A95] mt-1">{closedWon.length} won / {totalDecided} decided</p>
            </div>
          </div>
        </section>

        {/* KPI Row 2: Active Pipeline */}
        <section>
          <h2 className="text-xs uppercase tracking-wider text-[#5A7A95] mb-3 font-semibold">Active Pipeline</h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className={cardClass}>
              <p className="text-xs text-[#5A7A95]">Pipeline Revenue</p>
              <p className="mt-1 text-2xl font-bold text-white">{money(totalPipelineRev)}</p>
              <p className="text-[10px] text-[#5A7A95] mt-1">{activePipeline.length} active deals</p>
            </div>
            <div className={cardClass}>
              <p className="text-xs text-[#5A7A95]">Pipeline GP</p>
              <p className="mt-1 text-2xl font-bold text-[#059669]">{money(totalPipelineGP)}</p>
              <p className="text-[10px] text-[#5A7A95] mt-1">Rec: {money(pipelineRecurringGP)} | NR: {money(pipelineNonRecurringGP)}</p>
            </div>
            <div className={cardClass}>
              <p className="text-xs text-[#5A7A95]">Negotiating</p>
              <p className="mt-1 text-2xl font-bold text-[#f59e0b]">{money(negotiating.reduce((s,d) => s + d.profit, 0))}</p>
              <p className="text-[10px] text-[#5A7A95] mt-1">{negotiating.length} deals in negotiation</p>
            </div>
            <div className={cardClass}>
              <p className="text-xs text-[#5A7A95]">Quoting</p>
              <p className="mt-1 text-2xl font-bold text-[#8b5cf6]">{money(quoting.reduce((s,d) => s + d.profit, 0))}</p>
              <p className="text-[10px] text-[#5A7A95] mt-1">{quoting.length} deals being quoted</p>
            </div>
          </div>
        </section>

        {/* Target Progress */}
        <section className={cardClass}>
          <h2 className="text-lg font-bold text-white mb-1">Monthly Recurring GP Target — \u00A324k</h2>
          <p className="text-xs text-[#5A7A95] mb-4">Building recurring GP toward the monthly coverage target</p>
          {(() => {
            const cwRec = cwRecurringGP;
            const negRec = negotiating.filter(d => d.dealType === 'Recurring').reduce((s, d) => s + d.profit, 0);
            const quotRec = quoting.filter(d => d.dealType === 'Recurring').reduce((s, d) => s + d.profit, 0);
            const total = cwRec + negRec + quotRec;
            const pct = (total / TARGET * 100);
            return (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-medium">{activeRep}</span>
                  <span className="text-sm font-bold text-white">{money(total)} <span className="text-[#5A7A95] font-normal text-xs">/ {money(TARGET)}</span></span>
                </div>
                <div className="relative h-8 rounded-full bg-[#0D2338] overflow-hidden">
                  <div className="absolute inset-y-0 left-0 bg-[#059669] rounded-l-full" style={{ width: `${Math.min((cwRec / TARGET) * 100, 100)}%` }} />
                  <div className="absolute inset-y-0 bg-[#f59e0b]" style={{ left: `${Math.min((cwRec / TARGET) * 100, 100)}%`, width: `${Math.min((negRec / TARGET) * 100, 100 - (cwRec / TARGET) * 100)}%` }} />
                  <div className="absolute inset-y-0 bg-[#8b5cf6]" style={{ left: `${Math.min(((cwRec + negRec) / TARGET) * 100, 100)}%`, width: `${Math.min((quotRec / TARGET) * 100, 100 - ((cwRec + negRec) / TARGET) * 100)}%` }} />
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white drop-shadow">{pct.toFixed(0)}%</span>
                </div>
                <div className="flex gap-4 mt-2 text-[10px] text-[#5A7A95]">
                  <span><span className="inline-block w-2 h-2 rounded-full bg-[#059669] mr-1"></span>Closed-Won: {money(cwRec)}</span>
                  <span><span className="inline-block w-2 h-2 rounded-full bg-[#f59e0b] mr-1"></span>Negotiating: {money(negRec)}</span>
                  <span><span className="inline-block w-2 h-2 rounded-full bg-[#8b5cf6] mr-1"></span>Quoting: {money(quotRec)}</span>
                </div>
              </div>
            );
          })()}
        </section>

        {/* Period Forecast */}
        <section className={cardClass}>
          <h2 className="text-lg font-bold text-white mb-4">Forecast by Period</h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {periods.map(period => {
              const filtered = pipelineDeals.filter(d => period.filter(parseMonth(d.predictedMonth)));
              const negDeals = filtered.filter(d => d.stage === 'Negotiating');
              const quotDeals = filtered.filter(d => d.stage === 'Quoting');
              const cwDeals = filtered.filter(d => d.stage === 'Closed-Won');
              const gp = filtered.reduce((s, d) => s + d.profit, 0);
              const rev = filtered.reduce((s, d) => s + d.revenue, 0);
              const recGP = filtered.filter(d => d.dealType === 'Recurring').reduce((s, d) => s + d.profit, 0);
              return (
                <div key={period.label} className="rounded-xl border border-[#2A4A6F] bg-[#0D2338] p-4">
                  <h3 className="text-sm font-bold text-white">{period.label}</h3>
                  <p className="text-[10px] text-[#5A7A95] mb-3">{period.subtitle}</p>
                  <p className="text-xl font-bold text-white">{money(gp)} <span className="text-xs font-normal text-[#5A7A95]">GP</span></p>
                  <p className="text-xs text-[#0EA5E9] mt-1">Recurring GP: {money(recGP)}</p>
                  <p className="text-xs text-[#5A7A95] mt-1">Revenue: {money(rev)}</p>
                  <div className="mt-2 space-y-0.5 text-[10px] text-[#5A7A95]">
                    <p><span className="text-[#059669]">\u25CF</span> Won: {cwDeals.length} ({money(cwDeals.reduce((s,d) => s+d.profit,0))})</p>
                    <p><span className="text-[#f59e0b]">\u25CF</span> Negotiating: {negDeals.length} ({money(negDeals.reduce((s,d) => s+d.profit,0))})</p>
                    <p><span className="text-[#8b5cf6]">\u25CF</span> Quoting: {quotDeals.length} ({money(quotDeals.reduce((s,d) => s+d.profit,0))})</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Charts */}
        <section className="grid gap-6 xl:grid-cols-2">
          {/* GP Timeline */}
          <div className={cardClass}>
            <h2 className="text-lg font-bold text-white mb-4">GP Timeline (Monthly)</h2>
            <div className="h-56">
              <Line
                data={{
                  labels: timelineData.map(d => d.label),
                  datasets: [
                    { label: 'Recurring GP', data: timelineData.map(d => d.recurringGP), borderColor: '#0EA5E9', backgroundColor: 'rgba(14,165,233,0.1)', fill: true, tension: 0.3 },
                    { label: 'Non-Recurring GP', data: timelineData.map(d => d.nonRecurringGP), borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.1)', fill: true, tension: 0.3 },
                  ],
                }}
                options={{
                  responsive: true, maintainAspectRatio: false,
                  plugins: { legend: { position: 'bottom', labels: { color: '#E2E8F0', boxWidth: 12 } }, tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${money(ctx.raw)}` } } },
                  scales: {
                    x: { ticks: { color: axisColor, maxRotation: 45 }, grid: { color: gridColor } },
                    y: { ticks: { color: axisColor, callback: (v) => '\u00A3' + (v / 1000).toFixed(0) + 'k' }, grid: { color: gridColor } },
                  },
                }}
              />
            </div>
          </div>

          {/* Stage Breakdown */}
          <div className={cardClass}>
            <h2 className="text-lg font-bold text-white mb-4">Pipeline by Stage (GP)</h2>
            <div className="h-56">
              <Bar
                data={{
                  labels: ['Closed-Won', 'Negotiating', 'Quoting', 'Early Stage'],
                  datasets: [{
                    label: 'Gross Profit',
                    data: [totalCWGP, negotiating.reduce((s,d) => s+d.profit,0), quoting.reduce((s,d) => s+d.profit,0), earlyStage.reduce((s,d) => s+d.profit,0)],
                    backgroundColor: ['#059669', '#f59e0b', '#8b5cf6', '#5A7A95'],
                    borderRadius: 6,
                  }],
                }}
                options={{
                  responsive: true, maintainAspectRatio: false,
                  plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => money(ctx.raw) } } },
                  scales: {
                    x: { ticks: { color: axisColor }, grid: { color: gridColor } },
                    y: { ticks: { color: axisColor, callback: (v) => '\u00A3' + (v / 1000).toFixed(0) + 'k' }, grid: { color: gridColor } },
                  },
                }}
              />
            </div>
          </div>

          {/* Revenue Split Doughnut */}
          <div className={cardClass}>
            <h2 className="text-lg font-bold text-white mb-4">Revenue Split</h2>
            <div className="h-56">
              <Doughnut
                data={{
                  labels: ['Recurring', 'Non-Recurring'],
                  datasets: [{
                    data: [repDeals.filter(d => d.dealType === 'Recurring' && d.stage !== 'Closed-Lost').reduce((s,d) => s+d.revenue,0), repDeals.filter(d => d.dealType !== 'Recurring' && d.stage !== 'Closed-Lost').reduce((s,d) => s+d.revenue,0)],
                    backgroundColor: ['#0EA5E9', '#f59e0b'],
                    borderColor: '#1A334F', borderWidth: 3,
                  }],
                }}
                options={{ responsive: true, maintainAspectRatio: false, cutout: '65%', plugins: { legend: { position: 'bottom', labels: { color: '#E2E8F0' } } } }}
              />
            </div>
          </div>

          {/* Service Type Breakdown */}
          <div className={cardClass}>
            <h2 className="text-lg font-bold text-white mb-4">GP by Service Type</h2>
            <div className="h-56">
              {(() => {
                const serviceTypes = [...new Set(activePipeline.map(d => d.serviceType).filter(Boolean))].sort();
                const colors = ['#0EA5E9', '#059669', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];
                return (
                  <Doughnut
                    data={{
                      labels: serviceTypes,
                      datasets: [{
                        data: serviceTypes.map(st => activePipeline.filter(d => d.serviceType === st).reduce((s,d) => s+d.profit,0)),
                        backgroundColor: serviceTypes.map((_, i) => colors[i % colors.length]),
                        borderColor: '#1A334F', borderWidth: 3,
                      }],
                    }}
                    options={{ responsive: true, maintainAspectRatio: false, cutout: '55%', plugins: { legend: { position: 'bottom', labels: { color: '#E2E8F0', boxWidth: 10, font: { size: 10 } } }, tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${money(ctx.raw)}` } } } }}
                  />
                );
              })()}
            </div>
          </div>
        </section>

        {/* Top Deals */}
        {topDeals.length > 0 && (
          <section className={cardClass}>
            <h2 className="text-lg font-bold text-white mb-4">Top Pipeline Deals</h2>
            <DealTable sectionDeals={topDeals} showStage />
          </section>
        )}

        {/* Closed Won Deals */}
        {closedWon.length > 0 && (
          <section className={cardClass}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">Closed Won Deals</h2>
              <span className="text-xs text-[#5A7A95]">{closedWon.length} deals \u2022 Revenue: {money(totalCWRev)} \u2022 GP: {money(totalCWGP)}</span>
            </div>
            <DealTable sectionDeals={closedWon} />
          </section>
        )}

        {/* Negotiating */}
        {negotiating.length > 0 && (
          <section className={cardClass}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-[#f59e0b]">Negotiating</h2>
              <span className="text-xs text-[#5A7A95]">{negotiating.length} deals \u2022 GP: {money(negotiating.reduce((s,d) => s+d.profit,0))}</span>
            </div>
            <DealTable sectionDeals={negotiating} />
          </section>
        )}

        {/* Quoting */}
        {quoting.length > 0 && (
          <section className={cardClass}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-[#8b5cf6]">Quoting</h2>
              <span className="text-xs text-[#5A7A95]">{quoting.length} deals \u2022 GP: {money(quoting.reduce((s,d) => s+d.profit,0))}</span>
            </div>
            <DealTable sectionDeals={quoting} />
          </section>
        )}

        {/* Early Stage */}
        {earlyStage.length > 0 && (
          <section className={cardClass}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-[#5A7A95]">Early Stage (Lead / Qualified)</h2>
              <span className="text-xs text-[#5A7A95]">{earlyStage.length} deals</span>
            </div>
            <DealTable sectionDeals={earlyStage} />
          </section>
        )}

      </main>
    </div>
  );
}
