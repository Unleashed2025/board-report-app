import { useState, useRef, useCallback } from 'react';
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
  const [activeTab, setActiveTab] = useState('pipeline');
  const [exporting, setExporting] = useState(false);
  const [cwPeriod, setCwPeriod] = useState('all');
  const reportRef = useRef(null);

  const handleExportPDF = useCallback(async () => {
    if (!reportRef.current) return;
    setExporting(true);
    try {
      const { default: html2pdf } = await import('html2pdf.js');
      const tabLabel = activeTab === 'closedwon' ? 'Closed_Won_Report' : 'Board_Report';
      const dateStr = new Date().toISOString().split('T')[0];
      const opt = {
        margin: [8, 8, 8, 8],
        filename: `${tabLabel}_${dateStr}.pdf`,
        image: { type: 'jpeg', quality: 0.95 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          letterRendering: true,
          logging: false,
          backgroundColor: '#0D2338',
        },
        jsPDF: {
          unit: 'mm',
          format: 'a4',
          orientation: 'portrait',
        },
        pagebreak: { mode: ['css', 'legacy'], before: '.report-page' },
      };
      await html2pdf().set(opt).from(reportRef.current).save();
    } catch (err) {
      console.error('PDF export failed:', err);
      window.print();
    } finally {
      setExporting(false);
    }
  }, [activeTab]);
  const {
    monthlyData, costBreakdown, gpByServiceType, gpByRep, employeeCosts,
    closedTotalGP, closedRecurringGP, closedNonRecurringGP,
    totalCostTotal, totalGPTotal, grossProfitTotal, netProfitTotal,
    ebitdaTotal, cumulativeEBITDAFinal, mdfTotal,
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

  // Rule of 78 GP contribution for recurring deals
  // Calendar Year: Jan=12/78 ... Dec=1/78
  // FY (Oct-Sep):  Oct=12/78 ... Sep=1/78
  const RULE_OF_78_TOTAL = 78; // 12+11+10+...+1
  const r78Now = new Date();
  const currentYear = r78Now.getFullYear();
  const currentMonthIdx = r78Now.getMonth();
  const fyStartYear = currentMonthIdx >= 9 ? currentYear : currentYear - 1;
  const monthNames78 = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  // FY month order: Oct(0), Nov(1), Dec(2), Jan(3), Feb(4), ..., Sep(11)
  const fyMonthOrder = [9,10,11,0,1,2,3,4,5,6,7,8]; // calendar month indices in FY order
  const fyMonthLabels = fyMonthOrder.map(m => monthNames78[m]);

  // Convert calendar month index to FY position (0-11 where 0=Oct)
  const calToFyPos = (mi) => (mi + 3) % 12; // Oct(9)→0, Nov(10)→1, ..., Sep(8)→11

  const calcRule78GP = (deal, mode = 'year') => {
    if (deal.dealType !== 'Recurring' || !deal.billingStart) return { annualGP: deal.profit * 12, calYearGP: 0, fyGP: 0, resultGP: 0, monthsActive: 0, weight: 0, startMonth: '' };
    const annualGP = deal.profit * 12;
    const parts = String(deal.billingStart).split(' ');
    const mi = monthNames78.indexOf(parts[0]);
    const yr = parseInt(parts[1]);
    if (mi === -1 || isNaN(yr)) return { annualGP, calYearGP: 0, fyGP: 0, resultGP: 0, monthsActive: 0, weight: 0, startMonth: '?', startYear: yr };

    // Calendar year R78
    let calWeight = 0, calMonths = 0;
    const calStart = yr < currentYear ? 0 : (yr === currentYear ? mi : 12);
    for (let m = calStart; m < 12; m++) { calWeight += (12 - m); calMonths++; }
    const calYearGP = (calWeight / RULE_OF_78_TOTAL) * annualGP;

    // FY R78 (Oct fyStartYear – Sep fyStartYear+1)
    let fyWeight = 0, fyMonths = 0;
    const fyPos = calToFyPos(mi);
    // Is the deal within this FY?
    const inFY = (yr === fyStartYear && mi >= 9) || (yr === fyStartYear + 1 && mi <= 8);
    const beforeFY = (yr < fyStartYear) || (yr === fyStartYear && mi < 9);
    const fyStart = beforeFY ? 0 : (inFY ? fyPos : 12);
    for (let p = fyStart; p < 12; p++) { fyWeight += (12 - p); fyMonths++; }
    const fyGP = (fyWeight / RULE_OF_78_TOTAL) * annualGP;

    const activeWeight = mode === 'fy' ? fyWeight : calWeight;
    const activeMonths = mode === 'fy' ? fyMonths : calMonths;
    const activeGP = mode === 'fy' ? fyGP : calYearGP;

    return { annualGP, calYearGP, fyGP, monthsActive: activeMonths, weight: activeWeight, startMonth: `${monthNames78[mi]} ${yr}`, resultGP: activeGP };
  };

  const buildR78Grid = (dealSet, mode = 'year') => {
    const isFY = mode === 'fy';
    const labels = isFY ? fyMonthLabels : monthNames78;
    const rows = dealSet.map(d => {
      const parts = String(d.billingStart || '').split(' ');
      const mi = monthNames78.indexOf(parts[0]);
      const yr = parseInt(parts[1]);

      let startPos;
      if (isFY) {
        const inFY = (yr === fyStartYear && mi >= 9) || (yr === fyStartYear + 1 && mi <= 8);
        const beforeFY = (yr < fyStartYear) || (yr === fyStartYear && mi < 9);
        startPos = (isNaN(yr) || mi === -1) ? 0 : (beforeFY ? 0 : (inFY ? calToFyPos(mi) : 12));
      } else {
        startPos = (isNaN(yr) || mi === -1) ? 0 : (yr < currentYear ? 0 : (yr === currentYear ? mi : 12));
      }
      const months = Array.from({ length: 12 }, (_, m) => m >= startPos ? d.profit : 0);
      const r78 = calcRule78GP(d, mode);
      return { ...d, startIdx: startPos, months, r78 };
    });
    const totals = Array.from({ length: 12 }, (_, m) => rows.reduce((s, r) => s + r.months[m], 0));
    const r78GrandTotal = rows.reduce((s, r) => s + r.r78.resultGP, 0);
    return { rows, totals, r78GrandTotal, labels };
  };

  const Rule78Grid = ({ title, subtitle, dealSet, accentColor, mode = 'year' }) => {
    const grid = buildR78Grid(dealSet, mode);
    const periodLabel = mode === 'fy' ? `FY Oct ${fyStartYear} – Sep ${fyStartYear + 1}` : `Calendar Year ${currentYear}`;
    return (
      <section className={`${cardClass} report-page`}>
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-lg font-bold text-white">{title}</h2>
            <p className="text-xs text-[#5A7A95]">{subtitle}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-[#5A7A95]">R78 {periodLabel} GP</p>
            <p className={`text-xl font-bold ${accentColor}`}>{money(grid.r78GrandTotal)}</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[10px]">
            <thead>
              <tr className="text-[#5A7A95] border-b border-[#2A4A6F]">
                <th className="text-left py-1.5 pr-2 sticky left-0 bg-[#1A334F] min-w-[140px]">Customer</th>
                <th className="text-left py-1.5 pr-2 min-w-[60px]">Rep</th>
                <th className="text-right py-1.5 pr-2 min-w-[55px]">Mo. GP</th>
                {grid.labels.map(m => (
                  <th key={m} className="text-right py-1.5 min-w-[52px]">{m}</th>
                ))}
                <th className="text-right py-1.5 pl-2 min-w-[62px]">R78 GP</th>
              </tr>
            </thead>
            <tbody>
              {grid.rows.sort((a, b) => a.startIdx - b.startIdx || b.profit - a.profit).map((d, i) => (
                <tr key={(d.id || d.customer) + i} className="border-b border-[#2A4A6F]/20 text-white">
                  <td className="py-1 pr-2 font-medium sticky left-0 bg-[#1A334F] truncate max-w-[140px]">{d.customer}</td>
                  <td className="py-1 pr-2 text-[#5A7A95]">{d.owner}</td>
                  <td className="py-1 pr-2 text-right text-[#0EA5E9]">{money(d.profit)}</td>
                  {d.months.map((v, m) => (
                    <td key={m} className={`py-1 text-right ${v > 0 ? 'text-[#059669]' : 'text-[#2A4A6F]'}`}>
                      {v > 0 ? money(v) : '\u2014'}
                    </td>
                  ))}
                  <td className="py-1 pl-2 text-right font-bold text-[#059669]">{money(d.r78.resultGP)}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-[#0EA5E9] font-bold text-white">
                <td className="py-2 sticky left-0 bg-[#1A334F]" colSpan={2}>Monthly Total</td>
                <td className="py-2 text-right text-[#0EA5E9]">{money(grid.rows.reduce((s, r) => s + r.profit, 0))}</td>
                {grid.totals.map((t, m) => (
                  <td key={m} className="py-2 text-right text-[#059669]">{money(t)}</td>
                ))}
                <td className="py-2 pl-2 text-right text-[#059669]">{money(grid.r78GrandTotal)}</td>
              </tr>
              <tr className="text-[#5A7A95] text-[9px]">
                <td className="py-1 sticky left-0 bg-[#1A334F]" colSpan={2}>R78 Weight</td>
                <td className="py-1"></td>
                {grid.labels.map((_, m) => (
                  <td key={m} className="py-1 text-right">{12 - m}/78</td>
                ))}
                <td className="py-1"></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    );
  };

  // Pre-compute R78 for both modes
  const cwRecWithR78Cal = cwRecurring.map(d => ({ ...d, r78: calcRule78GP(d, 'year') }));
  const cwRecWithR78FY = cwRecurring.map(d => ({ ...d, r78: calcRule78GP(d, 'fy') }));
  const totalCalYearRecurringGP = cwRecWithR78Cal.reduce((s, d) => s + d.r78.resultGP, 0);
  const totalFYRecurringGP = cwRecWithR78FY.reduce((s, d) => s + d.r78.resultGP, 0);
  const totalAnnualisedRecurringGP = cwRecWithR78Cal.reduce((s, d) => s + d.r78.annualGP, 0);

  const negRecurring = negotiatingDeals.filter(d => d.dealType === 'Recurring');
  const negRecWithR78Cal = negRecurring.map(d => ({ ...d, r78: calcRule78GP(d, 'year') }));
  const negRecWithR78FY = negRecurring.map(d => ({ ...d, r78: calcRule78GP(d, 'fy') }));
  const combinedR78Cal = [...cwRecWithR78Cal, ...negRecWithR78Cal];
  const combinedR78FY = [...cwRecWithR78FY, ...negRecWithR78FY];

  // Period filter helpers for Closed Won
  const cwFilterMonthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const cwNow = new Date();
  const cwCurMonth = cwNow.getMonth();
  const cwCurYear = cwNow.getFullYear();
  const cwCurQuarter = Math.floor(cwCurMonth / 3);

  const parseDealMonth = (label) => {
    if (!label) return null;
    const parts = String(label).split(' ');
    const mi = cwFilterMonthNames.indexOf(parts[0]);
    const yr = parseInt(parts[1]);
    if (mi === -1 || isNaN(yr)) return null;
    return { month: mi, year: yr };
  };

  const cwPeriodFilter = (deal) => {
    if (cwPeriod === 'all') return true;
    const p = parseDealMonth(deal.predictedMonth);
    if (!p) return false;
    if (cwPeriod === 'month') return p.year === cwCurYear && p.month === cwCurMonth;
    if (cwPeriod === 'quarter') return p.year === cwCurYear && Math.floor(p.month / 3) === cwCurQuarter;
    if (cwPeriod === 'fy') {
      if (p.year === fyStartYear && p.month >= 9) return true;
      if (p.year === fyStartYear + 1 && p.month <= 8) return true;
      return false;
    }
    if (cwPeriod === 'year') return p.year === cwCurYear;
    return true;
  };

  const cwPeriodLabel = cwPeriod === 'month' ? `${cwFilterMonthNames[cwCurMonth]} ${cwCurYear}`
    : cwPeriod === 'quarter' ? `Q${cwCurQuarter + 1} ${cwCurYear}`
    : cwPeriod === 'fy' ? `FY Oct ${fyStartYear} \u2013 Sep ${fyStartYear + 1}`
    : cwPeriod === 'year' ? `Calendar Year ${cwCurYear}`
    : 'All Time';

  if (activeTab === 'closedwon') {
    const filteredCW = closedWonDeals.filter(cwPeriodFilter);
    const fCwRec = filteredCW.filter(d => d.dealType === 'Recurring');
    const fCwNR = filteredCW.filter(d => d.dealType !== 'Recurring');
    const fRecRev = fCwRec.reduce((s, d) => s + d.revenue, 0);
    const fRecGP = fCwRec.reduce((s, d) => s + d.profit, 0);
    const fNRRev = fCwNR.reduce((s, d) => s + d.revenue, 0);
    const fNRGP = fCwNR.reduce((s, d) => s + d.profit, 0);
    const fRecR78Cal = fCwRec.map(d => ({ ...d, r78: calcRule78GP(d, 'year') }));
    const fRecR78FY = fCwRec.map(d => ({ ...d, r78: calcRule78GP(d, 'fy') }));
    const fTotalCalGP = fRecR78Cal.reduce((s, d) => s + d.r78.resultGP, 0);
    const fTotalFYGP = fRecR78FY.reduce((s, d) => s + d.r78.resultGP, 0);
    const fAnnualisedGP = fRecR78Cal.reduce((s, d) => s + d.r78.annualGP, 0);
    const fNegRec = negotiatingDeals.filter(d => d.dealType === 'Recurring').filter(cwPeriodFilter);
    const fCombinedCal = [...fRecR78Cal, ...fNegRec.map(d => ({ ...d, r78: calcRule78GP(d, 'year') }))];
    const fCombinedFY = [...fRecR78FY, ...fNegRec.map(d => ({ ...d, r78: calcRule78GP(d, 'fy') }))];

    const PeriodBtn = ({ id, label }) => (
      <button onClick={() => setCwPeriod(id)}
        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${cwPeriod === id ? 'bg-[#0EA5E9] text-white' : 'bg-[#0D2338] border border-[#2A4A6F] text-[#5A7A95] hover:text-white'}`}
      >{label}</button>
    );

    return (
      <Layout>
        <div ref={reportRef} className="space-y-6 pb-6">
          {/* Tab bar */}
          <div className="flex gap-2 flex-wrap items-center no-print">
            <button onClick={() => setActiveTab('pipeline')} className="px-4 py-2 rounded-lg text-sm font-medium bg-[#1A334F] border border-[#2A4A6F] text-[#5A7A95] hover:text-white transition-colors">Pipeline &amp; Forecast</button>
            <button className="px-4 py-2 rounded-lg text-sm font-medium bg-[#0EA5E9] text-white">Closed Won Report</button>
            <button onClick={handleExportPDF} disabled={exporting} className="ml-auto px-4 py-2 rounded-lg text-sm font-medium bg-[#059669] hover:bg-[#059669]/80 text-white transition-colors disabled:opacity-50 flex items-center gap-2">
              {exporting ? (
                <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> Exporting...</>
              ) : (
                <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> Export PDF</>
              )}
            </button>
          </div>

          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white">Closed Won Report</h1>
              <p className="text-sm text-[#5A7A95] mt-1">{filteredCW.length} deals — {cwPeriodLabel}</p>
            </div>
            <div className="flex gap-2 flex-wrap no-print">
              <PeriodBtn id="month" label="This Month" />
              <PeriodBtn id="quarter" label="This Quarter" />
              <PeriodBtn id="fy" label="This FY" />
              <PeriodBtn id="year" label="Cal Year" />
              <PeriodBtn id="all" label="All Time" />
            </div>
          </div>

          {/* Period logic explanation */}
          <div className={`${cardClass} border-l-4 border-[#0EA5E9]`}>
            <p className="text-xs text-[#A0B4C8] leading-relaxed">
              <span className="font-semibold text-white">How periods work:</span>{' '}
              <strong>This Month</strong> shows deals with a predicted close date in the current calendar month.{' '}
              <strong>This Quarter</strong> covers the current calendar quarter (Jan–Mar, Apr–Jun, Jul–Sep, Oct–Dec).{' '}
              <strong>This FY</strong> runs from 1 Oct to 30 Sep (e.g. Oct {fyStartYear} – Sep {fyStartYear + 1}).{' '}
              <strong>Cal Year</strong> covers 1 Jan – 31 Dec {currentYear}.{' '}
              <strong>All Time</strong> shows every closed-won deal regardless of date.
              All revenue and GP figures below update to reflect the selected period.
            </p>
          </div>

          {/* KPIs */}
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KPICard label="Monthly Recurring Revenue" value={money(fRecRev)} accent="text-[#0EA5E9]" icon="↻" subtitle={`${fCwRec.length} recurring contracts`} />
            <KPICard label="Monthly Recurring GP" value={money(fRecGP)} accent="text-[#059669]" icon="↻" subtitle="Gross profit per month" />
            <KPICard label="Non-Recurring Revenue" value={money(fNRRev)} accent="text-[#f59e0b]" icon="→" subtitle={`${fCwNR.length} one-off deals`} />
            <KPICard label="Non-Recurring GP" value={money(fNRGP)} accent="text-[#059669]" icon="→" subtitle="Gross profit on projects" />
          </section>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className={cardClass}>
              <p className="text-xs text-[#5A7A95]">Annualised Recurring GP</p>
              <p className="mt-1 text-2xl font-bold text-[#0EA5E9]">{money(fAnnualisedGP)}</p>
              <p className="text-[10px] text-[#5A7A95] mt-1">12 months if all active full year</p>
            </div>
            <div className={cardClass}>
              <p className="text-xs text-[#5A7A95]">R78 Calendar Year GP ({currentYear})</p>
              <p className="mt-1 text-2xl font-bold text-[#059669]">{money(fTotalCalGP)}</p>
              <p className="text-[10px] text-[#5A7A95] mt-1">Jan–Dec weighted by billing start</p>
            </div>
            <div className={cardClass}>
              <p className="text-xs text-[#5A7A95]">R78 FY GP (Oct {fyStartYear}–Sep {fyStartYear + 1})</p>
              <p className="mt-1 text-2xl font-bold text-[#8b5cf6]">{money(fTotalFYGP)}</p>
              <p className="text-[10px] text-[#5A7A95] mt-1">Oct–Sep weighted by billing start</p>
            </div>
            <div className={cardClass}>
              <p className="text-xs text-[#5A7A95]">Total Closed Won GP</p>
              <p className="mt-1 text-2xl font-bold text-white">{money(filteredCW.reduce((s, d) => s + d.profit, 0))}</p>
              <p className="text-[10px] text-[#5A7A95] mt-1">Recurring + non-recurring</p>
            </div>
          </section>

          {/* Rule of 78 Breakdown — Calendar Year */}
          <section className={`${cardClass} report-page`}>
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="text-lg font-bold text-white">Rule of 78 — Calendar Year ({currentYear})</h2>
                <p className="text-xs text-[#5A7A95]">Weighted Jan–Dec GP based on predicted billing start date</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-[#5A7A95]">Total Cal Year GP</p>
                <p className="text-xl font-bold text-[#059669]">{money(fTotalCalGP)}</p>
              </div>
            </div>
            <div className="rounded-lg bg-[#0D2338] border border-[#2A4A6F] p-3 mb-4">
              <p className="text-xs text-[#A0B4C8] leading-relaxed">
                <span className="font-semibold text-white">Rule of 78 logic:</span>{' '}
                The Rule of 78 calculates the actual gross profit a recurring deal will contribute within the year based on when billing starts.
                A deal starting in January contributes 12 months of revenue (weight 78/78 = 100%), February contributes 11 months (66/78 = 85%), and so on — a deal starting in December contributes only 1 month (1/78 = 1.3%).
                The total weight of 78 comes from 12+11+10+9+8+7+6+5+4+3+2+1.
                This gives a realistic view of in-year GP rather than annualised figures.
              </p>
              <p className="text-xs text-[#A0B4C8] leading-relaxed mt-2">
                <span className="font-semibold text-white">Calendar Year:</span>{' '}
                Runs Jan – Dec {currentYear}. A deal billing from January has the full 12 months; a deal billing from December has just 1 month of recognised GP.
              </p>
            </div>
            <p className="text-[10px] text-[#5A7A95] mb-4">
              Weights: Jan = 78/78, Feb = 66/78, Mar = 55/78, Apr = 45/78, May = 36/78, Jun = 28/78, Jul = 21/78, Aug = 15/78, Sep = 10/78, Oct = 6/78, Nov = 3/78, Dec = 1/78
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="text-[#5A7A95] border-b border-[#2A4A6F]">
                  <th className="text-left py-2">Customer</th>
                  <th className="text-left py-2">Rep</th>
                  <th className="text-left py-2">Description</th>
                  <th className="text-right py-2">Monthly GP</th>
                  <th className="text-right py-2">Annual GP</th>
                  <th className="text-center py-2">Billing Start</th>
                  <th className="text-center py-2">Months</th>
                  <th className="text-right py-2">R78 Weight</th>
                  <th className="text-right py-2">Cal Year GP</th>
                  <th className="text-right py-2">FY GP</th>
                </tr></thead>
                <tbody>
                  {fRecR78Cal.map((d, i) => {
                    const fyD = fRecR78FY.find(x => x.id === d.id) || d;
                    return (
                    <tr key={d.id + i} className="border-b border-[#2A4A6F]/30 text-white">
                      <td className="py-1.5 pr-2 font-medium">{d.customer}</td>
                      <td className="py-1.5 pr-2 text-[#5A7A95]">{d.owner}</td>
                      <td className="py-1.5 pr-2 text-[#5A7A95] truncate max-w-[160px]">{d.description}</td>
                      <td className="py-1.5 text-right text-[#0EA5E9]">{money(d.profit)}</td>
                      <td className="py-1.5 text-right">{money(d.r78.annualGP)}</td>
                      <td className="py-1.5 text-center">{d.r78.startMonth || d.billingStart}</td>
                      <td className="py-1.5 text-center">{d.r78.monthsActive}</td>
                      <td className="py-1.5 text-right text-[#5A7A95]">{d.r78.weight}/{RULE_OF_78_TOTAL}</td>
                      <td className="py-1.5 text-right font-bold text-[#059669]">{money(d.r78.calYearGP)}</td>
                      <td className="py-1.5 text-right font-bold text-[#8b5cf6]">{money(fyD.r78.fyGP)}</td>
                    </tr>
                    );
                  })}
                  <tr className="border-t-2 border-[#0EA5E9] text-white font-bold">
                    <td className="py-2" colSpan={3}>Total</td>
                    <td className="py-2 text-right text-[#0EA5E9]">{money(fRecGP)}</td>
                    <td className="py-2 text-right">{money(fAnnualisedGP)}</td>
                    <td className="py-2" colSpan={2}></td>
                    <td className="py-2"></td>
                    <td className="py-2 text-right text-[#059669]">{money(fTotalCalGP)}</td>
                    <td className="py-2 text-right text-[#8b5cf6]">{money(fTotalFYGP)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* R78 Calendar Year Grid — Closed Won */}
          <Rule78Grid
            title={`Rule of 78 Calendar Grid — Closed Won (${currentYear})`}
            subtitle="Month-by-month recurring GP from closed-won deals (Jan–Dec)"
            dealSet={fRecR78Cal}
            accentColor="text-[#059669]"
            mode="year"
          />

          {/* R78 FY Grid — Closed Won */}
          <div className={`${cardClass} border-l-4 border-[#8b5cf6] mb-0`}>
            <p className="text-xs text-[#A0B4C8] leading-relaxed">
              <span className="font-semibold text-white">FY Rule of 78 logic:</span>{' '}
              The financial year runs from 1 October to 30 September.
              A deal starting billing in October (start of FY) gets 12 months of recognised GP (weight 78/78 = 100%).
              A deal starting in September (last month of FY) gets just 1 month (weight 1/78 = 1.3%).
              This mirrors the Calendar Year logic but shifted to the Oct–Sep financial year cycle, giving an accurate view of in-year FY GP contribution.
            </p>
          </div>
          <Rule78Grid
            title={`Rule of 78 FY Grid — Closed Won (Oct ${fyStartYear}–Sep ${fyStartYear + 1})`}
            subtitle="Month-by-month recurring GP from closed-won deals (Oct–Sep)"
            dealSet={fRecR78FY}
            accentColor="text-[#8b5cf6]"
            mode="fy"
          />

          {/* R78 Calendar Year Grid — Closed Won + Negotiating */}
          <div className={`${cardClass} border-l-4 border-[#0EA5E9] mb-0`}>
            <p className="text-xs text-[#A0B4C8] leading-relaxed">
              <span className="font-semibold text-white">CW + Negotiating view:</span>{' '}
              The grids below include deals currently in the Negotiating stage alongside Closed Won.
              This provides a forward-looking view of potential GP if all negotiating deals close as expected, helping forecast total revenue recognition for the year.
            </p>
          </div>
          <Rule78Grid
            title={`Rule of 78 Calendar Grid — CW + Negotiating (${currentYear})`}
            subtitle="Combined pipeline including negotiating deals (Jan–Dec)"
            dealSet={fCombinedCal}
            accentColor="text-[#0EA5E9]"
            mode="year"
          />

          {/* R78 FY Grid — Closed Won + Negotiating */}
          <Rule78Grid
            title={`Rule of 78 FY Grid — CW + Negotiating (Oct ${fyStartYear}–Sep ${fyStartYear + 1})`}
            subtitle="Combined pipeline including negotiating deals (Oct–Sep)"
            dealSet={fCombinedFY}
            accentColor="text-[#0EA5E9]"
            mode="fy"
          />

          {/* Closed Won by Rep */}
          <section className={`${cardClass} report-page`}>
            <h2 className="text-lg font-bold text-white mb-4">Closed Won by Sales Rep</h2>
            {(() => {
              const owners = [...new Set(filteredCW.map(d => d.owner).filter(Boolean))].sort();
              return (
                <div className="space-y-4">
                  {owners.map(owner => {
                    const deals = filteredCW.filter(d => d.owner === owner);
                    const recDeals = deals.filter(d => d.dealType === 'Recurring');
                    const nrDeals = deals.filter(d => d.dealType !== 'Recurring');
                    const totalRev = deals.reduce((s, d) => s + d.revenue, 0);
                    const totalGP = deals.reduce((s, d) => s + d.profit, 0);
                    const recGP = recDeals.reduce((s, d) => s + d.profit, 0);
                    const nrGP = nrDeals.reduce((s, d) => s + d.profit, 0);
                    return (
                      <div key={owner}>
                        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                          <span className="text-white font-medium">{owner}</span>
                          <div className="flex gap-3 text-xs text-[#5A7A95]">
                            <span>{deals.length} deals</span>
                            <span>Rev: {money(totalRev)}</span>
                            <span className="text-[#0EA5E9]">Rec GP: {money(recGP)}/mo</span>
                            <span className="text-[#f59e0b]">NR GP: {money(nrGP)}</span>
                            <span className="text-[#059669] font-medium">Total GP: {money(totalGP)}</span>
                          </div>
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
                              <th className="text-right py-1.5">Billing Start</th>
                            </tr></thead>
                            <tbody>
                              {deals.sort((a, b) => b.revenue - a.revenue).map((d, i) => (
                                <tr key={d.id + i} className="border-b border-[#2A4A6F]/30 text-white">
                                  <td className="py-1.5 pr-2 font-medium">{d.customer}</td>
                                  <td className="py-1.5 pr-2 text-[#5A7A95] truncate max-w-[200px]">{d.description}</td>
                                  <td className="py-1.5 pr-2"><span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${d.dealType === 'Recurring' ? 'bg-[#0EA5E9]/20 text-[#0EA5E9]' : 'bg-[#f59e0b]/20 text-[#f59e0b]'}`}>{d.dealType}</span></td>
                                  <td className="py-1.5 pr-2 text-[#5A7A95]">{d.serviceType}</td>
                                  <td className="py-1.5 text-right font-medium">{money(d.revenue)}</td>
                                  <td className="py-1.5 text-right text-[#059669]">{money(d.profit)}</td>
                                  <td className="py-1.5 text-right text-[#5A7A95]">{d.billingStart || d.predictedMonth}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </section>

          {/* Charts */}
          <section className="grid gap-6 xl:grid-cols-2 report-page">
            <div className={cardClass}>
              <h2 className="text-lg font-bold text-white mb-4">Revenue by Deal Type</h2>
              <div className="h-56">
                <Doughnut
                  data={{
                    labels: ['Recurring Revenue', 'Non-Recurring Revenue'],
                    datasets: [{
                      data: [fRecRev, fNRRev],
                      backgroundColor: ['#0EA5E9', '#f59e0b'],
                      borderColor: '#1A334F',
                      borderWidth: 3,
                    }],
                  }}
                  options={{ responsive: true, maintainAspectRatio: false, cutout: '65%', plugins: { legend: { position: 'bottom', labels: { color: '#E2E8F0' } }, tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${money(ctx.raw)}` } } } }}
                />
              </div>
            </div>
            <div className={cardClass}>
              <h2 className="text-lg font-bold text-white mb-4">GP by Deal Type</h2>
              <div className="h-56">
                <Doughnut
                  data={{
                    labels: ['Recurring GP', 'Non-Recurring GP'],
                    datasets: [{
                      data: [fRecGP, fNRGP],
                      backgroundColor: ['#059669', '#8b5cf6'],
                      borderColor: '#1A334F',
                      borderWidth: 3,
                    }],
                  }}
                  options={{ responsive: true, maintainAspectRatio: false, cutout: '65%', plugins: { legend: { position: 'bottom', labels: { color: '#E2E8F0' } }, tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${money(ctx.raw)}` } } } }}
                />
              </div>
            </div>
          </section>

          {/* By Service Type */}
          <section className={cardClass}>
            <h2 className="text-lg font-bold text-white mb-4">Closed Won by Service Type</h2>
            {(() => {
              const types = [...new Set(filteredCW.map(d => d.serviceType).filter(Boolean))].sort();
              return (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {types.map(type => {
                    const typeDeals = filteredCW.filter(d => d.serviceType === type);
                    const rev = typeDeals.reduce((s, d) => s + d.revenue, 0);
                    const gp = typeDeals.reduce((s, d) => s + d.profit, 0);
                    const recCount = typeDeals.filter(d => d.dealType === 'Recurring').length;
                    return (
                      <div key={type} className="rounded-lg border border-[#2A4A6F] bg-[#0D2338] p-3">
                        <p className="text-xs font-semibold text-white">{type}</p>
                        <p className="text-lg font-bold text-[#059669] mt-1">{money(gp)} <span className="text-xs font-normal text-[#5A7A95]">GP</span></p>
                        <p className="text-xs text-[#5A7A95]">{typeDeals.length} deals ({recCount} rec) • Rev: {money(rev)}</p>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </section>

          {/* Monthly Recurring Deals Table */}
          <section className={`${cardClass} report-page`}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-white">Monthly Recurring Revenue — Closed Won</h2>
                <p className="text-xs text-[#5A7A95]">{fCwRec.length} recurring contracts</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-[#5A7A95]">Monthly Revenue / GP</p>
                <p className="text-xl font-bold text-[#0EA5E9]">{money(fRecRev)} <span className="text-[#059669]">/ {money(fRecGP)}</span></p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="text-[#5A7A95] border-b border-[#2A4A6F]">
                  <th className="text-left py-2">Customer</th>
                  <th className="text-left py-2">Rep</th>
                  <th className="text-left py-2">Description</th>
                  <th className="text-left py-2">Service</th>
                  <th className="text-right py-2">Monthly Rev</th>
                  <th className="text-right py-2">Monthly GP</th>
                  <th className="text-center py-2">Billing Start</th>
                  <th className="text-right py-2">Cal Year GP (R78)</th>
                </tr></thead>
                <tbody>
                  {fRecR78Cal.sort((a, b) => b.revenue - a.revenue).map((d, i) => (
                    <tr key={d.id + i} className="border-b border-[#2A4A6F]/30 text-white">
                      <td className="py-1.5 pr-2 font-medium">{d.customer}</td>
                      <td className="py-1.5 pr-2 text-[#5A7A95]">{d.owner}</td>
                      <td className="py-1.5 pr-2 text-[#5A7A95] truncate max-w-[160px]">{d.description}</td>
                      <td className="py-1.5 pr-2 text-[#5A7A95]">{d.serviceType}</td>
                      <td className="py-1.5 text-right text-[#0EA5E9]">{money(d.revenue)}</td>
                      <td className="py-1.5 text-right text-[#059669]">{money(d.profit)}</td>
                      <td className="py-1.5 text-center">{d.billingStart || d.predictedMonth}</td>
                      <td className="py-1.5 text-right font-medium text-[#059669]">{money(d.r78.calYearGP)}</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-[#0EA5E9] text-white font-bold">
                    <td className="py-2" colSpan={4}>Total</td>
                    <td className="py-2 text-right text-[#0EA5E9]">{money(fRecRev)}</td>
                    <td className="py-2 text-right text-[#059669]">{money(fRecGP)}</td>
                    <td className="py-2"></td>
                    <td className="py-2 text-right text-[#059669]">{money(fTotalCalGP)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Non-Recurring Deals Table */}
          <section className={`${cardClass} report-page`}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-white">Non-Recurring Revenue — Closed Won</h2>
                <p className="text-xs text-[#5A7A95]">{fCwNR.length} project deals</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-[#5A7A95]">Total Revenue / GP</p>
                <p className="text-xl font-bold text-[#f59e0b]">{money(fNRRev)} <span className="text-[#059669]">/ {money(fNRGP)}</span></p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="text-[#5A7A95] border-b border-[#2A4A6F]">
                  <th className="text-left py-2">Customer</th>
                  <th className="text-left py-2">Rep</th>
                  <th className="text-left py-2">Description</th>
                  <th className="text-left py-2">Service</th>
                  <th className="text-right py-2">Revenue</th>
                  <th className="text-right py-2">Cost</th>
                  <th className="text-right py-2">GP</th>
                  <th className="text-center py-2">Billing Start</th>
                </tr></thead>
                <tbody>
                  {fCwNR.sort((a, b) => b.revenue - a.revenue).map((d, i) => (
                    <tr key={d.id + i} className="border-b border-[#2A4A6F]/30 text-white">
                      <td className="py-1.5 pr-2 font-medium">{d.customer}</td>
                      <td className="py-1.5 pr-2 text-[#5A7A95]">{d.owner}</td>
                      <td className="py-1.5 pr-2 text-[#5A7A95] truncate max-w-[180px]">{d.description}</td>
                      <td className="py-1.5 pr-2 text-[#5A7A95]">{d.serviceType}</td>
                      <td className="py-1.5 text-right text-[#f59e0b]">{money(d.revenue)}</td>
                      <td className="py-1.5 text-right text-[#ef4444]">{money(d.cost)}</td>
                      <td className="py-1.5 text-right text-[#059669]">{money(d.profit)}</td>
                      <td className="py-1.5 text-center text-[#5A7A95]">{d.billingStart || d.predictedMonth}</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-[#f59e0b] text-white font-bold">
                    <td className="py-2" colSpan={4}>Total</td>
                    <td className="py-2 text-right text-[#f59e0b]">{money(fNRRev)}</td>
                    <td className="py-2 text-right text-[#ef4444]">{money(fCwNR.reduce((s, d) => s + d.cost, 0))}</td>
                    <td className="py-2 text-right text-[#059669]">{money(fNRGP)}</td>
                    <td className="py-2"></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div ref={reportRef} className="space-y-6 pb-6">
        {/* Tab bar */}
        <div className="flex gap-2 flex-wrap items-center">
          <button className="px-4 py-2 rounded-lg text-sm font-medium bg-[#0EA5E9] text-white">Pipeline &amp; Forecast</button>
          <button onClick={() => setActiveTab('closedwon')} className="px-4 py-2 rounded-lg text-sm font-medium bg-[#1A334F] border border-[#2A4A6F] text-[#5A7A95] hover:text-white transition-colors">Closed Won Report</button>
          <button onClick={handleExportPDF} disabled={exporting} className="ml-auto px-4 py-2 rounded-lg text-sm font-medium bg-[#059669] hover:bg-[#059669]/80 text-white transition-colors disabled:opacity-50 flex items-center gap-2">
            {exporting ? (
              <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> Exporting...</>
            ) : (
              <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> Export PDF</>
            )}
          </button>
        </div>

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

        {/* Year-End Forecast Summary — from Figures tab */}
        {(() => {
          // CW Only scenario — computed from deal-level data using R78
          const cwOnlyRecGP = cwRecWithR78Cal.reduce((s, d) => s + d.r78.resultGP, 0);
          const cwOnlyNRGP = cwNonRecurring.reduce((s, d) => s + d.profit, 0);
          const cwOnlyTotalGP = cwOnlyRecGP + cwOnlyNRGP;
          const cwOnlyGrossProfit = cwOnlyTotalGP - totalCostTotal;
          const cwOnlyNetProfit = cwOnlyGrossProfit + (mdfTotal || 0);

          // Negotiating pipeline addition
          const negRecGP = negRecWithR78Cal.reduce((s, d) => s + d.r78.resultGP, 0);
          const negNRGP = negotiatingDeals.filter(d => d.dealType !== 'Recurring').reduce((s, d) => s + d.profit, 0);
          const negTotalGP = negRecGP + negNRGP;

          // Full forecast (CW + Negotiating) — from figures tab
          const fullTotalGP = totalGPTotal;
          const fullGrossProfit = grossProfitTotal;
          const fullNetProfit = netProfitTotal;

          const ScenarioCard = ({ label, borderColor, bgColor, textColor, gp, cost, gross, mdf, net }) => (
            <div className={`rounded-xl border-2 ${borderColor} ${bgColor} p-5`}>
              <p className={`text-sm font-bold ${textColor} mb-3`}>{label}</p>
              <div className="space-y-2">
                <div className="flex justify-between"><span className="text-xs text-[#A0B4C8]">Total GP</span><span className="text-sm font-bold text-[#0EA5E9]">{money(gp)}</span></div>
                <div className="flex justify-between"><span className="text-xs text-[#A0B4C8]">Total Costs</span><span className="text-sm font-bold text-[#ef4444]">{money(cost)}</span></div>
                <div className="border-t border-[#2A4A6F] pt-2 flex justify-between"><span className="text-xs text-[#A0B4C8]">Gross Profit</span><span className={`text-sm font-bold ${gross >= 0 ? 'text-[#059669]' : 'text-[#ef4444]'}`}>{money(gross)}</span></div>
                {mdf ? <div className="flex justify-between"><span className="text-xs text-[#A0B4C8]">MDF Offset</span><span className="text-sm font-bold text-[#8b5cf6]">+{money(mdf)}</span></div> : null}
                <div className="border-t border-[#2A4A6F] pt-2 flex justify-between"><span className="text-xs font-semibold text-[#A0B4C8]">Net Profit</span><span className={`text-sm font-bold ${net >= 0 ? 'text-[#059669]' : 'text-[#ef4444]'}`}>{money(net)}</span></div>
              </div>
            </div>
          );

          return (
        <section className={`${cardClass} report-page`}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-lg font-bold text-white">Year-End Forecast Summary</h2>
              <p className="text-xs text-[#5A7A95]">Two scenarios: confirmed Closed/Won position vs full forecast including Negotiating deals</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-[#5A7A95]">Forecast EBITDA (Full)</p>
              <p className={`text-2xl font-bold ${ebitdaTotal >= 0 ? 'text-[#059669]' : 'text-[#ef4444]'}`}>{money(ebitdaTotal)}</p>
            </div>
          </div>

          <div className={`rounded-lg bg-[#0D2338] border border-[#2A4A6F] p-3 mb-4`}>
            <p className="text-xs text-[#A0B4C8] leading-relaxed">
              <span className="font-semibold text-white">How this works:</span>{' '}
              <strong className="text-[#059669]">Closed/Won Only</strong> shows where we finish the year based solely on confirmed deals — recurring GP is weighted using Rule of 78 based on billing start dates, plus all non-recurring GP from closed projects.
              <strong className="text-[#0EA5E9]"> Full Forecast (CW + Negotiating)</strong> adds deals still in negotiation, matching the Business Plan figures sheet — this is the target position if all pipeline deals land.
              Costs (wages, NI, pensions, overheads) are fixed from the figures sheet and apply to both scenarios.
              The gap between the two scenarios shows the GP still at risk in the pipeline.
            </p>
          </div>

          {/* Side-by-side scenario cards */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 mb-4">
            <ScenarioCard
              label="✅ Closed/Won Only (Confirmed)"
              borderColor="border-[#059669]" bgColor="bg-[#059669]/5" textColor="text-[#059669]"
              gp={cwOnlyTotalGP} cost={totalCostTotal} gross={cwOnlyGrossProfit} mdf={mdfTotal} net={cwOnlyNetProfit}
            />
            <ScenarioCard
              label="📊 Full Forecast (CW + Negotiating)"
              borderColor="border-[#0EA5E9]" bgColor="bg-[#0EA5E9]/5" textColor="text-[#0EA5E9]"
              gp={fullTotalGP} cost={totalCostTotal} gross={fullGrossProfit} mdf={mdfTotal} net={fullNetProfit}
            />
            <div className="rounded-xl border-2 border-[#f59e0b] bg-[#f59e0b]/5 p-5">
              <p className="text-sm font-bold text-[#f59e0b] mb-3">⚠️ Pipeline Gap (At Risk)</p>
              <div className="space-y-2">
                <div className="flex justify-between"><span className="text-xs text-[#A0B4C8]">Negotiating GP</span><span className="text-sm font-bold text-[#f59e0b]">{money(negTotalGP)}</span></div>
                <div className="flex justify-between"><span className="text-xs text-[#A0B4C8]">Recurring (R78)</span><span className="text-sm font-bold text-[#0EA5E9]">{money(negRecGP)}</span></div>
                <div className="flex justify-between"><span className="text-xs text-[#A0B4C8]">Non-Recurring</span><span className="text-sm font-bold text-[#f59e0b]">{money(negNRGP)}</span></div>
                <div className="border-t border-[#2A4A6F] pt-2 flex justify-between"><span className="text-xs text-[#A0B4C8]">Deals in Negotiation</span><span className="text-sm font-bold text-white">{negotiatingCount}</span></div>
              </div>
            </div>
          </div>

          {/* GP breakdown detail */}
          <div className="overflow-x-auto mb-4">
            <table className="w-full text-xs">
              <thead><tr className="text-[#5A7A95] border-b border-[#2A4A6F]">
                <th className="text-left py-2">Metric</th>
                <th className="text-right py-2">Closed/Won Only</th>
                <th className="text-right py-2">+ Negotiating</th>
                <th className="text-right py-2">Full Forecast</th>
              </tr></thead>
              <tbody>
                <tr className="border-b border-[#2A4A6F]/30 text-white">
                  <td className="py-1.5">Recurring GP (R78 weighted)</td>
                  <td className="py-1.5 text-right text-[#059669] font-medium">{money(cwOnlyRecGP)}</td>
                  <td className="py-1.5 text-right text-[#f59e0b]">+{money(negRecGP)}</td>
                  <td className="py-1.5 text-right text-[#0EA5E9] font-medium">{money(cwOnlyRecGP + negRecGP)}</td>
                </tr>
                <tr className="border-b border-[#2A4A6F]/30 text-white">
                  <td className="py-1.5">Non-Recurring GP</td>
                  <td className="py-1.5 text-right text-[#059669] font-medium">{money(cwOnlyNRGP)}</td>
                  <td className="py-1.5 text-right text-[#f59e0b]">+{money(negNRGP)}</td>
                  <td className="py-1.5 text-right text-[#0EA5E9] font-medium">{money(cwOnlyNRGP + negNRGP)}</td>
                </tr>
                <tr className="border-b border-[#2A4A6F]/30 text-white font-bold">
                  <td className="py-1.5">Total GP</td>
                  <td className="py-1.5 text-right text-[#059669]">{money(cwOnlyTotalGP)}</td>
                  <td className="py-1.5 text-right text-[#f59e0b]">+{money(negTotalGP)}</td>
                  <td className="py-1.5 text-right text-[#0EA5E9]">{money(fullTotalGP)}</td>
                </tr>
                <tr className="border-b border-[#2A4A6F]/30 text-white">
                  <td className="py-1.5">Total Costs</td>
                  <td className="py-1.5 text-right text-[#ef4444]">{money(totalCostTotal)}</td>
                  <td className="py-1.5 text-right text-[#5A7A95]">—</td>
                  <td className="py-1.5 text-right text-[#ef4444]">{money(totalCostTotal)}</td>
                </tr>
                <tr className="border-t-2 border-[#0EA5E9] text-white font-bold">
                  <td className="py-2">Gross Profit</td>
                  <td className={`py-2 text-right ${cwOnlyGrossProfit >= 0 ? 'text-[#059669]' : 'text-[#ef4444]'}`}>{money(cwOnlyGrossProfit)}</td>
                  <td className="py-2 text-right text-[#f59e0b]">+{money(negTotalGP)}</td>
                  <td className={`py-2 text-right ${fullGrossProfit >= 0 ? 'text-[#059669]' : 'text-[#ef4444]'}`}>{money(fullGrossProfit)}</td>
                </tr>
                {mdfTotal ? <tr className="border-b border-[#2A4A6F]/30 text-white">
                  <td className="py-1.5">MDF Offset</td>
                  <td className="py-1.5 text-right text-[#8b5cf6]">+{money(mdfTotal)}</td>
                  <td className="py-1.5 text-right text-[#5A7A95]">—</td>
                  <td className="py-1.5 text-right text-[#8b5cf6]">+{money(mdfTotal)}</td>
                </tr> : null}
                <tr className="border-t-2 border-[#059669] text-white font-bold">
                  <td className="py-2">Net Profit</td>
                  <td className={`py-2 text-right ${cwOnlyNetProfit >= 0 ? 'text-[#059669]' : 'text-[#ef4444]'}`}>{money(cwOnlyNetProfit)}</td>
                  <td className="py-2 text-right text-[#f59e0b]">+{money(negTotalGP)}</td>
                  <td className={`py-2 text-right ${fullNetProfit >= 0 ? 'text-[#059669]' : 'text-[#ef4444]'}`}>{money(fullNetProfit)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Deal pipeline status */}
          <div className="border-t border-[#2A4A6F] pt-4">
            <h3 className="text-sm font-bold text-white mb-3">Deal Pipeline Status</h3>
            <p className="text-xs text-[#A0B4C8] mb-3">
              {closedWonCount} deals are confirmed Closed/Won, {negotiatingCount} are in negotiation. The gap between confirmed and full forecast is {money(negTotalGP)} GP still at risk.
            </p>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-lg border border-[#059669]/30 bg-[#059669]/5 p-3">
                <p className="text-[10px] text-[#059669] font-semibold uppercase tracking-wide">Closed / Won</p>
                <p className="text-lg font-bold text-white mt-1">{closedWonCount} deals</p>
                <p className="text-xs text-[#5A7A95]">GP: {money(closedWonDeals.reduce((s, d) => s + d.profit, 0))}/mo</p>
              </div>
              <div className="rounded-lg border border-[#f59e0b]/30 bg-[#f59e0b]/5 p-3">
                <p className="text-[10px] text-[#f59e0b] font-semibold uppercase tracking-wide">Negotiating</p>
                <p className="text-lg font-bold text-white mt-1">{negotiatingCount} deals</p>
                <p className="text-xs text-[#5A7A95]">GP: {money(negotiatingDeals.reduce((s, d) => s + d.profit, 0))}/mo</p>
              </div>
              <div className="rounded-lg border border-[#8b5cf6]/30 bg-[#8b5cf6]/5 p-3">
                <p className="text-[10px] text-[#8b5cf6] font-semibold uppercase tracking-wide">Quoting</p>
                <p className="text-lg font-bold text-white mt-1">{quotingCount} deals</p>
                <p className="text-xs text-[#5A7A95]">GP: {money(quotingDeals.reduce((s, d) => s + d.profit, 0))}/mo</p>
              </div>
              <div className="rounded-lg border border-[#5A7A95]/30 bg-[#5A7A95]/5 p-3">
                <p className="text-[10px] text-[#5A7A95] font-semibold uppercase tracking-wide">Early Stage</p>
                <p className="text-lg font-bold text-white mt-1">{earlyStageCount} deals</p>
                <p className="text-xs text-[#5A7A95]">GP: {money(earlyStageDeals.reduce((s, d) => s + d.profit, 0))}/mo</p>
              </div>
            </div>
          </div>

          {/* Monthly P&L table */}
          <div className="border-t border-[#2A4A6F] pt-4 mt-4">
            <h3 className="text-sm font-bold text-white mb-3">Monthly P&amp;L Forecast (Full — from Figures Sheet)</h3>
            <p className="text-xs text-[#A0B4C8] mb-3">Month-by-month breakdown from the Business Plan figures sheet showing how GP, costs and EBITDA build through the year. These figures include both CW and Negotiating deals as modelled in the spreadsheet.</p>
            <div className="overflow-x-auto">
              <table className="w-full text-[10px]">
                <thead><tr className="text-[#5A7A95] border-b border-[#2A4A6F]">
                  <th className="text-left py-1.5 sticky left-0 bg-[#1A334F] min-w-[70px]">Month</th>
                  <th className="text-right py-1.5 min-w-[65px]">Recurring GP</th>
                  <th className="text-right py-1.5 min-w-[65px]">Non-Rec GP</th>
                  <th className="text-right py-1.5 min-w-[65px]">Total GP</th>
                  <th className="text-right py-1.5 min-w-[65px]">Total Cost</th>
                  <th className="text-right py-1.5 min-w-[65px]">Net Profit</th>
                  <th className="text-right py-1.5 min-w-[65px]">EBITDA</th>
                  <th className="text-right py-1.5 min-w-[75px]">Cumulative</th>
                </tr></thead>
                <tbody>
                  {monthlyData.map((m, i) => (
                    <tr key={i} className="border-b border-[#2A4A6F]/20 text-white">
                      <td className="py-1 sticky left-0 bg-[#1A334F] font-medium">{m.month}</td>
                      <td className="py-1 text-right text-[#0EA5E9]">{money(m.recurringGP)}</td>
                      <td className="py-1 text-right text-[#f59e0b]">{money(m.nonRecurringGP)}</td>
                      <td className="py-1 text-right font-medium">{money(m.totalGP)}</td>
                      <td className="py-1 text-right text-[#ef4444]">{money(m.totalCost)}</td>
                      <td className={`py-1 text-right ${m.netProfit >= 0 ? 'text-[#059669]' : 'text-[#ef4444]'}`}>{money(m.netProfit)}</td>
                      <td className={`py-1 text-right ${m.ebitda >= 0 ? 'text-[#059669]' : 'text-[#ef4444]'}`}>{money(m.ebitda)}</td>
                      <td className={`py-1 text-right font-bold ${m.cumulativeEBITDA >= 0 ? 'text-[#059669]' : 'text-[#ef4444]'}`}>{money(m.cumulativeEBITDA)}</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-[#0EA5E9] text-white font-bold">
                    <td className="py-2 sticky left-0 bg-[#1A334F]">Year Total</td>
                    <td className="py-2 text-right text-[#0EA5E9]">{money(closedRecurringGP)}</td>
                    <td className="py-2 text-right text-[#f59e0b]">{money(closedNonRecurringGP)}</td>
                    <td className="py-2 text-right">{money(totalGPTotal)}</td>
                    <td className="py-2 text-right text-[#ef4444]">{money(totalCostTotal)}</td>
                    <td className={`py-2 text-right ${netProfitTotal >= 0 ? 'text-[#059669]' : 'text-[#ef4444]'}`}>{money(netProfitTotal)}</td>
                    <td className={`py-2 text-right ${ebitdaTotal >= 0 ? 'text-[#059669]' : 'text-[#ef4444]'}`}>{money(ebitdaTotal)}</td>
                    <td className={`py-2 text-right ${cumulativeEBITDAFinal >= 0 ? 'text-[#059669]' : 'text-[#ef4444]'}`}>{money(cumulativeEBITDAFinal)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>
          );
        })()}

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
