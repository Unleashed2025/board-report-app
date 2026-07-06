import { Link } from 'react-router-dom';
import ExcelUpload from '../components/ExcelUpload';
import { useData } from '../data/DataContext.jsx';

export default function HomePage() {
  const { dataLoaded, lastUpdated, sourceFilename } = useData();
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
        <p className="text-[#5A7A95] text-lg mb-12">
          Upload your workbook and select a report below.
        </p>

        {dataLoaded && sourceFilename ? (
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#0EA5E9]/30 bg-[#0EA5E9]/10 px-4 py-2 text-xs text-[#BAE6FD]">
            <span>ðŸ“Š</span>
            <span>Using uploaded data from {sourceFilename} â€” {uploadStamp}</span>
          </div>
        ) : null}

        <ExcelUpload />

        {/* Report Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Exec Report */}
          <Link to="/overview" className="group block bg-[#1A334F] border border-[#2A4A6F] rounded-xl p-8 hover:border-[#0EA5E9] transition-all duration-300 hover:shadow-lg hover:shadow-[#0EA5E9]/10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-lg bg-[#0EA5E9]/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-[#0EA5E9]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-white group-hover:text-[#0EA5E9] transition-colors">Exec Report</h2>
            </div>
            <p className="text-[#5A7A95] text-sm mb-4">
              Board-level view: GP vs costs, breakeven, EBITDA, rep targets, deal pipeline forecast.
            </p>
            <ul className="text-[#5A7A95] text-xs space-y-1 mb-4">
              <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#0EA5E9]"></span> Monthly recurring GP vs business costs</li>
              <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#059669]"></span> Rep target tracking (Â£24k target)</li>
              <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Pipeline forecast by period</li>
              <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span> Closed Won report</li>
            </ul>
            <p className="text-[10px] text-[#5A7A95] mb-2">Requires Board Business Plan workbook â€¢ Password protected</p>
            <p className="text-[#0EA5E9] text-xs font-semibold group-hover:underline">View Exec Report â†’</p>
          </Link>

          {/* Pipeline Analysis */}
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
              Sales rep personal forecast view. Select your name to see only your deals and pipeline.
            </p>
            <ul className="text-[#5A7A95] text-xs space-y-1 mb-4">
              <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#059669]"></span> Filter by sales rep</li>
              <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#0EA5E9]"></span> Deals by stage: Closed-Won, Negotiating, Quoting</li>
              <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Revenue &amp; GP summary per rep</li>
              <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span> Target progress tracker</li>
            </ul>
            <p className="text-[10px] text-[#5A7A95] mb-2">Upload Sales Tracker workbook only</p>
            <p className="text-[#059669] text-xs font-semibold group-hover:underline">View Pipeline â†’</p>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#1A334F] px-8 py-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <p className="text-[#5A7A95] text-xs">Unleashed Solutions Ltd â€” Managed IT & Cyber Security</p>
          <p className="text-[#5A7A95] text-xs">Sales Forecast Dashboard</p>
        </div>
      </footer>
    </div>
  );
}
