import { useState } from 'react';
import { Bar, Doughnut } from 'react-chartjs-2';
import Layout from '../components/Layout';
import { useData } from '../data/DataContext.jsx';

const cardClass = 'rounded-xl border border-[#2A4A6F] bg-[#1A334F] p-6';
const axisColor = '#5A7A95';
const gridColor = 'rgba(90, 122, 149, 0.18)';
const currency = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 });
const money = (v) => currency.format(v);

export default function PipelinePage() {
  const { deals, reps, ownerList, dataLoaded } = useData();
  const [selectedRep, setSelectedRep] = useState('');

  if (!dataLoaded || !deals || deals.length === 0) {
    return (
      <Layout>
        <div className={cardClass}>
          <p className="text-[#5A7A95]">Upload a <strong className="text-white">Sales Tracker</strong> workbook from the home page to view your pipeline.</p>
        </div>
      </Layout>
    );
  }

  const repList = ownerList || [...new Set(deals.map(d => d.owner).filter(Boolean))].sort();
  const activeRep = selectedRep || repList[0] || '';
  const repDeals = deals.filter(d => d.owner === activeRep);

  const closedWon = repDeals.filter(d => d.stage === 'Closed-Won');
  const negotiating = repDeals.filter(d => d.stage === 'Negotiating');
  const quoting = repDeals.filter(d => d.stage === 'Quoting');
  const earlyStage = repDeals.filter(d => ['Lead', 'To Be Contacted', 'Qualified'].includes(d.stage));

  const recurring = repDeals.filter(d => d.dealType === 'Recurring');
  const nonRecurring = repDeals.filter(d => d.dealType !== 'Recurring');

  const totalClosedGP = closedWon.reduce((s, d) => s + d.profit, 0);
  const totalNegotiatingGP = negotiating.reduce((s, d) => s + d.profit, 0);
  const totalQuotingGP = quoting.reduce((s, d) => s + d.profit, 0);
  const totalPipelineGP = totalClosedGP + totalNegotiatingGP + totalQuotingGP;
  const totalRecurringGP = recurring.filter(d => d.stage !== 'Closed-Lost').reduce((s, d) => s + d.profit, 0);

  const TARGET = 24000;
  const recurringClosedGP = closedWon.filter(d => d.dealType === 'Recurring').reduce((s, d) => s + d.profit, 0);
  const targetPct = ((recurringClosedGP + negotiating.filter(d => d.dealType === 'Recurring').reduce((s, d) => s + d.profit, 0) + quoting.filter(d => d.dealType === 'Recurring').reduce((s, d) => s + d.profit, 0)) / TARGET * 100).toFixed(0);

  const DealSection = ({ title, deals: sectionDeals, color }) => {
    if (sectionDeals.length === 0) return null;
    const totalRev = sectionDeals.reduce((s, d) => s + d.revenue, 0);
    const totalGP = sectionDeals.reduce((s, d) => s + d.profit, 0);
    return (
      <div className="mt-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className={`text-sm font-bold ${color}`}>{title} ({sectionDeals.length})</h3>
          <span className="text-xs text-[#5A7A95]">Rev: {money(totalRev)} • GP: {money(totalGP)}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="text-[#5A7A95] border-b border-[#2A4A6F]">
              <th className="text-left py-1.5">Customer</th>
              <th className="text-left py-1.5">Description</th>
              <th className="text-left py-1.5">Type</th>
              <th className="text-left py-1.5">Service</th>
              <th className="text-right py-1.5">Revenue</th>
              <th className="text-right py-1.5">GP</th>
              <th className="text-right py-1.5">Month</th>
            </tr></thead>
            <tbody>
              {sectionDeals.sort((a, b) => b.revenue - a.revenue).map((d, i) => (
                <tr key={(d.id || d.customer) + i} className="border-b border-[#2A4A6F]/30 text-white">
                  <td className="py-1.5 pr-2 font-medium">{d.customer}</td>
                  <td className="py-1.5 pr-2 text-[#5A7A95] truncate max-w-[180px]">{d.description}</td>
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
      </div>
    );
  };

  return (
    <Layout>
      <div className="space-y-6 pb-6">
        {/* Rep selector */}
        <div className="flex items-center gap-4 flex-wrap">
          <h1 className="text-2xl font-bold text-white">Pipeline Analysis</h1>
          <select
            value={activeRep}
            onChange={(e) => setSelectedRep(e.target.value)}
            className="rounded-lg bg-[#0D2338] border border-[#2A4A6F] text-white px-4 py-2 text-sm focus:border-[#0EA5E9] focus:outline-none"
          >
            {repList.map(rep => <option key={rep} value={rep}>{rep}</option>)}
          </select>
          <p className="text-sm text-[#5A7A95]">{repDeals.length} deals in pipeline</p>
        </div>

        {/* KPIs */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className={cardClass}>
            <p className="text-xs text-[#5A7A95]">Closed-Won GP</p>
            <p className="mt-1 text-2xl font-bold text-[#059669]">{money(totalClosedGP)}</p>
            <p className="text-[10px] text-[#5A7A95] mt-1">{closedWon.length} deals</p>
          </div>
          <div className={cardClass}>
            <p className="text-xs text-[#5A7A95]">Negotiating GP</p>
            <p className="mt-1 text-2xl font-bold text-[#f59e0b]">{money(totalNegotiatingGP)}</p>
            <p className="text-[10px] text-[#5A7A95] mt-1">{negotiating.length} deals</p>
          </div>
          <div className={cardClass}>
            <p className="text-xs text-[#5A7A95]">Quoting GP</p>
            <p className="mt-1 text-2xl font-bold text-[#8b5cf6]">{money(totalQuotingGP)}</p>
            <p className="text-[10px] text-[#5A7A95] mt-1">{quoting.length} deals</p>
          </div>
          <div className={cardClass}>
            <p className="text-xs text-[#5A7A95]">Recurring GP Target</p>
            <p className="mt-1 text-2xl font-bold text-[#0EA5E9]">{targetPct}%</p>
            <p className="text-[10px] text-[#5A7A95] mt-1">of £24k monthly target</p>
          </div>
        </section>

        {/* Charts */}
        <section className="grid gap-6 xl:grid-cols-2">
          <div className={cardClass}>
            <h2 className="text-lg font-bold text-white mb-4">GP by Stage</h2>
            <div className="h-56">
              <Bar
                data={{
                  labels: ['Closed-Won', 'Negotiating', 'Quoting', 'Early Stage'],
                  datasets: [{
                    label: 'Gross Profit',
                    data: [totalClosedGP, totalNegotiatingGP, totalQuotingGP, earlyStage.reduce((s, d) => s + d.profit, 0)],
                    backgroundColor: ['#059669', '#f59e0b', '#8b5cf6', '#5A7A95'],
                    borderRadius: 6,
                  }],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => money(ctx.raw) } } },
                  scales: {
                    x: { ticks: { color: axisColor }, grid: { color: gridColor } },
                    y: { ticks: { color: axisColor, callback: (v) => '£' + (v / 1000).toFixed(0) + 'k' }, grid: { color: gridColor } },
                  },
                }}
              />
            </div>
          </div>
          <div className={cardClass}>
            <h2 className="text-lg font-bold text-white mb-4">Revenue Split</h2>
            <div className="h-56">
              <Doughnut
                data={{
                  labels: ['Recurring', 'Non-Recurring'],
                  datasets: [{
                    data: [recurring.reduce((s, d) => s + d.revenue, 0), nonRecurring.reduce((s, d) => s + d.revenue, 0)],
                    backgroundColor: ['#0EA5E9', '#f59e0b'],
                    borderColor: '#1A334F',
                    borderWidth: 3,
                  }],
                }}
                options={{ responsive: true, maintainAspectRatio: false, cutout: '65%', plugins: { legend: { position: 'bottom', labels: { color: '#E2E8F0' } } } }}
              />
            </div>
          </div>
        </section>

        {/* Period Breakdown */}
        <section className={cardClass}>
          <h2 className="text-lg font-bold text-white mb-4">Forecast by Period — {activeRep}</h2>
          {(() => {
            const now = new Date();
            const currentMonth = now.getMonth();
            const currentYear = now.getFullYear();
            const currentQuarter = Math.floor(currentMonth / 3);
            const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

            const parseMonth = (label) => {
              if (!label) return null;
              const parts = String(label).split(' ');
              const mi = monthNames.indexOf(parts[0]);
              const yr = parseInt(parts[1]);
              if (mi === -1 || isNaN(yr)) return null;
              return { month: mi, year: yr };
            };

            const fyStartYear = currentMonth >= 9 ? currentYear : currentYear - 1;

            const isThisMonth = (p) => p && p.year === currentYear && p.month === currentMonth;
            const isThisQuarter = (p) => p && p.year === currentYear && Math.floor(p.month / 3) === currentQuarter;
            const isThisFY = (p) => {
              if (!p) return false;
              if (p.year === fyStartYear && p.month >= 9) return true;
              if (p.year === fyStartYear + 1 && p.month <= 8) return true;
              return false;
            };
            const isThisCalYear = (p) => p && p.year === currentYear;

            const pipelineDeals = repDeals.filter(d => d.stage !== 'Closed-Lost');
            const periods = [
              { label: 'This Month', subtitle: `${monthNames[currentMonth]} ${currentYear}`, filter: isThisMonth },
              { label: 'This Quarter', subtitle: `Q${currentQuarter + 1} ${currentYear}`, filter: isThisQuarter },
              { label: 'This FY', subtitle: `Oct ${fyStartYear} – Sep ${fyStartYear + 1}`, filter: isThisFY },
              { label: 'Calendar Year', subtitle: `Jan – Dec ${currentYear}`, filter: isThisCalYear },
            ];

            return (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {periods.map(period => {
                  const filtered = pipelineDeals.filter(d => period.filter(parseMonth(d.predictedMonth)));
                  const rev = filtered.reduce((s, d) => s + d.revenue, 0);
                  const gp = filtered.reduce((s, d) => s + d.profit, 0);
                  const recGP = filtered.filter(d => d.dealType === 'Recurring').reduce((s, d) => s + d.profit, 0);
                  return (
                    <div key={period.label} className="rounded-xl border border-[#2A4A6F] bg-[#0D2338] p-4">
                      <h3 className="text-sm font-bold text-white">{period.label}</h3>
                      <p className="text-[10px] text-[#5A7A95] mb-3">{period.subtitle}</p>
                      <p className="text-xl font-bold text-white">{money(gp)} <span className="text-xs font-normal text-[#5A7A95]">GP</span></p>
                      <p className="text-xs text-[#0EA5E9] mt-1">Recurring: {money(recGP)}</p>
                      <p className="text-xs text-[#5A7A95] mt-0.5">{filtered.length} deals • Rev: {money(rev)}</p>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </section>

        {/* Monthly Recurring GP vs Target (cost proxy) */}
        <section className={cardClass}>
          <h2 className="text-lg font-bold text-white mb-1">Monthly Recurring GP vs £24k Target</h2>
          <p className="text-xs text-[#5A7A95] mb-4">Your recurring GP pipeline building toward the monthly cost coverage target</p>
          {(() => {
            const cwRecGP = closedWon.filter(d => d.dealType === 'Recurring').reduce((s, d) => s + d.profit, 0);
            const negRecGP = negotiating.filter(d => d.dealType === 'Recurring').reduce((s, d) => s + d.profit, 0);
            const quotRecGP = quoting.filter(d => d.dealType === 'Recurring').reduce((s, d) => s + d.profit, 0);
            const total = cwRecGP + negRecGP + quotRecGP;
            const pct = (total / TARGET * 100);
            return (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-medium">{activeRep}</span>
                  <span className="text-sm font-bold text-white">{money(total)} <span className="text-[#5A7A95] font-normal text-xs">/ {money(TARGET)}</span></span>
                </div>
                <div className="relative h-8 rounded-full bg-[#0D2338] overflow-hidden">
                  <div className="absolute inset-y-0 left-0 bg-[#059669] rounded-l-full" style={{ width: `${Math.min((cwRecGP / TARGET) * 100, 100)}%` }} />
                  <div className="absolute inset-y-0 bg-[#f59e0b]" style={{ left: `${Math.min((cwRecGP / TARGET) * 100, 100)}%`, width: `${Math.min((negRecGP / TARGET) * 100, 100 - (cwRecGP / TARGET) * 100)}%` }} />
                  <div className="absolute inset-y-0 bg-[#8b5cf6]" style={{ left: `${Math.min(((cwRecGP + negRecGP) / TARGET) * 100, 100)}%`, width: `${Math.min((quotRecGP / TARGET) * 100, 100 - ((cwRecGP + negRecGP) / TARGET) * 100)}%` }} />
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white drop-shadow">{pct.toFixed(0)}%</span>
                </div>
                <div className="flex gap-4 mt-2 text-[10px] text-[#5A7A95]">
                  <span><span className="inline-block w-2 h-2 rounded-full bg-[#059669] mr-1"></span>Closed-Won: {money(cwRecGP)}</span>
                  <span><span className="inline-block w-2 h-2 rounded-full bg-[#f59e0b] mr-1"></span>Negotiating: {money(negRecGP)}</span>
                  <span><span className="inline-block w-2 h-2 rounded-full bg-[#8b5cf6] mr-1"></span>Quoting: {money(quotRecGP)}</span>
                </div>
              </div>
            );
          })()}
        </section>

        {/* Deal lists by stage */}
        <section className={cardClass}>
          <h2 className="text-lg font-bold text-white mb-2">Deal Breakdown — {activeRep}</h2>
          <DealSection title="Closed-Won" deals={closedWon} color="text-[#059669]" />
          <DealSection title="Negotiating" deals={negotiating} color="text-[#f59e0b]" />
          <DealSection title="Quoting" deals={quoting} color="text-[#8b5cf6]" />
          <DealSection title="Early Stage (Lead / Qualified)" deals={earlyStage} color="text-[#5A7A95]" />
        </section>
      </div>
    </Layout>
  );
}
