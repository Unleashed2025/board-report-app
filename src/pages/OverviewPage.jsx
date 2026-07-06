import { useState } from 'react';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import Layout from '../components/Layout';
import { useData } from '../data/DataContext.jsx';

const CORRECT_PASS = 'IamAseniorLeader!%!';
const SESSION_KEY = 'overview_auth';

const cardClass = 'rounded-xl border border-[#2A4A6F] bg-[#1A334F] p-6';
const chartColors = ['#0EA5E9', '#059669', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
const currency = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 });
const axisColor = '#5A7A95';
const gridColor = 'rgba(90, 122, 149, 0.18)';

const money = (value) => currency.format(value);

export default function OverviewPage() {
  const [authenticated, setAuthenticated] = useState(() => sessionStorage.getItem(SESSION_KEY) === 'true');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { boardPlan, kpis, monthlyForecast, pipelineByStage, dataLoaded } = useData();

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === CORRECT_PASS) {
      sessionStorage.setItem(SESSION_KEY, 'true');
      setAuthenticated(true);
      setError('');
    } else {
      setError('Incorrect password');
    }
  };

  if (!authenticated) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="rounded-xl border border-[#2A4A6F] bg-[#1A334F] p-8 w-full max-w-md">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-lg bg-[#0EA5E9]/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-[#0EA5E9]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Senior Leadership Access</h2>
                <p className="text-[#5A7A95] text-xs">This dashboard is restricted to senior leaders only.</p>
              </div>
            </div>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm text-[#5A7A95] mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg bg-[#0D2338] border border-[#2A4A6F] text-white placeholder-[#5A7A95] focus:border-[#0EA5E9] focus:outline-none"
                  placeholder="Enter password"
                  autoFocus
                />
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button
                type="submit"
                className="w-full py-2.5 rounded-lg bg-[#0EA5E9] text-white font-semibold hover:bg-[#0EA5E9]/90 transition-colors"
              >
                Access Dashboard
              </button>
            </form>
          </div>
        </div>
      </Layout>
    );
  }

  // If we have a Board Business Plan loaded, show the board-level view
  if (boardPlan) {
    return <BoardPlanDashboard boardPlan={boardPlan} />;
  }

  // Fallback: original pipeline-focused overview if no board plan uploaded
  return (
    <Layout>
      <div className="space-y-6 pb-6">
        <div className={cardClass}>
          <p className="text-[#5A7A95] text-sm">Upload the <strong className="text-white">Board Business Plan</strong> Excel to see GP vs Costs, EBITDA, and breakeven analysis.</p>
          <p className="text-[#5A7A95] text-xs mt-2">Currently showing pipeline data from the Sales Dashboard.</p>
        </div>
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Pipeline GP', value: money(kpis.openPipelineGP), accent: 'text-[#0EA5E9]' },
            { label: 'Closed-Won Revenue', value: money(kpis.closedWonRevenue), accent: 'text-[#059669]' },
            { label: 'Open Opportunities', value: kpis.openOpportunities, accent: 'text-white' },
            { label: 'Recurring Pipeline', value: money(kpis.recurringPipeline), accent: 'text-[#0EA5E9]' },
          ].map((card) => (
            <div key={card.label} className={cardClass}>
              <p className="text-sm text-[#5A7A95]">{card.label}</p>
              <p className={`mt-2 text-2xl font-bold ${card.accent}`}>{card.value}</p>
            </div>
          ))}
        </section>
      </div>
    </Layout>
  );
}

