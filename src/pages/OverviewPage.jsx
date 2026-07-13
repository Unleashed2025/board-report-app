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
  if (!p) return '-';
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
              <td className="py-2 pr-3 text-[#5A7A95] text-xs max-w-[200px] truncate" title={d.description}>{d.description || '-'}</td>
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
  // Only deals that actually BILL within this FY (not just closed this FY)
  const cwBillingNow = cwEnriched.filter(d => d._bill && ymInt(d._bill) <= fy.currentYM);
  const cwDueThisFY = cwEnriched.filter(d => d._bill && ymInt(d._bill) > fy.currentYM && inFY(d._bill, fy.start));
  const cwImpactingThisFY = [...cwBillingNow, ...cwDueThisFY];

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

  /* ─── End of FY combined (CW + Negotiation) ─── */
  // Negotiation deals that would be billing by end of FY (if closed)
  const negBillingByEndFY = negCloseThisFY.filter(d => d._bill && ymInt(d._bill) <= fyEndYM);
  const endFYWithNeg = [...endFYAll, ...negBillingByEndFY];
  const endFYWithNegSummary = summarise(endFYWithNeg);

  /* ─── New FY combined (CW + Neg already billing) ─── */
  // All recurring deals (CW + Neg) billing by end of current FY carry forward
  const negRecurringCarry = negCloseThisFY.filter(d => d.dealType === 'Recurring' && d._bill && ymInt(d._bill) <= fyEndYM);
  const newFYCombinedBase = [...newFYRecurringBase, ...negRecurringCarry];
  const newFYCombinedBaseSummary = summarise(newFYCombinedBase);
  // All deals (CW + Neg) starting billing in new FY
  const negBillingInNewFY = negCloseThisFY.filter(d => d._bill && inFY(d._bill, fy.newStart));
  const newFYAllNewDeals = [...newFYNewDeals, ...negBillingInNewFY];
  const newFYAllNewSummary = summarise(newFYAllNewDeals);

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
          <p className="text-[#5A7A95] text-xs mb-1">Billing This FY</p>
           <p className="text-2xl font-bold text-[#059669]">{cwImpactingThisFY.length}</p>
           <p className="text-[#5A7A95] text-[10px] mt-1">GP: {money(cwImpactingThisFY.reduce((s, d) => s + d.profit, 0))}</p>
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
          SECTION 1: ALL CLOSED WON (ALL TIME)
         ════════════════════════════════════════════════════════════ */}
      <SectionHeader
        title="All Closed Won Deals"
        subtitle={`${closedWon.length} deals closed won across all time periods  -  regardless of billing start date`}
        accent="#0EA5E9"
      />
      <p className="text-[#5A7A95] text-xs mb-4 -mt-2 italic">
        Total value of every deal we have closed. Includes deals billing now, later this FY, and into the next FY. This is our full closed pipeline.
      </p>
      <KPICards summary={summarise(cwEnriched)} accent="#0EA5E9" />
      <DealTable deals={cwEnriched} />

      {/* ════════════════════════════════════════════════════════════
          SECTION 2: DEALS CLOSED THIS MONTH
         ════════════════════════════════════════════════════════════ */}
      <SectionHeader
        title={`Deals Closed This Month - ${nowLabel}`}
        subtitle={`${closedThisMonth.length} deal(s) closed won this month`}
        accent="#0EA5E9"
      />
      <p className="text-[#5A7A95] text-xs mb-4 -mt-2 italic">
        New wins added this calendar month.
      </p>
      <KPICards summary={summarise(closedThisMonth)} accent="#0EA5E9" />
      <DealTable deals={closedThisMonth} />

      {/* ════════════════════════════════════════════════════════════
          SECTION 3: CLOSED WON - BILLING THIS FY
         ════════════════════════════════════════════════════════════ */}
      <SectionHeader
        title={`Closed Won - ${fy.label}`}
        subtitle={`Closed won deals with billing starting within this financial year (Nov ${fy.start} - Oct ${fy.start + 1})`}
        accent="#059669"
      />
      <p className="text-[#5A7A95] text-xs mb-4 -mt-2 italic">
        Only deals where billing has started or will start before end of {fy.label}. Deals closed but billing next FY are excluded here and shown in the New FY section.
      </p>
      <KPICards summary={summarise(cwImpactingThisFY)} accent="#059669" />

      <SubHeader>Currently Billing ({cwBillingNow.length} deals)</SubHeader>
      <DealTable deals={cwBillingNow} />

      {cwDueThisFY.length > 0 && (
        <>
          <SubHeader>Due to Start Billing This FY ({cwDueThisFY.length} deals)</SubHeader>
          <DealTable deals={cwDueThisFY} />
        </>
      )}

      {/* ════════════════════════════════════════════════════════════
          SECTION 4: NEGOTIATION - BILLING THIS FY
         ════════════════════════════════════════════════════════════ */}
      {negBillThisFY.length > 0 && (
        <>
          <SectionHeader
            title="Negotiation - Billing This FY"
            subtitle={`${negBillThisFY.length} deal(s) in negotiation expected to close and start billing before end of ${fy.label}`}
            accent="#06b6d4"
          />
          <p className="text-[#5A7A95] text-xs mb-4 -mt-2 italic">
            Deals currently being negotiated where we expect to close and begin billing within the current FY. If all close, this GP adds to our end-of-year position.
          </p>
          <KPICards summary={summarise(negBillThisFY)} accent="#06b6d4" />
          <DealTable deals={negBillThisFY} />
        </>
      )}

      {/* ════════════════════════════════════════════════════════════
          SECTION 5: END OF FY POSITION
         ════════════════════════════════════════════════════════════ */}
      <SectionHeader
        title={`End of FY Position - ${fy.endMonth}`}
        subtitle="Projected position at the end of the current financial year"
        accent="#8b5cf6"
      />
      <p className="text-[#5A7A95] text-xs mb-4 -mt-2 italic">
        Shows our monthly recurring GP vs monthly costs at the end of {fy.label}. First view uses confirmed (Closed Won) deals only. Second view adds negotiation deals assuming they all close &mdash; giving a best-case scenario.
      </p>

      {/* FY Profit / Loss highlight */}
      {(() => {
        const fyTotalGP = fyMonthlyBreakdown.reduce((s, m) => s + m.totalGP, 0);
        const fyTotalCost = fyMonthlyBreakdown.reduce((s, m) => s + m.totalCost, 0);
        const fyNetProfit = fyMonthlyBreakdown.reduce((s, m) => s + m.netProfit, 0);
        const fyEBITDA = fyMonthlyBreakdown.reduce((s, m) => s + m.ebitda, 0);
        const isProfit = fyNetProfit >= 0;
        return (
          <div className={`${card} mb-6 border-l-4 ${isProfit ? 'border-l-[#059669]' : 'border-l-red-400'}`}>
            <p className="text-white font-semibold mb-3">{fy.label} Full Year P&amp;L Summary</p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-[#5A7A95] text-xs">Total GP (Full Year)</p>
                <p className="text-white font-bold text-lg">{money(fyTotalGP)}</p>
              </div>
              <div>
                <p className="text-[#5A7A95] text-xs">Total Costs (Full Year)</p>
                <p className="text-red-400 font-bold text-lg">{money(fyTotalCost)}</p>
              </div>
              <div>
                <p className="text-[#5A7A95] text-xs">Net Profit / Loss</p>
                <p className={`font-bold text-xl ${isProfit ? 'text-[#059669]' : 'text-red-400'}`}>{money(fyNetProfit)}</p>
              </div>
              <div>
                <p className="text-[#5A7A95] text-xs">EBITDA (Full Year)</p>
                <p className={`font-bold text-lg ${fyEBITDA >= 0 ? 'text-[#059669]' : 'text-red-400'}`}>{money(fyEBITDA)}</p>
              </div>
            </div>
          </div>
        );
      })()}

      <SubHeader>Closed Won Only</SubHeader>
      <InsightCard accent="#8b5cf6">
        <p className="text-white font-semibold mb-2">End of {fy.label} (Closed Won)</p>
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

      <SubHeader>Closed Won + Negotiation (If All Close)</SubHeader>
      <InsightCard accent="#06b6d4">
        <p className="text-white font-semibold mb-2">End of {fy.label} (Closed Won + Negotiation)</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-[#5A7A95] text-xs">Monthly Recurring GP</p>
            <p className="text-[#06b6d4] font-bold">{money(endFYWithNegSummary.monthlyGP)}</p>
          </div>
          <div>
            <p className="text-[#5A7A95] text-xs">Monthly Costs</p>
            <p className="text-white font-bold">{money(monthlyCosts)}</p>
          </div>
          <div>
            <p className="text-[#5A7A95] text-xs">Monthly Surplus / Gap</p>
            <p className={`font-bold ${endFYWithNegSummary.monthlyGP >= monthlyCosts ? 'text-[#059669]' : 'text-red-400'}`}>
              {money(endFYWithNegSummary.monthlyGP - monthlyCosts)}
            </p>
          </div>
          <div>
            <p className="text-[#5A7A95] text-xs">Total NR GP (This FY)</p>
            <p className="text-[#06b6d4] font-bold">{money(endFYWithNegSummary.nrGP)}</p>
          </div>
        </div>
      </InsightCard>

      {/* Monthly GP vs Costs Breakdown */}
      <SubHeader>Monthly GP vs Costs - {fy.label}</SubHeader>
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
          SECTION 5: NEW FY POSITION
         ════════════════════════════════════════════════════════════ */}
      <SectionHeader
        title={`New FY Position - ${fy.newLabel}`}
        subtitle={`Nov ${fy.newStart} - Oct ${fy.newStart + 1}`}
        accent="#f59e0b"
      />
      <p className="text-[#5A7A95] text-xs mb-4 -mt-2 italic">
        Forward-looking view of the next financial year. Starts with deals already secured (closed this FY but billing next FY), then shows pipeline by stage, and finishes with a full financial forecast including planned new hire costs.
      </p>

      {/* 1. Already Secured - CW deals billing in new FY */}
      {newFYNewDeals.length > 0 && (
        <>
          <SubHeader>Already Secured (Closed Won - Billing New FY)</SubHeader>
          <InsightCard accent="#059669">
            <p className="text-[#5A7A95] text-xs mb-3">
              Deals already closed won with billing starting in {fy.newLabel} &mdash; cash coming in without closing new deals.
            </p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm mb-4">
              <div>
                <p className="text-[#5A7A95] text-xs">Monthly Recurring Revenue</p>
                <p className="text-[#059669] font-bold">{money(newFYNewSummary.monthlyRev)}</p>
              </div>
              <div>
                <p className="text-[#5A7A95] text-xs">Monthly Recurring GP</p>
                <p className="text-[#059669] font-bold">{money(newFYNewSummary.monthlyGP)}</p>
              </div>
              <div>
                <p className="text-[#5A7A95] text-xs">NR Revenue</p>
                <p className="text-[#059669] font-bold">{money(newFYNewSummary.nrRev)}</p>
              </div>
              <div>
                <p className="text-[#5A7A95] text-xs">NR GP</p>
                <p className="text-[#059669] font-bold">{money(newFYNewSummary.nrGP)}</p>
              </div>
            </div>
          </InsightCard>
          <DealTable deals={newFYNewDeals} />
        </>
      )}

      {/* 2-5. Pipeline by stage: Negotiating, Quoting, Qualified, Lead */}
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

      {newFYPipeline.length === 0 && newFYNewDeals.length === 0 && (
        <p className="text-[#5A7A95] text-sm italic mb-6">No deals targeting {fy.newLabel}.</p>
      )}

      {/* 6. New FY Financial Forecast - GP vs Costs */}
      {(() => {
        const allNewFYDeals = [...newFYNewDeals, ...newFYPipeline];
        const allNewFYSummary = summarise(allNewFYDeals);

        // R78 calculation: how many months each deal bills within the FY
        // FY runs Nov (newStart) to Oct (newStart+1). A deal billing from month X gets remaining months.
        const fyStartYM = fy.newStart * 12 + 10; // Nov of new FY start year
        const fyEndYMNew = (fy.newStart + 1) * 12 + 9; // Oct of new FY end year
        const calcR78Months = (deal) => {
          const bp = deal._bill || parseMonth(deal.billingStart);
          if (!bp) return 12; // assume full year if unknown
          const dealYM = bp.year * 12 + bp.month;
          if (dealYM <= fyStartYM) return 12; // already billing before FY start = full year
          const remaining = fyEndYMNew - dealYM + 1;
          return Math.max(0, Math.min(12, remaining));
        };

        // Recurring base (carrying forward) = full 12 months
        const baseR78GP = newFYCombinedBaseSummary.monthlyGP * 12;
        // New FY deals get R78-weighted months
        const newDealsR78GP = allNewFYDeals
          .filter(d => d.dealType === 'Recurring')
          .reduce((s, d) => s + d.profit * calcR78Months(d), 0);
        const totalRecR78GP = baseR78GP + newDealsR78GP;
        // NR GP (one-time, counted in full)
        const totalNewFYNRGP = allNewFYSummary.nrGP;
        // Total FY GP
        const totalFYGP = totalRecR78GP + totalNewFYNRGP;

        // New hire costs for new FY
        const newHires = (boardPlan.newHireCosts || []).filter(h => {
          const p = parseMonth(h.startMonth);
          return p && inFY(p, fy.newStart);
        });
        const newHireMonthlyCost = newHires.reduce((s, h) => s + h.totalMonthlyCost, 0);
        const newFYMonthlyCosts = monthlyCosts + newHireMonthlyCost;
        const totalFYCosts = newFYMonthlyCosts * 12;

        return (
          <>
            <SubHeader>New FY Financial Forecast - GP vs Costs</SubHeader>
            <InsightCard accent="#f59e0b">
              <p className="text-white font-semibold mb-3">{fy.newLabel} Forecast (R78-Weighted)</p>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 text-sm mb-4">
                <div>
                  <p className="text-[#5A7A95] text-xs">Recurring Base (12 months)</p>
                  <p className="text-white font-bold">{money(baseR78GP)}</p>
                  <p className="text-[#5A7A95] text-[10px]">{newFYCombinedBaseSummary.recCount} deal(s) × 12mo @ {money(newFYCombinedBaseSummary.monthlyGP)}/mo</p>
                </div>
                <div>
                  <p className="text-[#5A7A95] text-xs">New Deals Recurring (R78)</p>
                  <p className="text-[#f59e0b] font-bold">{money(newDealsR78GP)}</p>
                  <p className="text-[#5A7A95] text-[10px]">{allNewFYDeals.filter(d => d.dealType === 'Recurring').length} deal(s) weighted by billing start</p>
                </div>
                <div>
                  <p className="text-[#5A7A95] text-xs">NR GP (Project Work)</p>
                  <p className="text-amber-400 font-bold">{money(totalNewFYNRGP)}</p>
                </div>
              </div>
              <div className="border-t border-[#2A4A6F] pt-4 grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-[#5A7A95] text-xs">Total FY GP (Pipeline)</p>
                  <p className="text-[#f59e0b] font-bold text-lg">{money(totalFYGP)}</p>
                </div>
                <div>
                  <p className="text-[#5A7A95] text-xs">Total FY Costs</p>
                  <p className="text-red-400 font-bold text-lg">{money(totalFYCosts)}</p>
                  <p className="text-[#5A7A95] text-[10px]">{money(newFYMonthlyCosts)}/mo × 12</p>
                </div>
                <div>
                  <p className="text-[#5A7A95] text-xs">FY Net P&amp;L</p>
                  <p className={`font-bold text-lg ${totalFYGP >= totalFYCosts ? 'text-[#059669]' : 'text-red-400'}`}>
                    {money(totalFYGP - totalFYCosts)}
                  </p>
                </div>
              </div>
            </InsightCard>

            {/* New Hire Cost Breakdown */}
            {newHires.length > 0 && (
              <div className={`${card} mt-4 mb-6`}>
                <p className="text-white font-semibold mb-3 text-sm">Planned New Hires - {fy.newLabel}</p>
                <p className="text-[#5A7A95] text-[10px] mb-3">Employer NI calculated at 15% above £5,000 threshold. No car allowance.</p>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[#5A7A95] text-xs border-b border-[#2A4A6F]">
                      <th className="text-left py-2">Role</th>
                      <th className="text-right py-2">Annual Salary</th>
                      <th className="text-right py-2">Monthly Salary</th>
                      <th className="text-right py-2">Monthly NI</th>
                      <th className="text-right py-2">Total Monthly</th>
                      <th className="text-right py-2">Start</th>
                    </tr>
                  </thead>
                  <tbody>
                    {newHires.map((h, i) => (
                      <tr key={i} className="border-b border-[#2A4A6F]/40">
                        <td className="py-2 text-white">{h.name}</td>
                        <td className="py-2 text-right font-mono text-white">{money(h.annualSalary)}</td>
                        <td className="py-2 text-right font-mono text-white">{money(h.monthlySalary)}</td>
                        <td className="py-2 text-right font-mono text-amber-400">{money(h.monthlyNI)}</td>
                        <td className="py-2 text-right font-mono text-red-400">{money(h.totalMonthlyCost)}</td>
                        <td className="py-2 text-right text-[#5A7A95]">{h.startMonth}</td>
                      </tr>
                    ))}
                    <tr className="font-bold">
                      <td className="py-2 text-white">Total New Hire Cost</td>
                      <td></td>
                      <td></td>
                      <td></td>
                      <td className="py-2 text-right font-mono text-red-400">{money(newHireMonthlyCost)}/mo</td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* Progressive Waterfall: When Does the Shortfall Disappear? */}
            {(() => {
              // Build waterfall rows: costs → then layer in GP by stage
              const cwRecGP = newFYCombinedBaseSummary.monthlyGP;
              const cwNRGP = summarise(newFYNewDeals).nrGP;
              // Pipeline by stage for new FY
              const negDeals = newFYPipeline.filter(d => d.stage === 'Negotiating');
              const quotDeals = newFYPipeline.filter(d => d.stage === 'Quoting');
              const qualDeals = newFYPipeline.filter(d => ['Qualified', 'Lead', 'To Be Contacted'].includes(d.stage));
              const negS = summarise(negDeals);
              const quotS = summarise(quotDeals);
              const qualS = summarise(qualDeals);

              let running = 0;
              const rows = [];

              // Row 1: Current costs
              rows.push({ label: 'Current Monthly Costs', monthlyGP: 0, nrGP: 0, costDelta: monthlyCosts, runningCost: monthlyCosts, runningGP: 0, runningNR: 0 });
              // Row 2: + New hires
              if (newHireMonthlyCost > 0) {
                rows.push({ label: '+ Planned New Hires', monthlyGP: 0, nrGP: 0, costDelta: newHireMonthlyCost, runningCost: newFYMonthlyCosts, runningGP: 0, runningNR: 0 });
              }
              const totalCost = newFYMonthlyCosts;
              let gpRunning = 0;
              let nrRunning = 0;

              // Row 3: Closed Won recurring base
              gpRunning += cwRecGP;
              nrRunning += cwNRGP;
              rows.push({ label: 'Closed Won (Recurring Base)', monthlyGP: cwRecGP, nrGP: cwNRGP, costDelta: 0, runningCost: totalCost, runningGP: gpRunning, runningNR: nrRunning, deals: newFYRecurringBase.length + newFYNewDeals.length });

              // Row 4: + Negotiation
              if (negDeals.length > 0) {
                gpRunning += negS.monthlyGP;
                nrRunning += negS.nrGP;
                rows.push({ label: '+ Negotiating', monthlyGP: negS.monthlyGP, nrGP: negS.nrGP, costDelta: 0, runningCost: totalCost, runningGP: gpRunning, runningNR: nrRunning, deals: negDeals.length });
              }
              // Row 5: + Quoting
              if (quotDeals.length > 0) {
                gpRunning += quotS.monthlyGP;
                nrRunning += quotS.nrGP;
                rows.push({ label: '+ Quoting', monthlyGP: quotS.monthlyGP, nrGP: quotS.nrGP, costDelta: 0, runningCost: totalCost, runningGP: gpRunning, runningNR: nrRunning, deals: quotDeals.length });
              }
              // Row 6: + Qualified / Lead
              if (qualDeals.length > 0) {
                gpRunning += qualS.monthlyGP;
                nrRunning += qualS.nrGP;
                rows.push({ label: '+ Qualified / Lead', monthlyGP: qualS.monthlyGP, nrGP: qualS.nrGP, costDelta: 0, runningCost: totalCost, runningGP: gpRunning, runningNR: nrRunning, deals: qualDeals.length });
              }

              let crossedAt = null;
              for (const r of rows) {
                if (r.runningGP >= r.runningCost && r.runningGP > 0 && !crossedAt) crossedAt = r.label;
              }

              return (
                <div className={`${card} mt-4 mb-6`}>
                  <p className="text-white font-semibold mb-1 text-sm">When Does the Shortfall Disappear?</p>
                  <p className="text-[#5A7A95] text-[10px] mb-3">
                    Progressive view: monthly costs with new hires vs cumulative GP as each pipeline stage is layered in.
                  </p>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-[#5A7A95] text-xs border-b border-[#2A4A6F]">
                        <th className="text-left py-2">Stage</th>
                        <th className="text-right py-2">Deals</th>
                        <th className="text-right py-2">Monthly GP</th>
                        <th className="text-right py-2">NR GP</th>
                        <th className="text-right py-2">Running GP</th>
                        <th className="text-right py-2">Monthly Costs</th>
                        <th className="text-right py-2">Surplus / Gap</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r, i) => {
                        const gap = r.runningGP - r.runningCost;
                        const isPositive = gap >= 0 && r.runningGP > 0;
                        const isCostRow = r.costDelta > 0 && r.monthlyGP === 0;
                        return (
                          <tr key={i} className={`border-b border-[#2A4A6F]/40 ${isPositive ? 'bg-[#059669]/10' : ''}`}>
                            <td className="py-2 text-white font-medium">{r.label}</td>
                            <td className="py-2 text-right font-mono text-[#5A7A95]">{r.deals || '-'}</td>
                            <td className="py-2 text-right font-mono">
                              {isCostRow ? <span className="text-[#5A7A95]">-</span> : <span className="text-[#059669]">{money(r.monthlyGP)}</span>}
                            </td>
                            <td className="py-2 text-right font-mono">
                              {r.nrGP > 0 ? <span className="text-amber-400">{money(r.nrGP)}</span> : <span className="text-[#5A7A95]">-</span>}
                            </td>
                            <td className="py-2 text-right font-mono text-white font-bold">{r.runningGP > 0 ? money(r.runningGP) : '-'}</td>
                            <td className="py-2 text-right font-mono text-red-400">{money(r.runningCost)}</td>
                            <td className={`py-2 text-right font-mono font-bold ${isPositive ? 'text-[#059669]' : r.runningGP > 0 ? 'text-red-400' : 'text-[#5A7A95]'}`}>
                              {r.runningGP > 0 ? money(gap) : '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {crossedAt && (
                    <p className="text-[#059669] text-xs mt-3 font-semibold">
                      ✓ Monthly GP covers costs at: {crossedAt}
                    </p>
                  )}
                  {!crossedAt && gpRunning > 0 && (
                    <p className="text-red-400 text-xs mt-3 font-semibold">
                      ✗ Monthly recurring GP does not cover costs even with full pipeline. NR project revenue of {money(nrRunning)} helps offset &mdash; see annual view above.
                    </p>
                  )}
                </div>
              );
            })()}

            {/* Month-by-Month New FY Forecast with New Hire GP */}
            {(() => {
              // Build month-by-month: Nov 26 to Oct 27
              const fyMonths = [];
              for (let m = 0; m < 12; m++) {
                const mi = (10 + m) % 12; // Nov=10, Dec=11, Jan=0...Oct=9
                const yr = mi >= 10 ? fy.newStart : fy.newStart + 1;
                fyMonths.push({ mi, yr, label: `${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][mi]} ${yr}` });
              }

              // All pipeline deals for new FY: CW + Negotiating + Quoting + Qualified/Lead
              const allPipelineDeals = [...newFYNewDeals, ...newFYPipeline];
              // Base recurring GP (existing deals already billing, carry forward every month)
              const baseRecGP = newFYCombinedBaseSummary.monthlyGP;

              // For each deal, determine which FY month index it starts billing
              const dealsByFYMonthIdx = allPipelineDeals.map(d => {
                const bp = d._bill || parseMonth(d.billingStart);
                if (!bp) return { ...d, fyIdx: 0 }; // assume Nov start if unknown
                // Convert to FY month index: Nov=0, Dec=1, Jan=2 ... Oct=11
                const dealMI = bp.month; // 0=Jan...11=Dec
                const dealYr = bp.year;
                // FY starts Nov of fy.newStart
                let fyIdx;
                if (dealMI >= 10) { // Nov or Dec
                  fyIdx = dealMI - 10 + (dealYr === fy.newStart ? 0 : 12);
                } else { // Jan-Oct
                  fyIdx = dealMI + 2 + (dealYr === fy.newStart + 1 ? 0 : (dealYr > fy.newStart + 1 ? 12 : -12));
                }
                fyIdx = Math.max(0, Math.min(11, fyIdx));
                return { ...d, fyIdx };
              });

              const monthRows = fyMonths.map((fm, idx) => {
                // Pipeline deals: recurring GP from deals billing on or before this month
                const activeDeals = dealsByFYMonthIdx.filter(d => d.fyIdx <= idx);
                const pipelineRecGP = activeDeals
                  .filter(d => d.dealType === 'Recurring')
                  .reduce((s, d) => s + d.profit, 0);
                // NR GP: one-time in the month the deal starts billing
                const pipelineNRGP = dealsByFYMonthIdx
                  .filter(d => d.fyIdx === idx && d.dealType !== 'Recurring')
                  .reduce((s, d) => s + d.profit, 0);

                const totalMonthlyGP = baseRecGP + pipelineRecGP;
                const totalMonthlyWithNR = totalMonthlyGP + pipelineNRGP;

                return {
                  ...fm,
                  baseRecGP,
                  pipelineRecGP,
                  pipelineNRGP,
                  totalMonthlyGP,
                  totalMonthlyWithNR,
                };
              });

              const newFYMonthlyCostsLocal = monthlyCosts + newHires.reduce((s, h) => s + h.totalMonthlyCost, 0);

              const monthTable = (
                <div className={`${card} mt-4 mb-6`}>
                  <p className="text-white font-semibold mb-1 text-sm">{fy.newLabel} Monthly Forecast (All Pipeline Deals)</p>
                  <p className="text-[#5A7A95] text-[10px] mb-3">
                    Base recurring + pipeline deals (CW, Negotiation, Quoting, Qualified/Lead) layered in by billing start month. Costs include all planned new hires.
                  </p>
                  <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-[#5A7A95] text-xs border-b border-[#2A4A6F]">
                        <th className="text-left py-1">Month</th>
                        <th className="text-right py-1">Base Rec</th>
                        <th className="text-right py-1">Pipeline Rec</th>
                        <th className="text-right py-1">Pipeline NR</th>
                        <th className="text-right py-1">Total GP</th>
                        <th className="text-right py-1">Costs</th>
                        <th className="text-right py-1">Net</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthRows.map((mr, i) => {
                        const net = mr.totalMonthlyWithNR - newFYMonthlyCostsLocal;
                        return (
                          <tr key={i} className={`border-b border-[#2A4A6F]/40 ${net >= 0 ? 'bg-[#059669]/10' : ''}`}>
                            <td className="py-1 text-white text-xs">{mr.label}</td>
                            <td className="py-1 text-right font-mono text-xs text-[#0EA5E9]">{money(mr.baseRecGP)}</td>
                            <td className="py-1 text-right font-mono text-xs text-[#f59e0b]">{mr.pipelineRecGP > 0 ? money(mr.pipelineRecGP) : '-'}</td>
                            <td className="py-1 text-right font-mono text-xs text-amber-400">{mr.pipelineNRGP > 0 ? money(mr.pipelineNRGP) : '-'}</td>
                            <td className="py-1 text-right font-mono text-xs text-white font-bold">{money(mr.totalMonthlyWithNR)}</td>
                            <td className="py-1 text-right font-mono text-xs text-red-400">{money(newFYMonthlyCostsLocal)}</td>
                            <td className={`py-1 text-right font-mono text-xs font-bold ${net >= 0 ? 'text-[#059669]' : 'text-red-400'}`}>{money(net)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-[#2A4A6F] text-white font-semibold text-xs">
                        <td className="py-2">FY Total</td>
                        <td className="py-2 text-right font-mono text-[#0EA5E9]">{money(monthRows.reduce((s, m) => s + m.baseRecGP, 0))}</td>
                        <td className="py-2 text-right font-mono text-[#f59e0b]">{money(monthRows.reduce((s, m) => s + m.pipelineRecGP, 0))}</td>
                        <td className="py-2 text-right font-mono text-amber-400">{money(monthRows.reduce((s, m) => s + m.pipelineNRGP, 0))}</td>
                        <td className="py-2 text-right font-mono">{money(monthRows.reduce((s, m) => s + m.totalMonthlyWithNR, 0))}</td>
                        <td className="py-2 text-right font-mono text-red-400">{money(newFYMonthlyCostsLocal * 12)}</td>
                        <td className={`py-2 text-right font-mono font-bold ${monthRows.reduce((s, m) => s + m.totalMonthlyWithNR, 0) - newFYMonthlyCostsLocal * 12 >= 0 ? 'text-[#059669]' : 'text-red-400'}`}>
                          {money(monthRows.reduce((s, m) => s + m.totalMonthlyWithNR, 0) - newFYMonthlyCostsLocal * 12)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                  </div>
                  {(() => {
                    const breakEvenMonth = monthRows.find(mr => mr.totalMonthlyWithNR >= newFYMonthlyCostsLocal);
                    return breakEvenMonth ? (
                      <p className="text-[#059669] text-xs mt-3 font-semibold">
                        ✓ Monthly GP exceeds costs from: {breakEvenMonth.label}
                      </p>
                    ) : (
                      <p className="text-red-400 text-xs mt-3 font-semibold">
                        ✗ Monthly GP does not exceed costs within the FY
                      </p>
                    );
                  })()}
                </div>
              );

              const lastMonth = monthRows[monthRows.length - 1];
              const endOfFYMonthlyGP = lastMonth.totalMonthlyGP;
              const endOfFYMonthlyWithNR = lastMonth.totalMonthlyWithNR;
              const totalFYGPEarned = monthRows.reduce((s, m) => s + m.totalMonthlyWithNR, 0);
              const totalFYCostsAll = newFYMonthlyCostsLocal * 12;
              const fyNetPL = totalFYGPEarned - totalFYCostsAll;
              const endOfFYSurplus = endOfFYMonthlyWithNR - newFYMonthlyCostsLocal;
              const totalNRContrib = monthRows.reduce((s, m) => s + m.pipelineNRGP, 0) + totalNewFYNRGP;

              const summaryCard = (
                <div className={`${card} mt-6 mb-6 border-l-4 ${fyNetPL >= 0 ? 'border-l-[#059669]' : 'border-l-red-400'}`}>
                  <p className="text-white font-semibold mb-1 text-sm">📊 End of {fy.newLabel} Summary</p>
                  <p className="text-[#5A7A95] text-[10px] mb-4 italic">
                    Full FY position: total GP earned (recurring R78 + NR) vs total costs over 12 months. Shows profit/loss and the monthly run-rate we carry into the following FY.
                  </p>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm mb-4">
                    <div className="text-center">
                      <p className="text-[#5A7A95] text-xs mb-1">Total FY GP Earned</p>
                      <p className="text-[#f59e0b] font-bold text-xl">{money(totalFYGPEarned)}</p>
                      <p className="text-[#5A7A95] text-[10px]">Recurring (R78) + NR over 12 months</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[#5A7A95] text-xs mb-1">Total FY Costs</p>
                      <p className="text-red-400 font-bold text-xl">{money(totalFYCostsAll)}</p>
                      <p className="text-[#5A7A95] text-[10px]">{money(newFYMonthlyCostsLocal)}/mo × 12</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[#5A7A95] text-xs mb-1">FY Net Profit / Loss</p>
                      <p className={`font-bold text-xl ${fyNetPL >= 0 ? 'text-[#059669]' : 'text-red-400'}`}>
                        {money(fyNetPL)}
                      </p>
                      <p className="text-[#5A7A95] text-[10px]">{fyNetPL >= 0 ? '✓ Profitable' : '✗ Loss-making'}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[#5A7A95] text-xs mb-1">NR GP Contribution</p>
                      <p className="text-amber-400 font-bold text-xl">{money(totalNRContrib)}</p>
                      <p className="text-[#5A7A95] text-[10px]">Project NR GP</p>
                    </div>
                  </div>

                  <div className="border-t border-[#2A4A6F] pt-4">
                    <p className="text-white font-semibold text-xs mb-3">Run-Rate Entering Next FY ({`Nov ${fy.newStart + 1}`})</p>
                    <p className="text-[#5A7A95] text-[10px] mb-3 italic">
                      The monthly recurring figures we carry forward. This becomes the baseline for the following year.
                    </p>
                    <div className="grid grid-cols-3 gap-6 text-sm">
                      <div className="text-center">
                        <p className="text-[#5A7A95] text-xs mb-1">Monthly Recurring GP</p>
                        <p className="text-[#059669] font-bold text-lg">{money(endOfFYMonthlyGP)}</p>
                        <p className="text-[#5A7A95] text-[10px]">Base + pipeline recurring GP</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[#5A7A95] text-xs mb-1">Monthly Costs</p>
                        <p className="text-red-400 font-bold text-lg">{money(newFYMonthlyCostsLocal)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[#5A7A95] text-xs mb-1">Monthly Surplus / Gap</p>
                        <p className={`font-bold text-lg ${endOfFYSurplus >= 0 ? 'text-[#059669]' : 'text-red-400'}`}>
                          {money(endOfFYSurplus)}
                        </p>
                        <p className="text-[#5A7A95] text-[10px]">{endOfFYSurplus >= 0 ? 'Covering costs from recurring alone' : 'NR projects still needed to cover gap'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );

              // Dec cashflow note (c.£90k engineering GP landing in Dec)
              const decNRGP = monthRows.find(m => m.mi === 11); // Dec
              const decCashflow = decNRGP ? decNRGP.pipelineNRGP : 90000;
              const monthsOfCoverage = newFYMonthlyCostsLocal > 0 ? Math.floor(decCashflow / newFYMonthlyCostsLocal) : 0;

              const cashflowNote = decCashflow > 50000 ? (
                <div className={`${card} mt-4 mb-6 border-l-4 border-l-[#0EA5E9]`}>
                  <p className="text-white font-semibold text-sm mb-2">Cashflow Note - December {fy.newStart}</p>
                  <p className="text-[#5A7A95] text-xs">
                    Circa <span className="text-[#0EA5E9] font-bold">{money(decCashflow)}</span> of non-recurring project GP lands in December,
                    which covers the cost vs GP gap for approximately <span className="text-[#0EA5E9] font-bold">{monthsOfCoverage} months</span> of
                    operating costs ({money(newFYMonthlyCostsLocal)}/mo). This provides a significant cash buffer while recurring revenue builds through the new FY.
                  </p>
                </div>
              ) : null;

              return <>{monthTable}{summaryCard}{cashflowNote}</>;
            })()}
          </>
        );
      })()}

      {/* ── Footer ── */}
      <div className="border-t border-[#2A4A6F] mt-10 pt-6 text-center">
        <p className="text-[#5A7A95] text-xs">
          Unleashed Solutions Ltd &middot; Board Sales Dashboard &middot; FY runs November to October
        </p>
      </div>
    </Layout>
  );
}