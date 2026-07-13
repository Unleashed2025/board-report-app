import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import Layout from '../components/Layout';
import { useData } from '../data/DataContext.jsx';
import { generateBoardPDF } from '../utils/generateBoardPDF.js';

const CORRECT_PASS = 'IamAseniorLeader!%!';
const SESSION_KEY = 'overview_auth';

const card = 'rounded-xl border border-[#2A4A6F] bg-[#1A334F] p-5';
const fmt = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 });
const money = (v) => fmt.format(v);

/* â”€â”€â”€ Date / FY helpers â”€â”€â”€ */

function parseMonth(label) {
  if (!label) return null;
  if (/^\d{4}-\d{2}/.test(label)) {
    const [y, m] = label.split('-').map(Number);
    return { month: m - 1, year: y };
  }
  const d = new Date(label);
  return isNaN(d.getTime()) ? null : { month: d.getMonth(), year: d.getFullYear() };
}

function getFY() {
  const now = new Date();
  const mi = now.getMonth();
  const yr = now.getFullYear();
  const start = mi >= 10 ? yr : yr - 1;
  return {
    start,
    newStart: start + 1,
    currentYM: yr * 12 + mi,
    label: `FY${String(start).slice(2)}/${String(start + 1).slice(2)}`,
    newLabel: `FY${String(start + 1).slice(2)}/${String(start + 2).slice(2)}`,
    endMonth: `Oct ${start + 1}`,
    newStartMonth: `Nov ${start + 1}`,
  };
}

function inFY(p, fyStart) {
  if (!p) return false;
  return (p.year === fyStart && p.month >= 10) || (p.year === fyStart + 1 && p.month <= 9);
}

function ymInt(p) { return p ? p.year * 12 + p.month : 0; }