function BoardPlanDashboard({ boardPlan }) {
  const {
    monthlyData, costBreakdown, gpByServiceType, gpByRep, employeeCosts,
    closedTotalGP, closedRecurringGP, closedNonRecurringGP,
    totalCostTotal, ebitdaTotal, cumulativeEBITDAFinal,
    closedWonDeals, negotiatingDeals, quotingDeals, earlyStageDeals,
    significantDeals, scenarioLabel,
    closedWonCount, negotiatingCount, quotingCount, earlyStageCount,
  } = boardPlan;

  // Find breakeven month (where accumulative recurring GP >= total cost)
  const breakevenMonth = monthlyData.find(m => m.recurringGP > 0 && m.recurringGP >= m.totalCost);

  // GP by deal type for pie
  const recurringDeals = [...closedWonDeals, ...negotiatingDeals].filter(d => d.dealType === 'Recurring');
  const nonRecurringDeals = [...closedWonDeals, ...negotiatingDeals].filter(d => d.dealType === 'Non-Recurring');

  // Current closed-won metrics split by deal type
  const cwRecurring = closedWonDeals.filter(d => d.dealType === 'Recurring');
  const cwNonRecurring = closedWonDeals.filter(d => d.dealType !== 'Recurring');
  const currentMonthlyRecurringRevenue = cwRecurring.reduce((s, d) => s + d.revenue, 0);
  const currentMonthlyRecurringGP = cwRecurring.reduce((s, d) => s + d.profit, 0);
  const currentNonRecurringRevenue = cwNonRecurring.reduce((s, d) => s + d.revenue, 0);
  const currentNonRecurringGP = cwNonRecurring.reduce((s, d) => s + d.profit, 0);

  // Significant deals: recurring revenue >= £1,000/month OR non-recurring revenue >= £7,500
  const sigDeals = [...closedWonDeals, ...negotiatingDeals].filter(d =>
    (d.dealType === 'Recurring' && d.revenue >= 1000) ||
    (d.dealType !== 'Recurring' && d.revenue >= 7500)
  ).sort((a, b) => b.revenue - a.revenue);

  return (
    <Layout>
      <div className="space-y-6 pb-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Board Business Plan</h1>
            <p className="text-sm text-[#5A7A95] mt-1">
              {scenarioLabel || 'Negotiating + Closed-Won deals'} — Forecast to Dec 2026
            </p>
          </div>
          {breakevenMonth ? (
            <div className="rounded-lg bg-[#059669]/10 border border-[#059669]/30 px-4 py-2 text-right">
              <p className="text-xs text-[#059669]">Recurring GP Covers Costs</p>
              <p className="text-lg font-bold text-[#059669]">{breakevenMonth.month}</p>
            </div>
          ) : (
            <div className="rounded-lg bg-[#f59e0b]/10 border border-[#f59e0b]/30 px-4 py-2 text-right">
              <p className="text-xs text-[#f59e0b]">Breakeven</p>
              <p className="text-sm font-bold text-[#f59e0b]">Not yet reached in forecast</p>
            </div>
          )}
        </div>

        {/* KPI Cards */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KPICard label="Monthly Recurring Revenue" value={money(currentMonthlyRecurringRevenue)} accent="text-[#0EA5E9]" icon="↻" subtitle="Closed-Won recurring contracts" />
          <KPICard label="Non-Recurring Revenue" value={money(currentNonRecurringRevenue)} accent="text-[#f59e0b]" icon="→" subtitle="Closed-Won project revenue" />
          <KPICard label="Monthly Recurring GP" value={money(currentMonthlyRecurringGP)} accent="text-[#059669]" icon="↻" subtitle="Closed-Won recurring profit" />
          <KPICard label="Non-Recurring GP" value={money(currentNonRecurringGP)} accent="text-[#8b5cf6]" icon="→" subtitle="Closed-Won project profit" />
        </section>

        {/* Rep Target Tracking — £24k monthly recurring GP */}
        <section className={cardClass}>
          <h2 className="text-lg font-bold text-white mb-1">Sales Rep Target Tracker</h2>
          <p className="text-xs text-[#5A7A95] mb-5">Target: £24,000 monthly recurring GP per rep. Progress from Closed-Won, Negotiating &amp; Quoting deals. Early stage shown separately.</p>
          {(() => {
            const TARGET = 24000;
            const allDeals = [...closedWonDeals, ...negotiatingDeals, ...quotingDeals, ...earlyStageDeals];
            const owners = [...new Set(allDeals.map(d => d.owner).filter(Boolean))].sort();
            const repTargets = owners.map(owner => {
              const recurringFilter = (d) => d.owner === owner && d.dealType === 'Recurring';
              const cwRecGP = closedWonDeals.filter(recurringFilter).reduce((s, d) => s + d.profit, 0);
              const negRecGP = negotiatingDeals.filter(recurringFilter).reduce((s, d) => s + d.profit, 0);
              const quotRecGP = quotingDeals.filter(recurringFilter).reduce((s, d) => s + d.profit, 0);
              const pipelineGP = cwRecGP + negRecGP + quotRecGP;
              const earlyRecGP = earlyStageDeals.filter(recurringFilter).reduce((s, d) => s + d.profit, 0);
              return { owner, cwRecGP, negRecGP, quotRecGP, pipelineGP, earlyRecGP, pct: (pipelineGP / TARGET) * 100 };
            }).filter(r => r.pipelineGP > 0 || r.earlyRecGP > 0);
            return (
              <div className="space-y-5">
                {repTargets.map(r => (
                  <div key={r.owner}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-white font-medium text-sm">{r.owner}</span>
                      <span className="text-sm font-bold text-white">{money(r.pipelineGP)} <span className="text-[#5A7A95] font-normal text-xs">/ {money(TARGET)}</span></span>
                    </div>
                    {/* Progress bar */}
                    <div className="relative h-7 rounded-full bg-[#0D2338] overflow-hidden">
                      <div className="absolute inset-y-0 left-0 bg-[#059669] rounded-l-full" style={{ width: `${Math.min((r.cwRecGP / TARGET) * 100, 100)}%` }} />
                      <div className="absolute inset-y-0 bg-[#f59e0b]" style={{ left: `${Math.min((r.cwRecGP / TARGET) * 100, 100)}%`, width: `${Math.min((r.negRecGP / TARGET) * 100, 100 - (r.cwRecGP / TARGET) * 100)}%` }} />
                      <div className="absolute inset-y-0 bg-[#8b5cf6]" style={{ left: `${Math.min(((r.cwRecGP + r.negRecGP) / TARGET) * 100, 100)}%`, width: `${Math.min((r.quotRecGP / TARGET) * 100, 100 - ((r.cwRecGP + r.negRecGP) / TARGET) * 100)}%` }} />
                      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white drop-shadow">{r.pct.toFixed(0)}%</span>
                    </div>
                    <div className="flex gap-4 mt-1.5 text-[10px] text-[#5A7A95]">
                      <span><span className="inline-block w-2 h-2 rounded-full bg-[#059669] mr-1"></span>Closed-Won: {money(r.cwRecGP)}</span>
                      <span><span className="inline-block w-2 h-2 rounded-full bg-[#f59e0b] mr-1"></span>Negotiating: {money(r.negRecGP)}</span>
                      <span><span className="inline-block w-2 h-2 rounded-full bg-[#8b5cf6] mr-1"></span>Quoting: {money(r.quotRecGP)}</span>
                      {r.earlyRecGP > 0 && <span className="text-[#5A7A95]">| Early Stage (Lead/Qualified): {money(r.earlyRecGP)}</span>}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </section>

        {/* Rep Target Timeline — cumulative recurring GP over time to Dec 2027 */}
        <section className={cardClass}>
          <h2 className="text-lg font-bold text-white mb-1">Target Achievement Timeline</h2>
          <p className="text-xs text-[#5A7A95] mb-4">Cumulative monthly recurring GP per rep (based on deal billing start months). Projected to Dec 2027.</p>
          {(() => {
            const TARGET = 24000;
            // Build month labels from Nov 2025 to Dec 2027
            const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
            const timelineLabels = [];
            // Nov 2025, Dec 2025, then Jan 2026 - Dec 2026, then Jan 2027 - Dec 2027
            timelineLabels.push('Nov 2025', 'Dec 2025');
            for (let m = 0; m < 12; m++) timelineLabels.push(monthNames[m] + ' 2026');
            for (let m = 0; m < 12; m++) timelineLabels.push(monthNames[m] + ' 2027');

            // Get all recurring pipeline deals with predicted months
            const pipelineDeals = [...closedWonDeals, ...negotiatingDeals, ...quotingDeals].filter(d => d.dealType === 'Recurring' && d.predictedMonth);
            const owners = [...new Set(pipelineDeals.map(d => d.owner).filter(Boolean))].sort();

            const colors = ['#0EA5E9', '#059669', '#f59e0b', '#8b5cf6', '#06b6d4', '#ef4444'];
            const datasets = owners.map((owner, oi) => {
              // For each month, calculate cumulative recurring GP (deals that have started billing by that month)
              const ownerDeals = pipelineDeals.filter(d => d.owner === owner);
              const cumulative = timelineLabels.map(label => {
                const labelIdx = timelineLabels.indexOf(label);
                let total = 0;
                ownerDeals.forEach(d => {
                  const dealIdx = timelineLabels.indexOf(d.predictedMonth);
                  if (dealIdx !== -1 && dealIdx <= labelIdx) total += d.profit;
                });
                return total;
              });
              return {
                label: owner,
                data: cumulative,
                borderColor: colors[oi % colors.length],
                backgroundColor: colors[oi % colors.length] + '20',
                fill: false,
                tension: 0.3,
                pointRadius: 2,
                pointBackgroundColor: colors[oi % colors.length],
              };
            });

            // Add target line
            datasets.push({
              label: '£24k Target',
              data: timelineLabels.map(() => TARGET),
              borderColor: '#ef4444',
              borderDash: [8, 4],
              borderWidth: 2,
              pointRadius: 0,
              fill: false,
            });

            // Calculate when each rep hits target
            const hitDates = owners.map(owner => {
              const ds = datasets.find(d => d.label === owner);
              const hitIdx = ds?.data.findIndex(v => v >= TARGET);
              return { owner, hitMonth: hitIdx >= 0 ? timelineLabels[hitIdx] : 'Not in forecast' };
            });

            return (
              <>
                <div className="h-80">
                  <Line
                    data={{ labels: timelineLabels, datasets }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      interaction: { mode: 'index', intersect: false },
                      plugins: {
                        legend: { labels: { color: '#E2E8F0' } },
                        tooltip: { callbacks: { label: (ctx) => ctx.raw != null ? `${ctx.dataset.label}: ${money(ctx.raw)}` : '' } },
                      },
                      scales: {
                        x: { ticks: { color: axisColor, maxRotation: 45, autoSkip: true, maxTicksLimit: 14 }, grid: { color: gridColor } },
                        y: { ticks: { color: axisColor, callback: (v) => '£' + (v / 1000).toFixed(0) + 'k' }, grid: { color: gridColor } },
                      },
                    }}
                  />
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {hitDates.map(h => (
                    <div key={h.owner} className="flex items-center gap-2 rounded-lg bg-[#0D2338] px-3 py-2">
                      <span className="text-sm text-white font-medium">{h.owner}</span>
                      <span className={`text-xs font-bold ${h.hitMonth !== 'Not in forecast' ? 'text-[#059669]' : 'text-[#f59e0b]'}`}>
                        {h.hitMonth !== 'Not in forecast' ? `Hits target: ${h.hitMonth}` : 'Not reached by Dec 2027'}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            );
          })()}
        </section>

        {/* Pipeline Forecast — This Month / This Quarter / Next Quarter */}
        <section className={cardClass}>
          <h2 className="text-lg font-bold text-white mb-1">Pipeline Forecast</h2>
          <p className="text-xs text-[#5A7A95] mb-5">Deals in Negotiating &amp; Quoting stages by expected close period</p>
          {(() => {
            const now = new Date();
            const currentMonth = now.getMonth(); // 0-indexed
            const currentYear = now.getFullYear();
            const currentQuarter = Math.floor(currentMonth / 3);

            // Parse "Mon YYYY" label back to { month, year }
            const parseLabel = (label) => {
              if (!label) return null;
              const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
              const parts = label.split(' ');
              const mi = months.indexOf(parts[0]);
              const yr = parseInt(parts[1]);
              if (mi === -1 || isNaN(yr)) return null;
              return { month: mi, year: yr };
            };

            const getPeriod = (label) => {
              const parsed = parseLabel(label);
              if (!parsed) return 'later';
              const { month, year } = parsed;
              if (year === currentYear && month === currentMonth) return 'thisMonth';
              const dealQ = Math.floor(month / 3);
              if (year === currentYear && dealQ === currentQuarter) return 'thisQuarter';
              const nextQ = currentQuarter + 1;
              if (nextQ <= 3 && year === currentYear && dealQ === nextQ) return 'nextQuarter';
              if (nextQ > 3 && year === currentYear + 1 && dealQ === 0) return 'nextQuarter';
              return 'later';
            };

            const pipelineDeals = [...negotiatingDeals, ...quotingDeals];
            const thisMonth = pipelineDeals.filter(d => getPeriod(d.predictedMonth) === 'thisMonth');
            const thisQuarter = pipelineDeals.filter(d => getPeriod(d.predictedMonth) === 'thisQuarter');
            const nextQuarter = pipelineDeals.filter(d => getPeriod(d.predictedMonth) === 'nextQuarter');

            // FY is Oct-Oct. Current FY starts Oct of previous year if we're before Oct, else Oct of current year
            const fyStartYear = currentMonth >= 9 ? currentYear : currentYear - 1; // Oct = month 9
            const fyStartMonth = 9; // October
            const fyEndYear = fyStartYear + 1;
            const fyEndMonth = 8; // September

            const isInFY = (parsed) => {
              if (!parsed) return false;
              const { month, year } = parsed;
              if (year === fyStartYear && month >= fyStartMonth) return true;
              if (year === fyEndYear && month <= fyEndMonth) return true;
              return false;
            };

            const isInCalendarYear = (parsed) => {
              if (!parsed) return false;
              return parsed.year === currentYear;
            };

            const thisFY = pipelineDeals.filter(d => isInFY(parseLabel(d.predictedMonth)));
            const thisCalYear = pipelineDeals.filter(d => isInCalendarYear(parseLabel(d.predictedMonth)));

            const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
            const qLabel = (q, y) => `Q${q + 1} ${y}`;
            const nextQ = currentQuarter + 1 > 3 ? 0 : currentQuarter + 1;
            const nextQYear = currentQuarter + 1 > 3 ? currentYear + 1 : currentYear;

            const DealRow = ({ d }) => (
              <div className="flex items-center justify-between py-2 border-b border-[#2A4A6F]/40 last:border-0">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-white text-sm font-medium truncate">{d.customer}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${d.stage === 'Negotiating' ? 'bg-[#f59e0b]/20 text-[#f59e0b]' : 'bg-[#8b5cf6]/20 text-[#8b5cf6]'}`}>{d.stage}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${d.dealType === 'Recurring' ? 'bg-[#0EA5E9]/20 text-[#0EA5E9]' : 'bg-[#5A7A95]/20 text-[#5A7A95]'}`}>{d.dealType}</span>
                  </div>
                  <p className="text-xs text-[#5A7A95] truncate mt-0.5">{d.description}</p>
                </div>
                <div className="text-right ml-3 shrink-0">
                  <p className="text-sm font-bold text-white">{money(d.revenue)}</p>
                  <p className="text-[10px] text-[#5A7A95]">{d.owner} • GP: {money(d.profit)}</p>
                </div>
              </div>
            );

            const PeriodSection = ({ title, deals, subtitle }) => (
              <div className="rounded-xl border border-[#2A4A6F] bg-[#0D2338] p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-bold text-white">{title}</h3>
                    {subtitle && <p className="text-[10px] text-[#5A7A95]">{subtitle}</p>}
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-[#5A7A95]">{deals.length} deal{deals.length !== 1 ? 's' : ''}</span>
                    <p className="text-sm font-bold text-white">{money(deals.reduce((s, d) => s + d.revenue, 0))}</p>
                  </div>
                </div>
                {deals.length > 0 ? (
                  <div className="divide-y divide-[#2A4A6F]/40">
                    {deals.sort((a, b) => b.revenue - a.revenue).map((d, i) => <DealRow key={d.id + i} d={d} />)}
                  </div>
                ) : (
                  <p className="text-xs text-[#5A7A95]">No deals expected this period</p>
                )}
              </div>
            );

            return (
              <div className="space-y-4">
                <div className="grid gap-4 xl:grid-cols-3">
                  <PeriodSection title="This Month" subtitle={`${monthNames[currentMonth]} ${currentYear}`} deals={thisMonth} />
                  <PeriodSection title="This Quarter" subtitle={`${qLabel(currentQuarter, currentYear)} (excl. this month)`} deals={thisQuarter} />
                  <PeriodSection title="Next Quarter" subtitle={qLabel(nextQ, nextQYear)} deals={nextQuarter} />
                </div>
                <div className="grid gap-4 xl:grid-cols-2">
                  <PeriodSection title="This Financial Year" subtitle={`Oct ${fyStartYear} – Sep ${fyEndYear}`} deals={thisFY} />
                  <PeriodSection title="This Calendar Year" subtitle={`Jan – Dec ${currentYear}`} deals={thisCalYear} />
                </div>
              </div>
            );
          })()}
        </section>

        {/* GP Split + Recurring GP vs Costs */}
        <section className="grid gap-6 xl:grid-cols-[1fr,2fr]">
          <div className={cardClass}>
            <h2 className="text-lg font-bold text-white mb-1">GP Split</h2>
            <p className="text-xs text-[#5A7A95] mb-4">Recurring vs Non-Recurring gross profit</p>
            <div className="h-56">
              <Doughnut
                data={{
                  labels: ['Recurring GP', 'Non-Recurring GP'],
                  datasets: [{
                    data: [closedRecurringGP, closedNonRecurringGP],
                    backgroundColor: ['#0EA5E9', '#f59e0b'],
                    borderColor: '#1A334F',
                    borderWidth: 3,
                  }],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  cutout: '65%',
                  plugins: { legend: { position: 'bottom', labels: { color: '#E2E8F0', padding: 16 } } },
                }}
              />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-center">
              <div className="rounded-lg bg-[#0D2338] p-3">
                <p className="text-xs text-[#5A7A95]">Closed Won</p>
                <p className="text-lg font-bold text-[#059669]">{closedWonCount} deals</p>
              </div>
              <div className="rounded-lg bg-[#0D2338] p-3">
                <p className="text-xs text-[#5A7A95]">Negotiating</p>
                <p className="text-lg font-bold text-[#f59e0b]">{negotiatingCount} deals</p>
              </div>
            </div>
          </div>

          {/* Monthly Recurring GP vs Costs — with 2027 projection */}
          <div className={cardClass}>
            <h2 className="text-lg font-bold text-white mb-1">Monthly Recurring GP vs Business Costs</h2>
            <p className="text-xs text-[#5A7A95] mb-4">Target: recurring GP line crosses above costs = self-sustaining business. Dashed = projected 2027.</p>
            <div className="h-80">
              <Line
                data={(() => {
                  // Build projected months into 2027 until breakeven or +12 months
                  const lastGP = monthlyData[monthlyData.length - 1]?.recurringGP || 0;
                  const lastCost = monthlyData[monthlyData.length - 1]?.totalCost || 0;
                  // Estimate monthly GP growth from last 6 months
                  const recent = monthlyData.slice(-6).filter(m => m.recurringGP > 0);
                  const avgGrowth = recent.length >= 2
                    ? (recent[recent.length - 1].recurringGP - recent[0].recurringGP) / (recent.length - 1)
                    : 500;
                  const projectedMonths = [];
                  let gp = lastGP;
                  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                  let projMonth = 0; // Jan 2027
                  while (projMonth < 12) {
                    gp += avgGrowth;
                    projectedMonths.push({ month: monthNames[projMonth] + ' 2027', recurringGP: Math.round(gp), totalCost: lastCost });
                    if (gp >= lastCost) break;
                    projMonth++;
                  }
                  const allLabels = [...monthlyData.map(m => m.month), ...projectedMonths.map(m => m.month)];
                  const actualGP = monthlyData.map(m => m.recurringGP);
                  const actualCost = monthlyData.map(m => m.totalCost);
                  const projGP = [...new Array(monthlyData.length).fill(null), ...projectedMonths.map(m => m.recurringGP)];
                  const projCost = [...new Array(monthlyData.length).fill(null), ...projectedMonths.map(m => m.totalCost)];
                  // Connect projection to last actual point
                  projGP[monthlyData.length - 1] = lastGP;
                  projCost[monthlyData.length - 1] = lastCost;
                  return {
                    labels: allLabels,
                    datasets: [
                      {
                        label: 'Recurring GP (Actual)',
                        data: [...actualGP, ...new Array(projectedMonths.length).fill(null)],
                        borderColor: '#0EA5E9',
                        backgroundColor: 'rgba(14, 165, 233, 0.1)',
                        fill: true,
                        tension: 0.3,
                        pointRadius: 4,
                        pointBackgroundColor: '#0EA5E9',
                      },
                      {
                        label: 'Recurring GP (Projected)',
                        data: projGP,
                        borderColor: '#0EA5E9',
                        borderDash: [6, 4],
                        backgroundColor: 'rgba(14, 165, 233, 0.05)',
                        fill: false,
                        tension: 0.3,
                        pointRadius: 3,
                        pointBackgroundColor: '#0EA5E9',
                      },
                      {
                        label: 'Monthly Business Costs',
                        data: [...actualCost, ...new Array(projectedMonths.length).fill(null)],
                        borderColor: '#ef4444',
                        backgroundColor: 'rgba(239, 68, 68, 0.05)',
                        fill: true,
                        tension: 0.3,
                        pointRadius: 4,
                        pointBackgroundColor: '#ef4444',
                      },
                      {
                        label: 'Costs (Projected)',
                        data: projCost,
                        borderColor: '#ef4444',
                        borderDash: [6, 4],
                        fill: false,
                        tension: 0.3,
                        pointRadius: 3,
                        pointBackgroundColor: '#ef4444',
                      },
                    ],
                  };
                })()}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  interaction: { mode: 'index', intersect: false },
                  plugins: {
                    legend: { labels: { color: '#E2E8F0' } },
                    tooltip: { callbacks: { label: (ctx) => ctx.raw != null ? `${ctx.dataset.label}: ${money(ctx.raw)}` : '' } },
                    annotation: undefined,
                  },
                  scales: {
                    x: { ticks: { color: axisColor, maxRotation: 45 }, grid: { color: gridColor } },
                    y: { ticks: { color: axisColor, callback: (v) => '£' + (v/1000).toFixed(0) + 'k' }, grid: { color: gridColor } },
                  },
                }}
              />
            </div>
            {breakevenMonth ? (
              <p className="mt-3 text-sm text-[#059669] font-medium">✓ Breakeven reached: {breakevenMonth.month}</p>
            ) : (
              <p className="mt-3 text-sm text-[#f59e0b] font-medium">⟶ Projected breakeven: {(() => {
                const lastGP = monthlyData[monthlyData.length - 1]?.recurringGP || 0;
                const lastCost = monthlyData[monthlyData.length - 1]?.totalCost || 0;
                const recent = monthlyData.slice(-6).filter(m => m.recurringGP > 0);
                const avgGrowth = recent.length >= 2 ? (recent[recent.length - 1].recurringGP - recent[0].recurringGP) / (recent.length - 1) : 500;
                const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                let gp = lastGP;
                for (let i = 0; i < 24; i++) { gp += avgGrowth; if (gp >= lastCost) return monthNames[i % 12] + ' ' + (2027 + Math.floor(i / 12)); }
                return 'Beyond 2028';
              })()}</p>
            )}
          </div>
        </section>

        {/* Total GP vs Costs bar chart */}
        <section className={cardClass}>
          <h2 className="text-lg font-bold text-white mb-1">Monthly Total GP vs Total Costs</h2>
          <p className="text-xs text-[#5A7A95] mb-4">All GP (recurring + non-recurring) against business costs — shows when big deals land</p>
          <div className="h-80">
            <Bar
              data={{
                labels: monthlyData.map(m => m.month),
                datasets: [
                  {
                    label: 'Recurring GP',
                    data: monthlyData.map(m => m.recurringGP),
                    backgroundColor: '#0EA5E9',
                    borderRadius: 6,
                    stack: 'gp',
                  },
                  {
                    label: 'Non-Recurring GP',
                    data: monthlyData.map(m => m.nonRecurringGP),
                    backgroundColor: '#f59e0b',
                    borderRadius: 6,
                    stack: 'gp',
                  },
                  {
                    label: 'Total Costs',
                    data: monthlyData.map(m => m.totalCost),
                    backgroundColor: 'rgba(239, 68, 68, 0.7)',
                    borderRadius: 6,
                    stack: 'costs',
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                  legend: { labels: { color: '#E2E8F0' } },
                  tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${money(ctx.raw)}` } },
                },
                scales: {
                  x: { stacked: true, ticks: { color: axisColor, maxRotation: 45 }, grid: { color: gridColor } },
                  y: { stacked: true, ticks: { color: axisColor, callback: (v) => '£' + (v/1000).toFixed(0) + 'k' }, grid: { color: gridColor } },
                },
              }}
            />
          </div>
        </section>

        {/* EBITDA Trend */}
        <section className={cardClass}>
          <h2 className="text-lg font-bold text-white mb-1">Cumulative EBITDA (after MDF)</h2>
          <p className="text-xs text-[#5A7A95] mb-4">Running total profit position through the year</p>
          <div className="h-64">
            <Line
              data={{
                labels: monthlyData.map(m => m.month),
                datasets: [{
                  label: 'Cumulative EBITDA',
                  data: monthlyData.map(m => m.cumulativeEBITDA),
                  borderColor: monthlyData[monthlyData.length - 1]?.cumulativeEBITDA >= 0 ? '#059669' : '#f59e0b',
                  backgroundColor: 'rgba(14, 165, 233, 0.05)',
                  fill: true,
                  tension: 0.3,
                  pointRadius: 4,
                }],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { labels: { color: '#E2E8F0' } },
                  tooltip: { callbacks: { label: (ctx) => `EBITDA: ${money(ctx.raw)}` } },
                },
                scales: {
                  x: { ticks: { color: axisColor, maxRotation: 45 }, grid: { color: gridColor } },
                  y: { ticks: { color: axisColor, callback: (v) => '£' + (v/1000).toFixed(0) + 'k' }, grid: { color: gridColor } },
                },
              }}
            />
          </div>
        </section>

        {/* Rep Performance vs Employee Cost */}
        <section className={cardClass}>
          <h2 className="text-lg font-bold text-white mb-1">Deal Breakdown by Rep vs Individual Employee Cost</h2>
          <p className="text-xs text-[#5A7A95] mb-4">Closed-Won + Negotiating + Quoting GP per rep compared to their annual cost to the business</p>
          {(() => {
            // Match reps to employee costs (fuzzy match on first name)
            const allPipelineDeals = [...closedWonDeals, ...negotiatingDeals, ...quotingDeals];
            const owners = [...new Set(allPipelineDeals.map(d => d.owner).filter(Boolean))].sort();
            const repData = owners.map(owner => {
              const ownerDeals = allPipelineDeals.filter(d => d.owner === owner);
              const cwGP = ownerDeals.filter(d => d.stage === 'Closed-Won').reduce((s, d) => s + d.profit, 0);
              const negGP = ownerDeals.filter(d => d.stage === 'Negotiating').reduce((s, d) => s + d.profit, 0);
              const quotGP = ownerDeals.filter(d => d.stage === 'Quoting').reduce((s, d) => s + d.profit, 0);
              const totalGP = cwGP + negGP + quotGP;
              // Find matching employee cost
              const firstName = owner.split(' ')[0].toLowerCase();
              const empCost = (employeeCosts || []).find(e => e.name.toLowerCase().startsWith(firstName));
              return { owner, cwGP, negGP, quotGP, totalGP, dealCount: ownerDeals.length, annualCost: empCost?.trueCost || 0, empName: empCost?.name || '' };
            });
            return (
              <>
                <div className="h-72 mb-6">
                  <Bar
                    data={{
                      labels: repData.map(r => r.owner),
                      datasets: [
                        { label: 'Closed-Won GP', data: repData.map(r => r.cwGP), backgroundColor: '#059669', borderRadius: 4, stack: 'gp' },
                        { label: 'Negotiating GP', data: repData.map(r => r.negGP), backgroundColor: '#f59e0b', borderRadius: 4, stack: 'gp' },
                        { label: 'Quoting GP', data: repData.map(r => r.quotGP), backgroundColor: '#8b5cf6', borderRadius: 4, stack: 'gp' },
                        { label: 'True Cost (Wage+NI+Pension)', data: repData.map(r => r.annualCost), backgroundColor: '#ef4444', borderRadius: 4 },
                      ],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { labels: { color: '#E2E8F0' } },
                        tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${money(ctx.raw)}` } },
                      },
                      scales: {
                        x: { ticks: { color: axisColor }, grid: { color: gridColor } },
                        y: { ticks: { color: axisColor, callback: (v) => '£' + (v / 1000).toFixed(0) + 'k' }, grid: { color: gridColor } },
                      },
                    }}
                  />
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-[#5A7A95] border-b border-[#2A4A6F]">
                        <th className="text-left py-2 pr-4">Rep</th>
                        <th className="text-right py-2 px-2">Closed-Won</th>
                        <th className="text-right py-2 px-2">Negotiating</th>
                        <th className="text-right py-2 px-2">Quoting</th>
                        <th className="text-right py-2 px-2 font-bold">Total GP</th>
                        <th className="text-right py-2 px-2">True Cost</th>
                        <th className="text-right py-2 pl-2">ROI</th>
                      </tr>
                    </thead>
                    <tbody>
                      {repData.map(r => {
                        const roi = r.annualCost > 0 ? ((r.totalGP / r.annualCost) * 100).toFixed(0) : '—';
                        const roiColor = r.annualCost === 0 ? 'text-[#5A7A95]' : (r.totalGP >= r.annualCost ? 'text-[#059669]' : 'text-[#ef4444]');
                        return (
                          <tr key={r.owner} className="border-b border-[#2A4A6F]/50 text-white">
                            <td className="py-2.5 pr-4 font-medium">{r.owner} <span className="text-[#5A7A95] text-xs">({r.dealCount} deals)</span></td>
                            <td className="text-right py-2.5 px-2 text-[#059669]">{money(r.cwGP)}</td>
                            <td className="text-right py-2.5 px-2 text-[#f59e0b]">{money(r.negGP)}</td>
                            <td className="text-right py-2.5 px-2 text-[#8b5cf6]">{money(r.quotGP)}</td>
                            <td className="text-right py-2.5 px-2 font-bold">{money(r.totalGP)}</td>
                            <td className="text-right py-2.5 px-2 text-[#ef4444]">{r.annualCost > 0 ? money(r.annualCost) : '—'}</td>
                            <td className={`text-right py-2.5 pl-2 font-bold ${roiColor}`}>{roi}{roi !== '—' ? '%' : ''}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            );
          })()}
        </section>

        {/* GP by Rep chart + Significant Deals */}
        <section className="grid gap-6 xl:grid-cols-2">
          <div className={cardClass}>
            <h2 className="text-lg font-bold text-white mb-4">GP Contribution by Sales Rep</h2>
            <p className="text-xs text-[#5A7A95] mb-4">Closed-Won + Negotiating deals only</p>
            <div className="h-64">
              <Bar
                data={{
                  labels: gpByRep.map(r => r.owner),
                  datasets: [
                    {
                      label: 'Recurring GP',
                      data: gpByRep.map(r => r.recurringGP),
                      backgroundColor: '#0EA5E9',
                      borderRadius: 6,
                      stack: 'rep',
                    },
                    {
                      label: 'Non-Recurring GP',
                      data: gpByRep.map(r => r.nonRecurringGP),
                      backgroundColor: '#f59e0b',
                      borderRadius: 6,
                      stack: 'rep',
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { labels: { color: '#E2E8F0' } },
                    tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${money(ctx.raw)}` } },
                  },
                  scales: {
                    x: { stacked: true, ticks: { color: axisColor }, grid: { color: gridColor } },
                    y: { stacked: true, ticks: { color: axisColor, callback: (v) => '£' + (v/1000).toFixed(0) + 'k' }, grid: { color: gridColor } },
                  },
                }}
              />
            </div>
            <div className="mt-4 space-y-2">
              {gpByRep.map(r => (
                <div key={r.owner} className="flex items-center justify-between text-sm">
                  <span className="text-[#5A7A95]">{r.owner} ({r.dealCount} deals)</span>
                  <span className="font-semibold text-white">{money(r.totalGP)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className={cardClass}>
            <h2 className="text-lg font-bold text-white mb-4">Significant Deals</h2>
            <p className="text-xs text-[#5A7A95] mb-4">Recurring ≥ £1,000/month revenue • Non-Recurring ≥ £7,500 revenue</p>
            <div className="space-y-3 max-h-[28rem] overflow-y-auto">
              {sigDeals.map((d, i) => (
                <div key={d.id + i} className="flex items-center gap-3 rounded-lg bg-[#0D2338] p-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium text-sm truncate">{d.customer}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${d.stage === 'Closed-Won' ? 'bg-[#059669]/20 text-[#059669]' : 'bg-[#f59e0b]/20 text-[#f59e0b]'}`}>
                        {d.stage}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${d.dealType === 'Recurring' ? 'bg-[#0EA5E9]/20 text-[#0EA5E9]' : 'bg-[#8b5cf6]/20 text-[#8b5cf6]'}`}>
                        {d.dealType}
                      </span>
                    </div>
                    <p className="text-xs text-[#5A7A95] truncate mt-0.5">{d.description} • {d.owner}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-white">{money(d.revenue)}</p>
                    <p className="text-[10px] text-[#5A7A95]">GP: {money(d.profit)} • {d.predictedMonth}</p>
                  </div>
                </div>
              ))}
              {sigDeals.length === 0 && <p className="text-sm text-[#5A7A95]">No deals meet significance thresholds yet.</p>}
            </div>
          </div>
        </section>

        {/* Cost Breakdown + GP by Service Type */}
        <section className="grid gap-6 xl:grid-cols-2">
          <div className={cardClass}>
            <h2 className="text-lg font-bold text-white mb-4">Annual Cost Breakdown</h2>
            <div className="space-y-3">
              {costBreakdown.map(item => (
                <div key={item.name} className="flex items-center justify-between">
                  <span className="text-sm text-[#5A7A95]">{item.name}</span>
                  <span className="text-sm font-semibold text-white">{money(item.value)}</span>
                </div>
              ))}
              <div className="border-t border-[#2A4A6F] pt-3 flex items-center justify-between">
                <span className="text-sm font-semibold text-white">Total Annual Cost</span>
                <span className="text-sm font-bold text-[#ef4444]">{money(totalCostTotal)}</span>
              </div>
            </div>
          </div>

          <div className={cardClass}>
            <h2 className="text-lg font-bold text-white mb-4">Non-Recurring GP by Service Type</h2>
            <div className="h-64">
              <Doughnut
                data={{
                  labels: gpByServiceType.map(s => s.name),
                  datasets: [{
                    data: gpByServiceType.map(s => s.value),
                    backgroundColor: chartColors,
                    borderColor: '#1A334F',
                    borderWidth: 3,
                  }],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { position: 'bottom', labels: { color: '#E2E8F0' } } },
                }}
              />
            </div>
          </div>
        </section>

        {/* Deal Lists */}
        <section className={cardClass}>
          <h2 className="text-lg font-bold text-white mb-1">Deals in Forecast</h2>
          <p className="text-xs text-[#5A7A95] mb-4">Closed-Won and Negotiating deals included in the business plan</p>
          <DealTable deals={closedWonDeals} title="Closed-Won" color="#059669" />
          <DealTable deals={negotiatingDeals} title="Negotiating" color="#f59e0b" className="mt-6" />
        </section>

        <section className={cardClass}>
          <h2 className="text-lg font-bold text-white mb-1">Pipeline — Quoting Stage</h2>
          <p className="text-xs text-[#5A7A95] mb-4">{quotingCount} deals not yet in forecast — potential upside</p>
          <DealTable deals={quotingDeals} title="Quoting" color="#8b5cf6" />
        </section>

        <section className={cardClass}>
          <h2 className="text-lg font-bold text-white mb-1">Early Stage Pipeline</h2>
          <p className="text-xs text-[#5A7A95] mb-4">{earlyStageCount} deals in Lead / To Be Contacted / Qualified — building pipeline for future quarters</p>
          <DealTable deals={earlyStageDeals} title="Early Stage" color="#06b6d4" />
        </section>

        {/* Monthly Detail Table */}
        <section className={cardClass}>
          <h2 className="text-lg font-bold text-white mb-4">Monthly Forecast Detail</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2A4A6F]">
                  <th className="text-left py-2 text-[#5A7A95] font-medium">Month</th>
                  <th className="text-right py-2 text-[#5A7A95] font-medium">Recurring GP</th>
                  <th className="text-right py-2 text-[#5A7A95] font-medium">Non-Recurring GP</th>
                  <th className="text-right py-2 text-[#5A7A95] font-medium">Total GP</th>
                  <th className="text-right py-2 text-[#5A7A95] font-medium">Total Cost</th>
                  <th className="text-right py-2 text-[#5A7A95] font-medium">Net Profit</th>
                  <th className="text-right py-2 text-[#5A7A95] font-medium">Cum. EBITDA</th>
                </tr>
              </thead>
              <tbody>
                {monthlyData.map(m => (
                  <tr key={m.month} className="border-b border-[#2A4A6F]/50 hover:bg-[#0D2338]/50">
                    <td className="py-2 text-white font-medium">{m.month}</td>
                    <td className="py-2 text-right text-[#0EA5E9]">{money(m.recurringGP)}</td>
                    <td className="py-2 text-right text-[#f59e0b]">{money(m.nonRecurringGP)}</td>
                    <td className="py-2 text-right text-white font-semibold">{money(m.totalGP)}</td>
                    <td className="py-2 text-right text-[#ef4444]">{money(m.totalCost)}</td>
                    <td className={`py-2 text-right font-semibold ${m.netProfit >= 0 ? 'text-[#059669]' : 'text-[#ef4444]'}`}>{money(m.netProfit)}</td>
                    <td className={`py-2 text-right ${m.cumulativeEBITDA >= 0 ? 'text-[#059669]' : 'text-[#5A7A95]'}`}>{money(m.cumulativeEBITDA)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </Layout>
  );
}

function DealTable({ deals, title, color, className = '' }) {
  if (!deals || deals.length === 0) return null;
  const totalGP = deals.reduce((s, d) => s + d.profit, 0);

  return (
    <div className={className}>
      <div className="flex items-center gap-2 mb-3">
        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }}></span>
        <span className="text-sm font-semibold text-white">{title}</span>
        <span className="text-xs text-[#5A7A95]">({deals.length} deals • {money(totalGP)} GP)</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2A4A6F]">
              <th className="text-left py-1.5 text-[#5A7A95] font-medium">Customer</th>
              <th className="text-left py-1.5 text-[#5A7A95] font-medium">Description</th>
              <th className="text-left py-1.5 text-[#5A7A95] font-medium">Owner</th>
              <th className="text-left py-1.5 text-[#5A7A95] font-medium">Type</th>
              <th className="text-left py-1.5 text-[#5A7A95] font-medium">Service</th>
              <th className="text-right py-1.5 text-[#5A7A95] font-medium">GP</th>
              <th className="text-left py-1.5 text-[#5A7A95] font-medium">Month</th>
            </tr>
          </thead>
          <tbody>
            {deals.map((d, i) => (
              <tr key={d.id + i} className="border-b border-[#2A4A6F]/30 hover:bg-[#0D2338]/50">
                <td className="py-1.5 text-white">{d.customer}</td>
                <td className="py-1.5 text-[#5A7A95] max-w-[200px] truncate">{d.description}</td>
                <td className="py-1.5 text-[#5A7A95]">{d.owner}</td>
                <td className="py-1.5">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${d.dealType === 'Recurring' ? 'bg-[#0EA5E9]/20 text-[#0EA5E9]' : 'bg-[#f59e0b]/20 text-[#f59e0b]'}`}>
                    {d.dealType}
                  </span>
                </td>
                <td className="py-1.5 text-[#5A7A95] text-xs">{d.serviceType}</td>
                <td className="py-1.5 text-right font-semibold text-white">{money(d.profit)}</td>
                <td className="py-1.5 text-[#5A7A95] text-xs">{d.predictedMonth}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function KPICard({ label, value, accent, icon, subtitle }) {
  return (
    <div className={cardClass}>
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-[#0EA5E9]/10 text-[#0EA5E9]">
        <span className="text-base font-bold">{icon}</span>
      </div>
      <p className="text-xs text-[#5A7A95]">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${accent}`}>{value}</p>
      {subtitle && <p className="text-[10px] text-[#5A7A95] mt-1">{subtitle}</p>}
    </div>
  );
}
