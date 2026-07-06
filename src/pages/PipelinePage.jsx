import { Bar, Line } from 'react-chartjs-2';
import Layout from '../components/Layout';
import { useData } from '../data/DataContext.jsx';

const cardClass = 'rounded-xl border border-[#2A4A6F] bg-[#1A334F] p-6';
const axisColor = '#5A7A95';
const gridColor = 'rgba(90, 122, 149, 0.18)';
const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { labels: { color: '#E2E8F0' } } },
  scales: {
    x: { ticks: { color: axisColor }, grid: { color: gridColor } },
    y: { ticks: { color: axisColor }, grid: { color: gridColor } },
  },
};

export default function PipelinePage() {
  const { monthlyForecast, pipelineByStage } = useData();

  return (
    <Layout>
    <div className="grid gap-6 pb-6 xl:grid-cols-2">
      <section className={cardClass}>
        <div className="mb-6">
          <h2 className="text-xl font-bold text-white">Weighted vs unweighted GP</h2>
          <p className="text-sm text-[#5A7A95]">Open gross profit compared with probability-weighted gross profit by stage.</p>
        </div>
        <div className="h-96">
          <Bar
            data={{
              labels: pipelineByStage.map((entry) => entry.stage),
              datasets: [
                {
                  label: 'Unweighted GP',
                  data: pipelineByStage.map((entry) => entry.profit),
                  backgroundColor: '#0EA5E9',
                  borderRadius: 8,
                },
                {
                  label: 'Weighted GP',
                  data: pipelineByStage.map((entry) => Number(entry.weightedProfit.toFixed(0))),
                  backgroundColor: '#059669',
                  borderRadius: 8,
                },
              ],
            }}
            options={chartOptions}
          />
        </div>
      </section>

      <section className={cardClass}>
        <div className="mb-6">
          <h2 className="text-xl font-bold text-white">Deal count by stage</h2>
          <p className="text-sm text-[#5A7A95]">Shows where opportunities are clustering through the pipeline.</p>
        </div>
        <div className="h-96">
          <Bar
            data={{
              labels: pipelineByStage.map((entry) => entry.stage),
              datasets: [
                {
                  label: 'Open Deals',
                  data: pipelineByStage.map((entry) => entry.count),
                  backgroundColor: ['#0EA5E9', '#059669', '#f59e0b', '#ef4444', '#8b5cf6'],
                  borderRadius: 8,
                },
              ],
            }}
            options={{
              ...chartOptions,
              indexAxis: 'y',
            }}
          />
        </div>
      </section>

      <section className={`${cardClass} xl:col-span-2`}>
        <div className="mb-6">
          <h2 className="text-xl font-bold text-white">Revenue timeline</h2>
          <p className="text-sm text-[#5A7A95]">Monthly view of closed revenue and future pipeline value.</p>
        </div>
        <div className="h-96">
          <Line
            data={{
              labels: monthlyForecast.map((entry) => entry.month),
              datasets: [
                {
                  label: 'Closed Revenue',
                  data: monthlyForecast.map((entry) => entry.closedRevenue),
                  borderColor: '#059669',
                  backgroundColor: '#059669',
                  tension: 0.35,
                },
                {
                  label: 'Pipeline Revenue',
                  data: monthlyForecast.map((entry) => entry.pipelineRevenue),
                  borderColor: '#0EA5E9',
                  backgroundColor: '#0EA5E9',
                  tension: 0.35,
                },
                {
                  label: 'Weighted Pipeline GP',
                  data: monthlyForecast.map((entry) => Number(entry.weightedPipelineProfit.toFixed(0))),
                  borderColor: '#f59e0b',
                  backgroundColor: '#f59e0b',
                  tension: 0.35,
                },
              ],
            }}
            options={chartOptions}
          />
        </div>
      </section>
    </div>
    </Layout>
  );
}
