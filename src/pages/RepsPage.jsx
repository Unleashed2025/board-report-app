import { Bar } from 'react-chartjs-2';
import Layout from '../components/Layout';
import { useData } from '../data/DataContext.jsx';

const cardClass = 'rounded-xl border border-[#2A4A6F] bg-[#1A334F] p-6';
const axisColor = '#5A7A95';
const gridColor = 'rgba(90, 122, 149, 0.18)';
const currency = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 });
const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { labels: { color: '#E2E8F0' } } },
  scales: {
    x: { stacked: true, ticks: { color: axisColor }, grid: { color: gridColor } },
    y: { stacked: true, ticks: { color: axisColor }, grid: { color: gridColor } },
  },
};

export default function RepsPage() {
  const { reps } = useData();

  return (
    <Layout>
    <div className="space-y-6 pb-6">
      <section className="grid gap-4 xl:grid-cols-4">
        {reps.map((rep) => {
          const progress = Math.min((rep.totalClosedGP / 138000) * 100, 100);
          return (
            <div key={rep.owner} className={cardClass}>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">{rep.owner}</h2>
                  <p className="text-sm text-[#5A7A95]">Closed GP vs annual target</p>
                </div>
                <div className="rounded-xl bg-[#0EA5E9]/10 px-3 py-2 text-sm font-semibold text-[#0EA5E9]">{rep.closedDeals} won</div>
              </div>
              <p className="text-3xl font-bold text-white">{currency.format(rep.totalClosedGP)}</p>
              <p className="mt-1 text-sm text-[#5A7A95]">Target £138,000</p>
              <div className="mt-4 h-3 overflow-hidden rounded-full bg-[#0D2338]">
                <div className="h-full rounded-full bg-[#0EA5E9]" style={{ width: `${progress}%` }} />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-[#5A7A95]">Open GP</p>
                  <p className="font-semibold text-white">{currency.format(rep.openRecGP + rep.openNRGP)}</p>
                </div>
                <div>
                  <p className="text-[#5A7A95]">Open deals</p>
                  <p className="font-semibold text-white">{rep.openDeals}</p>
                </div>
              </div>
            </div>
          );
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className={cardClass}>
          <div className="mb-6">
            <h2 className="text-xl font-bold text-white">Closed GP by rep</h2>
            <p className="text-sm text-[#5A7A95]">Recurring and non-recurring gross profit won to date.</p>
          </div>
          <div className="h-96">
            <Bar
              data={{
                labels: reps.map((rep) => rep.owner),
                datasets: [
                  {
                    label: 'Recurring GP',
                    data: reps.map((rep) => rep.closedRecGP),
                    backgroundColor: '#0EA5E9',
                    borderRadius: 8,
                  },
                  {
                    label: 'Non-Recurring GP',
                    data: reps.map((rep) => rep.closedNRGP),
                    backgroundColor: '#059669',
                    borderRadius: 8,
                  },
                ],
              }}
              options={chartOptions}
            />
          </div>
        </div>

        <div className={cardClass}>
          <div className="mb-6">
            <h2 className="text-xl font-bold text-white">Open pipeline GP by rep</h2>
            <p className="text-sm text-[#5A7A95]">Current gross profit pipeline split by recurring and project work.</p>
          </div>
          <div className="h-96">
            <Bar
              data={{
                labels: reps.map((rep) => rep.owner),
                datasets: [
                  {
                    label: 'Open Recurring GP',
                    data: reps.map((rep) => rep.openRecGP),
                    backgroundColor: '#8b5cf6',
                    borderRadius: 8,
                  },
                  {
                    label: 'Open Non-Recurring GP',
                    data: reps.map((rep) => rep.openNRGP),
                    backgroundColor: '#06b6d4',
                    borderRadius: 8,
                  },
                ],
              }}
              options={chartOptions}
            />
          </div>
        </div>
      </section>

      <section className={cardClass}>
        <div className="mb-6">
          <h2 className="text-xl font-bold text-white">Rep scorecard</h2>
          <p className="text-sm text-[#5A7A95]">Snapshot of pipeline and won GP performance for each sales rep.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-[#2A4A6F] text-left text-[#5A7A95]">
                <th className="pb-3 pr-4">Rep</th>
                <th className="pb-3 pr-4">Open Deals</th>
                <th className="pb-3 pr-4">Open Rec GP</th>
                <th className="pb-3 pr-4">Open NR GP</th>
                <th className="pb-3 pr-4">Closed Deals</th>
                <th className="pb-3 pr-4">Closed Rec GP</th>
                <th className="pb-3 pr-4">Closed NR GP</th>
                <th className="pb-3">Total Closed GP</th>
              </tr>
            </thead>
            <tbody>
              {reps.map((rep) => (
                <tr key={rep.owner} className="border-b border-[#2A4A6F]/60 text-white">
                  <td className="py-4 pr-4 font-semibold">{rep.owner}</td>
                  <td className="py-4 pr-4">{rep.openDeals}</td>
                  <td className="py-4 pr-4">{currency.format(rep.openRecGP)}</td>
                  <td className="py-4 pr-4">{currency.format(rep.openNRGP)}</td>
                  <td className="py-4 pr-4">{rep.closedDeals}</td>
                  <td className="py-4 pr-4">{currency.format(rep.closedRecGP)}</td>
                  <td className="py-4 pr-4">{currency.format(rep.closedNRGP)}</td>
                  <td className="py-4 font-semibold text-[#0EA5E9]">{currency.format(rep.totalClosedGP)}</td>
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
