import { useState } from 'react';
import { Bar, Doughnut } from 'react-chartjs-2';
import Layout from '../components/Layout';
import { useData } from '../data/DataContext.jsx';

const PASS_HASH = '5a4b3c'; // simple check token
const CORRECT_PASS = 'IamAseniorLeader!%!';
const SESSION_KEY = 'overview_auth';

const cardClass = 'rounded-xl border border-[#2A4A6F] bg-[#1A334F] p-6';
const chartColors = ['#0EA5E9', '#059669', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
const currency = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 });
const axisColor = '#5A7A95';
const gridColor = 'rgba(90, 122, 149, 0.18)';

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: { color: '#E2E8F0' },
    },
  },
  scales: {
    x: { ticks: { color: axisColor }, grid: { color: gridColor } },
    y: { ticks: { color: axisColor }, grid: { color: gridColor } },
  },
};

const money = (value) => currency.format(value);

export default function OverviewPage() {
  const [authenticated, setAuthenticated] = useState(() => sessionStorage.getItem(SESSION_KEY) === 'true');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

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

  const { kpis, monthlyForecast, pipelineByOwner, pipelineByServiceType, pipelineByStage } = useData();
  const kpiCards = [
    { label: 'Pipeline Revenue', value: money(kpis.openPipelineRevenue), accent: 'text-[#0EA5E9]' },
    { label: 'Pipeline GP', value: money(kpis.openPipelineGP), accent: 'text-white' },
    { label: 'Closed-Won Revenue', value: money(kpis.closedWonRevenue), accent: 'text-[#059669]' },
    { label: 'Open Opportunities', value: kpis.openOpportunities, accent: 'text-white' },
    { label: 'Recurring Pipeline', value: money(kpis.recurringPipeline), accent: 'text-[#0EA5E9]' },
    { label: 'Non-Recurring Pipeline', value: money(kpis.nonRecurringPipeline), accent: 'text-white' },
    { label: 'Managed Support Whitespace', value: `${money(kpis.managedSupportWhitespace)}/mo`, accent: 'text-[#059669]' },
  ];

  return (
    <Layout>
    <div className="space-y-6 pb-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpiCards.map((card) => (
          <div key={card.label} className={cardClass}>
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#0EA5E9]/10 text-[#0EA5E9]">
              <span className="text-lg font-semibold">£</span>
            </div>
            <p className="text-sm text-[#5A7A95]">{card.label}</p>
            <p className={`mt-2 text-3xl font-bold ${card.accent}`}>{card.value}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[2fr,1fr]">
        <div className={cardClass}>
          <div className="mb-6">
            <h2 className="text-xl font-bold text-white">Revenue by month</h2>
            <p className="text-sm text-[#5A7A95]">Closed-won revenue against live pipeline by predicted close month.</p>
          </div>
          <div className="h-96">
            <Bar
              data={{
                labels: monthlyForecast.map((entry) => entry.month),
                datasets: [
                  {
                    label: 'Closed Revenue',
                    data: monthlyForecast.map((entry) => entry.closedRevenue),
                    backgroundColor: '#059669',
                    borderRadius: 8,
                    stack: 'revenue',
                  },
                  {
                    label: 'Pipeline Revenue',
                    data: monthlyForecast.map((entry) => entry.pipelineRevenue),
                    backgroundColor: '#0EA5E9',
                    borderRadius: 8,
                    stack: 'revenue',
                  },
                ],
              }}
              options={{
                ...chartOptions,
                scales: {
                  x: { stacked: true, ticks: { color: axisColor }, grid: { color: gridColor } },
                  y: { stacked: true, ticks: { color: axisColor }, grid: { color: gridColor } },
                },
              }}
            />
          </div>
        </div>

        <div className={cardClass}>
          <div className="mb-6">
            <h2 className="text-xl font-bold text-white">Pipeline by stage</h2>
            <p className="text-sm text-[#5A7A95]">Open pipeline revenue split by sales stage.</p>
          </div>
          <div className="h-96">
            <Doughnut
              data={{
                labels: pipelineByStage.map((entry) => entry.stage),
                datasets: [
                  {
                    data: pipelineByStage.map((entry) => entry.revenue),
                    backgroundColor: chartColors,
                    borderColor: '#1A334F',
                  },
                ],
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

      <section className="grid gap-6 xl:grid-cols-2">
        <div className={cardClass}>
          <div className="mb-6">
            <h2 className="text-xl font-bold text-white">Revenue by service type</h2>
            <p className="text-sm text-[#5A7A95]">Highlights concentration across managed support, consulting and licensing.</p>
          </div>
          <div className="h-80">
            <Doughnut
              data={{
                labels: pipelineByServiceType.map((entry) => entry.serviceType),
                datasets: [
                  {
                    data: pipelineByServiceType.map((entry) => entry.revenue),
                    backgroundColor: chartColors,
                    borderColor: '#1A334F',
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom', labels: { color: '#E2E8F0' } } },
              }}
            />
          </div>
        </div>

        <div className={cardClass}>
          <div className="mb-6">
            <h2 className="text-xl font-bold text-white">Pipeline by owner</h2>
            <p className="text-sm text-[#5A7A95]">Open pipeline revenue by rep.</p>
          </div>
          <div className="h-80">
            <Bar
              data={{
                labels: pipelineByOwner.map((entry) => entry.owner),
                datasets: [
                  {
                    label: 'Pipeline Revenue',
                    data: pipelineByOwner.map((entry) => entry.revenue),
                    backgroundColor: ['#0EA5E9', '#059669', '#8b5cf6', '#06b6d4'],
                    borderRadius: 8,
                  },
                ],
              }}
              options={chartOptions}
            />
          </div>
        </div>
      </section>
    </div>
    </Layout>
  );
}
