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
    monthlyData, costBreakdown, gpByServiceType, gpByRep,
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
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <KPICard label="Total GP (Forecast)" value={money(closedTotalGP)} accent="text-white" icon="£" />
          <KPICard label="Recurring GP" value={money(closedRecurringGP)} accent="text-[#0EA5E9]" icon="↻" />
          <KPICard label="Non-Recurring GP" value={money(closedNonRecurringGP)} accent="text-[#f59e0b]" icon="→" />
          <KPICard label="Total Business Costs" value={money(totalCostTotal)} accent="text-[#ef4444]" icon="−" />
          <KPICard label="Year-End EBITDA" value={money(cumulativeEBITDAFinal)} accent={cumulativeEBITDAFinal >= 0 ? 'text-[#059669]' : 'text-[#ef4444]'} icon="Σ" />
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

          {/* Monthly Recurring GP vs Costs */}
          <div className={cardClass}>
            <h2 className="text-lg font-bold text-white mb-1">Monthly Recurring GP vs Business Costs</h2>
            <p className="text-xs text-[#5A7A95] mb-4">Target: recurring GP line crosses above costs = self-sustaining business</p>
            <div className="h-80">
              <Line
                data={{
                  labels: monthlyData.map(m => m.month),
                  datasets: [
                    {
                      label: 'Accumulative Recurring GP',
                      data: monthlyData.map(m => m.recurringGP),
                      borderColor: '#0EA5E9',
                      backgroundColor: 'rgba(14, 165, 233, 0.1)',
                      fill: true,
                      tension: 0.3,
                      pointRadius: 4,
                      pointBackgroundColor: '#0EA5E9',
                    },
                    {
                      label: 'Monthly Business Costs',
                      data: monthlyData.map(m => m.totalCost),
                      borderColor: '#ef4444',
                      backgroundColor: 'rgba(239, 68, 68, 0.05)',
                      fill: true,
                      tension: 0.3,
                      borderDash: [6, 3],
                      pointRadius: 4,
                      pointBackgroundColor: '#ef4444',
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
                    x: { ticks: { color: axisColor, maxRotation: 45 }, grid: { color: gridColor } },
                    y: { ticks: { color: axisColor, callback: (v) => '£' + (v/1000).toFixed(0) + 'k' }, grid: { color: gridColor } },
                  },
                }}
              />
            </div>
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

        {/* GP by Rep + Significant Deals */}
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
            <p className="text-xs text-[#5A7A95] mb-4">Top 5 deals by GP value in forecast</p>
            <div className="space-y-3">
              {significantDeals.map((d, i) => (
                <div key={d.id + i} className="flex items-center gap-3 rounded-lg bg-[#0D2338] p-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium text-sm truncate">{d.customer}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${d.stage === 'Closed-Won' ? 'bg-[#059669]/20 text-[#059669]' : 'bg-[#f59e0b]/20 text-[#f59e0b]'}`}>
                        {d.stage}
                      </span>
                    </div>
                    <p className="text-xs text-[#5A7A95] truncate mt-0.5">{d.description} • {d.owner}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-white">{money(d.profit)}</p>
                    <p className="text-[10px] text-[#5A7A95]">{d.predictedMonth}</p>
                  </div>
                </div>
              ))}
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

function KPICard({ label, value, accent, icon }) {
  return (
    <div className={cardClass}>
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-[#0EA5E9]/10 text-[#0EA5E9]">
        <span className="text-base font-bold">{icon}</span>
      </div>
      <p className="text-xs text-[#5A7A95]">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${accent}`}>{value}</p>
    </div>
  );
}
