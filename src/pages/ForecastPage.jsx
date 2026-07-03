import { Bar } from 'react-chartjs-2';
import Layout from '../components/Layout';
import { forecast } from '../data/salesData';

const cardClass = 'rounded-xl border border-[#2A4A6F] bg-[#1A334F] p-6';
const currency = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 });
const axisColor = '#5A7A95';
const gridColor = 'rgba(90, 122, 149, 0.18)';

export default function ForecastPage() {
  return (
    <Layout>
    <div className="grid gap-6 pb-6 xl:grid-cols-[1.6fr,1fr]">
      <section className={cardClass}>
        <div className="mb-6">
          <h2 className="text-xl font-bold text-white">Forecast vs target</h2>
          <p className="text-sm text-[#5A7A95]">Closed GP, live pipeline and remaining gap against the annual target per rep.</p>
        </div>
        <div className="h-[28rem]">
          <Bar
            data={{
              labels: forecast.map((entry) => entry.owner),
              datasets: [
                {
                  label: 'Closed GP',
                  data: forecast.map((entry) => entry.totalClosedGP),
                  backgroundColor: '#059669',
                  borderRadius: 8,
                },
                {
                  label: 'Pipeline GP',
                  data: forecast.map((entry) => entry.openTotalGP),
                  backgroundColor: '#0EA5E9',
                  borderRadius: 8,
                },
                {
                  label: 'Remaining Gap',
                  data: forecast.map((entry) => entry.remainingGap),
                  backgroundColor: '#2A4A6F',
                  borderRadius: 8,
                },
              ],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { labels: { color: '#E2E8F0' } } },
              scales: {
                x: { stacked: true, ticks: { color: axisColor }, grid: { color: gridColor } },
                y: { stacked: true, ticks: { color: axisColor }, grid: { color: gridColor } },
              },
            }}
          />
        </div>
      </section>

      <section className={cardClass}>
        <div className="mb-6">
          <h2 className="text-xl font-bold text-white">Forecast detail</h2>
          <p className="text-sm text-[#5A7A95]">Rep-level attainment and forecast coverage.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-[#2A4A6F] text-left text-[#5A7A95]">
                <th className="pb-3 pr-4">Rep</th>
                <th className="pb-3 pr-4">Closed GP</th>
                <th className="pb-3 pr-4">Open GP</th>
                <th className="pb-3 pr-4">Forecast %</th>
                <th className="pb-3">Gap</th>
              </tr>
            </thead>
            <tbody>
              {forecast.map((entry) => (
                <tr key={entry.owner} className="border-b border-[#2A4A6F]/60 text-white">
                  <td className="py-4 pr-4 font-semibold">{entry.owner}</td>
                  <td className="py-4 pr-4">{currency.format(entry.totalClosedGP)}</td>
                  <td className="py-4 pr-4">{currency.format(entry.openTotalGP)}</td>
                  <td className="py-4 pr-4">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span>{entry.forecastPct.toFixed(1)}%</span>
                      <span className="text-[#5A7A95]">Closed {entry.closedPct.toFixed(1)}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[#0D2338]">
                      <div className="h-full rounded-full bg-[#0EA5E9]" style={{ width: `${Math.min(entry.forecastPct, 100)}%` }} />
                    </div>
                  </td>
                  <td className="py-4 font-semibold text-[#059669]">{currency.format(entry.remainingGap)}</td>
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