function monthName(p) {
  if (!p) return '\u2013';
  const n = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${n[p.month]} ${p.year}`;
}

/* â”€â”€â”€ Deal summary helper â”€â”€â”€ */

function summarise(deals) {
  const rec = deals.filter(d => d.dealType === 'Recurring');
  const nr  = deals.filter(d => d.dealType !== 'Recurring');
  return {
    count: deals.length,
    recCount: rec.length,
    nrCount: nr.length,
    monthlyRev: rec.reduce((s, d) => s + d.revenue, 0),
    monthlyGP:  rec.reduce((s, d) => s + d.profit, 0),
    nrRev:      nr.reduce((s, d) => s + d.revenue, 0),
    nrGP:       nr.reduce((s, d) => s + d.profit, 0),
  };
}

/* â”€â”€â”€ Reusable sub-components â”€â”€â”€ */

function KPICards({ summary, accent = '#0EA5E9' }) {
  const items = [
    { label: 'Monthly Recurring Revenue', value: money(summary.monthlyRev), sub: `${summary.recCount} deal(s)` },
    { label: 'Monthly Recurring GP',      value: money(summary.monthlyGP) },
    { label: 'Non-Recurring Revenue',     value: money(summary.nrRev), sub: `${summary.nrCount} deal(s)` },
    { label: 'Non-Recurring GP',          value: money(summary.nrGP) },
  ];
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {items.map(i => (
        <div key={i.label} className={card}>
          <p className="text-[#5A7A95] text-xs mb-1">{i.label}</p>
          <p className="text-xl font-bold" style={{ color: accent }}>{i.value}</p>
          {i.sub && <p className="text-[#5A7A95] text-[10px] mt-1">{i.sub}</p>}
        </div>
      ))}
    </div>
  );
}

function DealTable({ deals, showStage = false }) {
  if (!deals.length) return <p className="text-[#5A7A95] text-sm italic mb-4">No deals in this category.</p>;
  return (
    <div className="overflow-x-auto mb-6">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[#5A7A95] text-xs border-b border-[#2A4A6F]">
            <th className="text-left py-2 pr-3">Customer</th>
            <th className="text-left py-2 pr-3">Owner</th>
            {showStage && <th className="text-left py-2 pr-3">Stage</th>}
            <th className="text-left py-2 pr-3">Type</th>
            <th className="text-left py-2 pr-3">Service</th>
            <th className="text-left py-2 pr-3">Description</th>
            <th className="text-left py-2 pr-3">Close Month</th>
            <th className="text-left py-2 pr-3">Billing Start</th>
            <th className="text-right py-2 pr-3">Revenue</th>
            <th className="text-right py-2">GP</th>
          </tr>
        </thead>
        <tbody>
          {deals.map(d => (
            <tr key={d.id} className="border-b border-[#2A4A6F]/40 text-white/90">
              <td className="py-2 pr-3 font-medium">{d.customer}</td>
              <td className="py-2 pr-3">{d.owner}</td>
              {showStage && (
                <td className="py-2 pr-3">
                  <span className="px-2 py-0.5 rounded text-xs bg-[#5A7A95]/20 text-[#5A7A95]">{d.stage}</span>
                </td>
              )}
              <td className="py-2 pr-3">
                <span className={`px-2 py-0.5 rounded text-xs ${d.dealType === 'Recurring' ? 'bg-[#0EA5E9]/15 text-[#0EA5E9]' : 'bg-amber-500/15 text-amber-400'}`}>
                  {d.dealType === 'Recurring' ? 'Recurring' : 'Non-Recurring'}
                </span>
              </td>
              <td className="py-2 pr-3 text-[#5A7A95]">{d.serviceType}</td>
              <td className="py-2 pr-3 text-[#5A7A95] text-xs max-w-[200px] truncate" title={d.description}>{d.description || '\u2013'}</td>
              <td className="py-2 pr-3">{monthName(parseMonth(d.predictedMonth))}</td>
              <td className="py-2 pr-3">{monthName(parseMonth(d.billingStart))}</td>
              <td className="py-2 pr-3 text-right font-mono">{money(d.revenue)}</td>
              <td className="py-2 text-right font-mono">{money(d.profit)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-[#2A4A6F] text-white font-semibold">
            <td colSpan={showStage ? 8 : 7} className="py-2 pr-3 text-right">Total</td>
            <td className="py-2 pr-3 text-right font-mono">{money(deals.reduce((s, d) => s + d.revenue, 0))}</td>
            <td className="py-2 text-right font-mono">{money(deals.reduce((s, d) => s + d.profit, 0))}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function SectionHeader({ title, subtitle, accent = '#0EA5E9' }) {
  return (
    <div className="flex items-center gap-3 mb-5 mt-10 first:mt-0">
      <div className="w-1.5 h-10 rounded-full" style={{ backgroundColor: accent }} />
      <div>
        <h2 className="text-xl font-bold text-white">{title}</h2>
        {subtitle && <p className="text-[#5A7A95] text-xs mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

function SubHeader({ children }) {
  return <h3 className="text-sm font-semibold text-[#BAE6FD] mb-3 mt-4">{children}</h3>;
}

function InsightCard({ children, accent = '#0EA5E9' }) {
  return (
    <div className={`${card} border-l-4 mb-6`} style={{ borderLeftColor: accent }}>
      {children}
    </div>
  );
}


export default function OverviewPage() {
  const [authenticated, setAuthenticated] = useState(() => sessionStorage.getItem(SESSION_KEY) === 'true');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { boardPlan, dataLoaded, updateFromExcel, lastUpdated, sourceFilename } = useData();
  const fileRef = useRef(null);

  const handleReupload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target.result, { type: 'array' });
      updateFromExcel(wb, file.name);
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

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

  if (!dataLoaded || !boardPlan) {
    return (
      <Layout>
        <div className="text-center py-20">
          <p className="text-[#5A7A95] text-lg">Upload your Board Business Plan workbook to view the dashboard.</p>
        </div>
      </Layout>
    );
  }

  /* ─── FY boundaries ─── */
  const fy = getFY();
  const allDeals = boardPlan.deals || [];
  const closedWon = allDeals.filter(d => d.stage === 'Closed-Won');
  const fyEndYM = (fy.start + 1) * 12 + 9; // Oct of FY end year

  // Enrich with parsed dates
  const enrich = (d) => ({ ...d, _bill: parseMonth(d.billingStart), _close: parseMonth(d.predictedMonth) });
  const cwEnriched = closedWon.map(enrich);

  /* ─── 1. Deals Closed This Month ─── */
  const closedThisMonth = cwEnriched.filter(d => d._close && d._close.year * 12 + d._close.month === fy.currentYM);

  /* ─── 2. Current FY Closed Won ─── */
  const cwClosedThisFY = cwEnriched.filter(d => inFY(d._close, fy.start));
  const cwBillingNow = cwEnriched.filter(d => d._bill && ymInt(d._bill) <= fy.currentYM);
  const cwDueThisFY = cwEnriched.filter(d => d._bill && ymInt(d._bill) > fy.currentYM && inFY(d._bill, fy.start));

  /* ─── 3. End of FY Position ─── */
  // All recurring CW deals that will be billing by end of Oct (current FY end)
  const endFYRecurring = cwEnriched.filter(d => d.dealType === 'Recurring' && d._bill && ymInt(d._bill) <= fyEndYM);
  // NR deals billing during current FY
  const endFYNR = cwEnriched.filter(d => d.dealType !== 'Recurring' && inFY(d._bill, fy.start));
  const endFYAll = [...endFYRecurring, ...endFYNR];
  const endFYSummary = summarise(endFYAll);
  const monthlyCosts = boardPlan.monthlyData?.[boardPlan.monthlyData.length - 1]?.totalCost || 0;

  // FY monthly breakdown (Nov-Oct order) for GP vs Costs table
  const fyMonthOrder = [10, 11, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9]; // Nov..Oct
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const fyMonthlyBreakdown = (() => {
    const md = boardPlan.monthlyData || [];
    return fyMonthOrder.map(mi => {
      const entry = md.find(m => {
        const p = parseMonth(m.month);
        return p && p.month === mi && inFY(p, fy.start);
      });
      return {
        label: `${monthNames[mi]} ${mi >= 10 ? fy.start : fy.start + 1}`,
        totalGP: entry?.totalGP || 0,
        recurringGP: entry?.recurringGP || 0,
        nonRecurringGP: entry?.nonRecurringGP || 0,
        totalCost: entry?.totalCost || 0,
        netProfit: entry?.netProfit || 0,
        ebitda: entry?.ebitda || 0,
      };
    });
  })();

  /* ─── 4. New FY Starting Position ─── */
  // Recurring base carrying forward (billing started by end of current FY)
  const newFYRecurringBase = cwEnriched.filter(d => d.dealType === 'Recurring' && d._bill && ymInt(d._bill) <= fyEndYM);
  // CW deals with billing starting in the new FY (both rec and NR)
  const newFYNewDeals = cwEnriched.filter(d => d._bill && inFY(d._bill, fy.newStart));
  const newFYBaseSummary = summarise(newFYRecurringBase);
  const newFYNewSummary = summarise(newFYNewDeals);

  /* ─── 5. Sales Forecast - Negotiation ─── */
  const negotiating = allDeals.filter(d => d.stage === 'Negotiating').map(enrich);
  const negCloseThisFY = negotiating.filter(d => inFY(d._close, fy.start));
  const negBillThisFY = negCloseThisFY.filter(d => inFY(d._bill, fy.start));
  const negBillNewFY = negCloseThisFY.filter(d => inFY(d._bill, fy.newStart));

  /* ─── 6. New FY Pipeline ─── */
  const pipelineStages = ['Negotiating', 'Quoting', 'Qualified', 'Lead', 'To Be Contacted'];
  const newFYPipeline = allDeals
    .filter(d => pipelineStages.includes(d.stage))
    .map(enrich)
    .filter(d => inFY(d._close, fy.newStart) || inFY(d._bill, fy.newStart));

  const nowLabel = monthName({ month: new Date().getMonth(), year: new Date().getFullYear() });

  return (
    <Layout>
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Board Sales Dashboard</h1>
          <p className="text-[#5A7A95] text-sm">{fy.label} &middot; Nov {fy.start} &ndash; Oct {fy.start + 1}</p>
          {lastUpdated && (
            <p className="text-[#5A7A95] text-[10px] mt-1">
              Data: {sourceFilename} &middot; Uploaded {lastUpdated.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleReupload} className="hidden" />
          <button
            onClick={() => fileRef.current?.click()}
            className="px-4 py-2.5 rounded-lg border border-[#2A4A6F] text-[#BAE6FD] text-sm font-medium hover:border-[#0EA5E9] transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Re-upload
          </button>
          <button
            onClick={() => generateBoardPDF(boardPlan)}
            className="px-5 py-2.5 rounded-lg bg-[#0EA5E9] text-white text-sm font-semibold hover:bg-[#0EA5E9]/90 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export PDF
          </button>
        </div>
      </div>

      {/* ── Top-level summary cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <div className={card}>
          <p className="text-[#5A7A95] text-xs mb-1">All Closed Won</p>
          <p className="text-2xl font-bold text-white">{closedWon.length}</p>
          <p className="text-[#5A7A95] text-[10px] mt-1">Total: {money(closedWon.reduce((s, d) => s + d.profit, 0))} GP</p>
        </div>
        <div className={card}>
          <p className="text-[#5A7A95] text-xs mb-1">Closed Won This FY</p>
          <p className="text-2xl font-bold text-[#059669]">{cwClosedThisFY.length}</p>
          <p className="text-[#5A7A95] text-[10px] mt-1">GP: {money(cwClosedThisFY.reduce((s, d) => s + d.profit, 0))}</p>
        </div>
        <div className={card}>
          <p className="text-[#5A7A95] text-xs mb-1">Currently Billing</p>
          <p className="text-2xl font-bold text-[#0EA5E9]">{cwBillingNow.length}</p>
          <p className="text-[#5A7A95] text-[10px] mt-1">Monthly GP: {money(summarise(cwBillingNow).monthlyGP)}</p>
        </div>
        <div className={card}>
          <p className="text-[#5A7A95] text-xs mb-1">Due to Start This FY</p>
          <p className="text-2xl font-bold text-[#f59e0b]">{cwDueThisFY.length}</p>
          <p className="text-[#5A7A95] text-[10px] mt-1">Monthly GP: {money(summarise(cwDueThisFY).monthlyGP)}</p>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════
          SECTION 1: DEALS CLOSED THIS MONTH
         ════════════════════════════════════════════════════════════ */}
      <SectionHeader
        title={`Deals Closed This Month \u2013 ${nowLabel}`}
        subtitle={`${closedThisMonth.length} deal(s) closed won this month`}
        accent="#0EA5E9"
      />
      <KPICards summary={summarise(closedThisMonth)} accent="#0EA5E9" />
      <DealTable deals={closedThisMonth} />

      {/* ════════════════════════════════════════════════════════════
          SECTION 2: CLOSED WON - CURRENT FY
         ════════════════════════════════════════════════════════════ */}
      <SectionHeader
        title={`Closed Won \u2013 ${fy.label}`}
        subtitle={`All closed won deals impacting the current financial year (Nov ${fy.start} \u2013 Oct ${fy.start + 1})`}
        accent="#059669"
      />
      <KPICards summary={summarise(cwClosedThisFY)} accent="#059669" />

      <SubHeader>Currently Billing ({cwBillingNow.length} deals)</SubHeader>
      <DealTable deals={cwBillingNow} />

      {cwDueThisFY.length > 0 && (
        <>
          <SubHeader>Due to Start Billing This FY ({cwDueThisFY.length} deals)</SubHeader>
          <DealTable deals={cwDueThisFY} />
        </>
      )}

      {/* ════════════════════════════════════════════════════════════
          SECTION 3: END OF FY POSITION
         ════════════════════════════════════════════════════════════ */}
      <SectionHeader
        title={`End of FY Position \u2013 ${fy.endMonth}`}
        subtitle="Projected position at the end of the current financial year"
        accent="#8b5cf6"
      />
      <KPICards summary={endFYSummary} accent="#8b5cf6" />
      <InsightCard accent="#8b5cf6">
        <p className="text-white font-semibold mb-2">Projected End of {fy.label}</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-[#5A7A95] text-xs">Monthly Recurring GP</p>
            <p className="text-white font-bold">{money(endFYSummary.monthlyGP)}</p>
          </div>
          <div>
            <p className="text-[#5A7A95] text-xs">Monthly Costs</p>
            <p className="text-white font-bold">{money(monthlyCosts)}</p>
          </div>
          <div>
            <p className="text-[#5A7A95] text-xs">Monthly Surplus / Gap</p>
            <p className={`font-bold ${endFYSummary.monthlyGP >= monthlyCosts ? 'text-[#059669]' : 'text-red-400'}`}>
              {money(endFYSummary.monthlyGP - monthlyCosts)}
            </p>
          </div>
          <div>
            <p className="text-[#5A7A95] text-xs">Total NR GP (This FY)</p>
            <p className="text-white font-bold">{money(endFYSummary.nrGP)}</p>
          </div>
        </div>
      </InsightCard>

      {/* Monthly GP vs Costs Breakdown */}
      <SubHeader>Monthly GP vs Costs \u2013 {fy.label}</SubHeader>
      <div className="overflow-x-auto mb-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[#5A7A95] text-xs border-b border-[#2A4A6F]">
              <th className="text-left py-2 pr-3">Month</th>
              <th className="text-right py-2 pr-3">Recurring GP</th>
              <th className="text-right py-2 pr-3">Non-Recurring GP</th>
              <th className="text-right py-2 pr-3">Total GP</th>
              <th className="text-right py-2 pr-3">Total Costs</th>
              <th className="text-right py-2 pr-3">Net Profit</th>
              <th className="text-right py-2">EBITDA</th>
            </tr>
          </thead>
          <tbody>
            {fyMonthlyBreakdown.map(m => {
              const surplus = m.totalGP - m.totalCost;
              return (
                <tr key={m.label} className="border-b border-[#2A4A6F]/40 text-white/90">
                  <td className="py-2 pr-3 font-medium">{m.label}</td>
                  <td className="py-2 pr-3 text-right font-mono text-[#0EA5E9]">{money(m.recurringGP)}</td>
                  <td className="py-2 pr-3 text-right font-mono text-amber-400">{money(m.nonRecurringGP)}</td>
                  <td className="py-2 pr-3 text-right font-mono">{money(m.totalGP)}</td>
                  <td className="py-2 pr-3 text-right font-mono text-red-400">{money(m.totalCost)}</td>
                  <td className={`py-2 pr-3 text-right font-mono ${m.netProfit >= 0 ? 'text-[#059669]' : 'text-red-400'}`}>{money(m.netProfit)}</td>
                  <td className={`py-2 text-right font-mono ${m.ebitda >= 0 ? 'text-[#059669]' : 'text-red-400'}`}>{money(m.ebitda)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-[#2A4A6F] text-white font-semibold">
              <td className="py-2 pr-3">FY Total</td>
              <td className="py-2 pr-3 text-right font-mono text-[#0EA5E9]">{money(fyMonthlyBreakdown.reduce((s, m) => s + m.recurringGP, 0))}</td>
              <td className="py-2 pr-3 text-right font-mono text-amber-400">{money(fyMonthlyBreakdown.reduce((s, m) => s + m.nonRecurringGP, 0))}</td>
              <td className="py-2 pr-3 text-right font-mono">{money(fyMonthlyBreakdown.reduce((s, m) => s + m.totalGP, 0))}</td>
              <td className="py-2 pr-3 text-right font-mono text-red-400">{money(fyMonthlyBreakdown.reduce((s, m) => s + m.totalCost, 0))}</td>
              <td className={`py-2 pr-3 text-right font-mono ${fyMonthlyBreakdown.reduce((s, m) => s + m.netProfit, 0) >= 0 ? 'text-[#059669]' : 'text-red-400'}`}>{money(fyMonthlyBreakdown.reduce((s, m) => s + m.netProfit, 0))}</td>
              <td className={`py-2 text-right font-mono ${fyMonthlyBreakdown.reduce((s, m) => s + m.ebitda, 0) >= 0 ? 'text-[#059669]' : 'text-red-400'}`}>{money(fyMonthlyBreakdown.reduce((s, m) => s + m.ebitda, 0))}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* ════════════════════════════════════════════════════════════
          SECTION 4: NEW FY STARTING POSITION
         ════════════════════════════════════════════════════════════ */}
      <SectionHeader
        title={`New FY Starting Position \u2013 ${fy.newStartMonth}`}
        subtitle={`What we carry into ${fy.newLabel} (Nov ${fy.newStart} \u2013 Oct ${fy.newStart + 1})`}
        accent="#f59e0b"
      />

      <InsightCard accent="#f59e0b">
        <p className="text-white font-semibold mb-2">Entering {fy.newLabel} with:</p>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-[#5A7A95] text-xs">Monthly Recurring Revenue (Carrying Forward)</p>
            <p className="text-[#f59e0b] font-bold text-lg">{money(newFYBaseSummary.monthlyRev)}</p>
            <p className="text-[#5A7A95] text-[10px]">{newFYBaseSummary.recCount} recurring deal(s)</p>
          </div>
          <div>
            <p className="text-[#5A7A95] text-xs">Monthly Recurring GP (Carrying Forward)</p>
            <p className="text-[#f59e0b] font-bold text-lg">{money(newFYBaseSummary.monthlyGP)}</p>
          </div>
          <div>
            <p className="text-[#5A7A95] text-xs">New Deals Starting in {fy.newLabel}</p>
            <p className="text-[#f59e0b] font-bold text-lg">{newFYNewDeals.length} deal(s)</p>
            <p className="text-[#5A7A95] text-[10px]">
              +{money(newFYNewSummary.monthlyRev)} monthly rev &middot; +{money(newFYNewSummary.nrRev)} NR rev
            </p>
          </div>
        </div>
      </InsightCard>

      {newFYNewDeals.length > 0 && (
        <>
          <SubHeader>Closed Won Deals Starting in New FY ({newFYNewDeals.length})</SubHeader>
          <KPICards summary={newFYNewSummary} accent="#f59e0b" />
          <DealTable deals={newFYNewDeals} />
        </>
      )}

      {/* ════════════════════════════════════════════════════════════
          SECTION 5: SALES FORECAST - NEGOTIATION
         ════════════════════════════════════════════════════════════ */}
      <SectionHeader
        title="Sales Forecast \u2013 Negotiation"
        subtitle={`${negCloseThisFY.length} deal(s) in negotiation expected to close this FY`}
        accent="#06b6d4"
      />
      <KPICards summary={summarise(negCloseThisFY)} accent="#06b6d4" />

      {negBillThisFY.length > 0 && (
        <>
          <SubHeader>Billing This FY ({negBillThisFY.length} deals)</SubHeader>
          <DealTable deals={negBillThisFY} />
        </>
      )}

      {negBillNewFY.length > 0 && (
        <>
          <SubHeader>Billing New FY ({negBillNewFY.length} deals)</SubHeader>
          <DealTable deals={negBillNewFY} />
        </>
      )}

      {negCloseThisFY.length === 0 && (
        <p className="text-[#5A7A95] text-sm italic mb-6">No negotiation deals expected to close this FY.</p>
      )}

      {/* ════════════════════════════════════════════════════════════
          SECTION 6: NEW FY PIPELINE
         ════════════════════════════════════════════════════════════ */}
      <SectionHeader
        title={`New FY Pipeline \u2013 ${fy.newLabel}`}
        subtitle="All pipeline deals targeting the new financial year"
        accent="#ef4444"
      />
      <KPICards summary={summarise(newFYPipeline)} accent="#ef4444" />

      {pipelineStages.map(stage => {
        const stageDeals = newFYPipeline.filter(d => d.stage === stage);
        if (!stageDeals.length) return null;
        const s = summarise(stageDeals);
        return (
          <div key={stage}>
            <SubHeader>
              {stage} ({stageDeals.length} deals) &middot; {money(s.monthlyGP)} monthly GP &middot; {money(s.nrGP)} NR GP
            </SubHeader>
            <DealTable deals={stageDeals} showStage={false} />
          </div>
        );
      })}

      {newFYPipeline.length === 0 && (
        <p className="text-[#5A7A95] text-sm italic mb-6">No pipeline deals targeting {fy.newLabel}.</p>
      )}

      {/* ── Footer ── */}
      <div className="border-t border-[#2A4A6F] mt-10 pt-6 text-center">
        <p className="text-[#5A7A95] text-xs">
          Unleashed Solutions Ltd &middot; Board Sales Dashboard &middot; FY runs November to October
        </p>
      </div>
    </Layout>
  );
}