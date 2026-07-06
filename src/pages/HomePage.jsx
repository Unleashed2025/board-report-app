import { Link } from 'react-router-dom';
import ExcelUpload from '../components/ExcelUpload';
import { useData } from '../data/DataContext.jsx';

const fmt = (n) => '£' + Number(n).toLocaleString('en-GB');

export default function HomePage() {
  const { dataLoaded, deals, kpis, lastUpdated, sourceFilename } = useData();
  const uploadStamp = lastUpdated
    ? lastUpdated.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
    : '';

  return (
    <div className="min-h-screen bg-[#0D2338]">
      {/* Header */}
      <header className="bg-[#0D2338] border-b border-[#1A334F] px-8 py-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src={import.meta.env.BASE_URL + 'assets/logo-white.png'} alt="Unleashed Solutions" className="h-12" />
          </div>
          <div className="text-right">
            <p className="text-[#0EA5E9] text-sm font-semibold">Sales Forecast Platform</p>
            <p className="text-[#5A7A95] text-xs">Unleashed Solutions Ltd</p>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-8 py-16">
        <h1 className="text-4xl font-bold text-white mb-4">Sales Forecast Dashboard</h1>
        <p className="text-[#5A7A95] text-lg mb-2">
          Pipeline management, sales rep performance, and forecast tracking.
        </p>
        <p className="text-[#5A7A95] text-sm mb-12">
          Review your sales data with interactive dashboards covering pipeline health, deal stages, rep scorecards, and target progress.
        </p>

        {dataLoaded && sourceFilename ? (
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#0EA5E9]/30 bg-[#0EA5E9]/10 px-4 py-2 text-xs text-[#BAE6FD]">
            <span>📊</span>
            <span>Using uploaded data from {sourceFilename} — {uploadStamp}</span>
          </div>
        ) : null}

        <ExcelUpload />

        {/* Report Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Overview Dashboard */}
          <Link to="/overview" className="group block bg-[#1A334F] border border-[#2A4A6F] rounded-xl p-8 hover:border-[#0EA5E9] transition-all duration-300 hover:shadow-lg hover:shadow-[#0EA5E9]/10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-lg bg-[#0EA5E9]/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-[#0EA5E9]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-white group-hover:text-[#0EA5E9] transition-colors">Overview Dashboard</h2>
            </div>
            <p className="text-[#5A7A95] text-sm mb-4">
              Headline KPIs, revenue charts, and pipeline breakdown at a glance.
            </p>
            <ul className="text-[#5A7A95] text-xs space-y-1 mb-4">
              <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#0EA5E9]"></span> Pipeline Revenue: {fmt(kpis.openPipelineRevenue)}</li>
              <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#059669]"></span> Closed-Won: {fmt(kpis.closedWonRevenue)}</li>
              <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Open Opportunities: {kpis.openOpportunities}</li>
              <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span> Revenue by month, stage, service type</li>
            </ul>
            <p className="text-[#0EA5E9] text-xs font-semibold group-hover:underline">View Dashboard →</p>
          </Link>

          {/* Pipeline */}
          <Link to="/pipeline" className="group block bg-[#1A334F] border border-[#2A4A6F] rounded-xl p-8 hover:border-[#059669] transition-all duration-300 hover:shadow-lg hover:shadow-[#059669]/10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-lg bg-[#059669]/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-[#059669]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-white group-hover:text-[#059669] transition-colors">Pipeline Analysis</h2>
            </div>
            <p className="text-[#5A7A95] text-sm mb-4">
              Weighted and unweighted pipeline, deal counts, and revenue timeline.
            </p>
            <ul className="text-[#5A7A95] text-xs space-y-1 mb-4">
              <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#0EA5E9]"></span> Weighted vs unweighted GP by stage</li>
              <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Deal count by stage</li>
              <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span> Revenue timeline forecast</li>
            </ul>
            <p className="text-[#059669] text-xs font-semibold group-hover:underline">View Pipeline →</p>
          </Link>

          {/* Sales Reps */}
          <Link to="/reps" className="group block bg-[#1A334F] border border-[#2A4A6F] rounded-xl p-8 hover:border-[#0EA5E9] transition-all duration-300 hover:shadow-lg hover:shadow-[#0EA5E9]/10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-lg bg-[#0EA5E9]/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-[#0EA5E9]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-white group-hover:text-[#0EA5E9] transition-colors">Sales Rep Scorecard</h2>
            </div>
            <p className="text-[#5A7A95] text-sm mb-4">
              Individual rep performance, closed GP, open pipeline, and target progress.
            </p>
            <ul className="text-[#5A7A95] text-xs space-y-1 mb-4">
              <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#059669]"></span> Progress vs £138k annual target per rep</li>
              <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#0EA5E9]"></span> Closed-won GP breakdown</li>
              <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Open pipeline GP by rep</li>
            </ul>
            <p className="text-[#0EA5E9] text-xs font-semibold group-hover:underline">View Scorecards →</p>
          </Link>

          {/* Forecast */}
          <Link to="/forecast" className="group block bg-[#1A334F] border border-[#2A4A6F] rounded-xl p-8 hover:border-[#059669] transition-all duration-300 hover:shadow-lg hover:shadow-[#059669]/10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-lg bg-[#059669]/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-[#059669]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-white group-hover:text-[#059669] transition-colors">Forecast vs Target</h2>
            </div>
            <p className="text-[#5A7A95] text-sm mb-4">
              Annual GP targets against closed-won and pipeline coverage per rep.
            </p>
            <ul className="text-[#5A7A95] text-xs space-y-1 mb-4">
              <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#059669]"></span> Closed GP + Pipeline vs annual target</li>
              <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> Remaining target gap analysis</li>
              <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span> 3x coverage requirements</li>
            </ul>
            <p className="text-[#059669] text-xs font-semibold group-hover:underline">View Forecast →</p>
          </Link>
        </div>

        {/* Quick Access - Deals */}
        <div className="mt-8">
          <Link to="/deals" className="group block bg-[#1A334F]/50 border border-[#2A4A6F] rounded-xl p-6 hover:border-[#0EA5E9] transition-all duration-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#0EA5E9]/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-[#0EA5E9]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-white font-semibold text-sm">All Deals</h3>
                  <p className="text-[#5A7A95] text-xs">Search and filter all {deals.length} opportunities by stage, owner, type</p>
                </div>
              </div>
              <p className="text-[#0EA5E9] text-xs font-semibold group-hover:underline">Browse Deals →</p>
            </div>
          </Link>
        </div>

        {/* Features */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#1A334F]/50 border border-[#2A4A6F] rounded-lg p-6">
            <h3 className="text-white font-semibold text-sm mb-2">Live Data</h3>
            <p className="text-[#5A7A95] text-xs">Upload the latest sales tracker workbook to refresh every dashboard in one place.</p>
          </div>
          <div className="bg-[#1A334F]/50 border border-[#2A4A6F] rounded-lg p-6">
            <h3 className="text-white font-semibold text-sm mb-2">Interactive Charts</h3>
            <p className="text-[#5A7A95] text-xs">Chart.js powered visualisations with hover details and responsive layouts.</p>
          </div>
          <div className="bg-[#1A334F]/50 border border-[#2A4A6F] rounded-lg p-6">
            <h3 className="text-white font-semibold text-sm mb-2">Filterable Tables</h3>
            <p className="text-[#5A7A95] text-xs">Search, filter by stage, owner, or deal type to drill into specific opportunities.</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#1A334F] px-8 py-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <p className="text-[#5A7A95] text-xs">Unleashed Solutions Ltd — Managed IT & Cyber Security</p>
          <p className="text-[#5A7A95] text-xs">Sales Forecast Dashboard</p>
        </div>
      </footer>
    </div>
  );
}
