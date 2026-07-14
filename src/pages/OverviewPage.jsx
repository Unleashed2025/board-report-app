import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import Layout from '../components/Layout';
import { useData } from '../data/DataContext.jsx';
import { generateBoardPDF } from '../utils/generateBoardPDF.js';

const CORRECT_PASS = 'IamAseniorLeader!%!';
const SESSION_KEY = 'overview_auth';

const card = 'rounded-xl border border-[#2A4A6F] bg-[#1A334F] p-5';
const fmt = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 });
const money = (v) => fmt.format(v);
const TAB_CURRENT = 'current';
const TAB_NEW = 'new';

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

function DealTable({ deals, showStage = false, fyStart }) {
  if (!deals.length) return <p className="text-[#5A7A95] text-sm italic mb-4">No deals in this category.</p>;

  // R78 calculation: months a deal bills within the FY (Nov fyStart - Oct fyStart+1)
  const calcR78 = (d) => {
    if (!fyStart || d.dealType !== 'Recurring') return null;
    const bp = parseMonth(d.billingStart);
    if (!bp) return { months: 12, value: d.profit * 12 };
    const fyStartYM = fyStart * 12 + 10; // Nov
    const fyEndYM = (fyStart + 1) * 12 + 9; // Oct
    const dealYM = bp.year * 12 + bp.month;
    if (dealYM <= fyStartYM) return { months: 12, value: d.profit * 12 };
    const remaining = fyEndYM - dealYM + 1;
    const months = Math.max(0, Math.min(12, remaining));
    return { months, value: d.profit * months };
  };

  const showR78 = !!fyStart;
  const totalR78 = showR78 ? deals.reduce((s, d) => { const r = calcR78(d); return s + (r ? r.value : (d.dealType !== 'Recurring' ? d.profit : 0)); }, 0) : 0;

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
            <th className="text-right py-2 pr-3">GP/mo</th>
            {showR78 && <th className="text-right py-2 pr-3 text-[#f59e0b]">FY Months</th>}
            {showR78 && <th className="text-right py-2 text-[#f59e0b]">FY Contribution</th>}
          </tr>
        </thead>
        <tbody>
          {deals.map(d => {
            const r78 = calcR78(d);
            return (
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
              <td className="py-2 pr-3 text-right font-mono">{money(d.profit)}</td>
              {showR78 && <td className="py-2 pr-3 text-right font-mono text-[#f59e0b]">{r78 ? `${r78.months}/12` : '-'}</td>}
              {showR78 && <td className="py-2 text-right font-mono text-[#f59e0b] font-semibold">{r78 ? money(r78.value) : money(d.profit)}</td>}
            </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t border-[#2A4A6F] text-white font-semibold">
            <td colSpan={showStage ? 8 : 7} className="py-2 pr-3 text-right">Total</td>
            <td className="py-2 pr-3 text-right font-mono">{money(deals.reduce((s, d) => s + d.revenue, 0))}</td>
            <td className="py-2 pr-3 text-right font-mono">{money(deals.reduce((s, d) => s + d.profit, 0))}</td>
            {showR78 && <td className="py-2 pr-3 text-right font-mono text-[#f59e0b]"></td>}
            {showR78 && <td className="py-2 text-right font-mono text-[#f59e0b] font-bold">{money(totalR78)}</td>}
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
  const [activeTab, setActiveTab] = useState(TAB_CURRENT);
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

  // Password protection removed

  if (!dataLoaded || !boardPlan) {
    return (
      <Layout>
        <div className="text-center py-20">
          <p className="text-[#5A7A95] text-lg mb-4">Upload your Board Business Plan workbook to view the dashboard.</p>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleReupload} className="hidden" />
          <button
            onClick={() => fileRef.current?.click()}
            className="px-6 py-3 rounded-lg bg-[#0EA5E9] text-white text-sm font-semibold hover:bg-[#0EA5E9]/90 transition-colors"
          >
            Upload Excel File
          </button>
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
  // Monthly costs - use cost for the last month of current FY (Oct), not the last month in the spreadsheet
  const currentFYEndCost = (() => {
    const md = boardPlan.monthlyData || [];
    // Find Oct of current FY end year (fy.start + 1)
    const octEntry = md.find(m => {
      const p = parseMonth(m.month);
      return p && p.month === 9 && p.year === fy.start + 1; // Oct = month 9
    });
    return octEntry ? octEntry.totalCost : (md[md.length - 1]?.totalCost || 0);
  })();
  const monthlyCosts = currentFYEndCost;

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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Board Sales Dashboard</h1>
          <p className="text-[#5A7A95] text-sm">
            {activeTab === TAB_CURRENT ? `${fy.label} - Nov ${fy.start} to Oct ${fy.start + 1}` : `${fy.newLabel} - Nov ${fy.newStart} to Oct ${fy.newStart + 1}`}
          </p>
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

      {/* ── FY Tab Switcher ── */}
      <div className="flex gap-2 mb-8 border-b border-[#2A4A6F] pb-3">
        <button
          onClick={() => setActiveTab(TAB_CURRENT)}
          className={`px-5 py-2 text-sm font-semibold rounded-lg transition-colors ${activeTab === TAB_CURRENT ? 'bg-[#0EA5E9]/10 text-[#0EA5E9] border border-[#0EA5E9]' : 'text-[#5A7A95] hover:text-white border border-transparent'}`}
        >
          Current FY ({fy.label})
        </button>
        <button
          onClick={() => setActiveTab(TAB_NEW)}
          className={`px-5 py-2 text-sm font-semibold rounded-lg transition-colors ${activeTab === TAB_NEW ? 'bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]' : 'text-[#5A7A95] hover:text-white border border-transparent'}`}
        >
          New FY ({fy.newLabel})
        </button>
      </div>

      {/* ════════════════════════════════════════════════════════════════
          CURRENT FY TAB
         ════════════════════════════════════════════════════════════════ */}
      {activeTab === TAB_CURRENT && (<>

      {/* ── Top-level summary cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <div className={card}>
          <p className="text-[#5A7A95] text-xs mb-1">Closed Won (Billing This FY)</p>
          <p className="text-2xl font-bold text-white">{cwImpactingThisFY.length}</p>
          <p className="text-[#5A7A95] text-[10px] mt-1">GP: {money(summarise(cwImpactingThisFY).monthlyGP)}/mo + {money(summarise(cwImpactingThisFY).nrGP)} NR</p>
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
        <div className={card}>
          <p className="text-[#5A7A95] text-xs mb-1">Monthly Costs</p>
          <p className="text-2xl font-bold text-red-400">{money(monthlyCosts)}</p>
          <p className="text-[#5A7A95] text-[10px] mt-1">End of FY rate (Oct {fy.start + 1})</p>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════
          SECTION 1: ALL CLOSED WON (BILLING THIS FY)
         ════════════════════════════════════════════════════════════ */}
      <SectionHeader
        title={`All Closed Won - ${fy.label}`}
        subtitle={`${cwImpactingThisFY.length} deals billing within this financial year`}
        accent="#0EA5E9"
      />
      <p className="text-[#5A7A95] text-xs mb-4 -mt-2 italic">
        Only deals that are currently billing or will start billing before end of {fy.label}. Deals closed but billing next FY are excluded.
      </p>
      <KPICards summary={summarise(cwImpactingThisFY)} accent="#0EA5E9" />
      <DealTable deals={cwImpactingThisFY} fyStart={fy.start} />

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
      <DealTable deals={cwBillingNow} fyStart={fy.start} />

      {cwDueThisFY.length > 0 && (
        <>
          <SubHeader>Due to Start Billing This FY ({cwDueThisFY.length} deals)</SubHeader>
          <DealTable deals={cwDueThisFY} fyStart={fy.start} />
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
          <DealTable deals={negBillThisFY} fyStart={fy.start} />
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

      </>)}

      {/* ════════════════════════════════════════════════════════════════
          NEW FY TAB
         ════════════════════════════════════════════════════════════════ */}
      {activeTab === TAB_NEW && (<>

      {/* ── Starting Position (carried from end of Current FY) ── */}
      <div className={`${card} mb-8 border-l-4 border-l-[#f59e0b]`}>
        <p className="text-white font-semibold mb-3">Starting Position - Carried from {fy.label}</p>
        <p className="text-[#5A7A95] text-xs mb-4 italic">
          Monthly recurring GP and costs at the end of {fy.label} (Oct {fy.start + 1}) that carry forward into {fy.newLabel}.
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-[#5A7A95] text-xs">Monthly Recurring GP</p>
            <p className="text-[#059669] font-bold text-lg">{money(endFYSummary.monthlyGP)}</p>
            <p className="text-[#5A7A95] text-[10px]">{endFYSummary.recCount} recurring deal(s)</p>
          </div>
          <div>
            <p className="text-[#5A7A95] text-xs">Monthly Costs (Oct {fy.start + 1})</p>
            <p className="text-red-400 font-bold text-lg">{money(monthlyCosts)}</p>
          </div>
          <div>
            <p className="text-[#5A7A95] text-xs">Monthly Surplus / Gap</p>
            <p className={`font-bold text-lg ${endFYSummary.monthlyGP >= monthlyCosts ? 'text-[#059669]' : 'text-red-400'}`}>
              {money(endFYSummary.monthlyGP - monthlyCosts)}
            </p>
          </div>
          <div>
            <p className="text-[#5A7A95] text-xs">New Hires Joining</p>
            <div className="text-[#5A7A95] text-[10px] mt-1">
              {(boardPlan.newHireCosts || []).filter(h => { const p = parseMonth(h.startMonth); return p && inFY(p, fy.newStart); }).map((h, i) => (
                <p key={i}>{h.name} - {h.startMonth}</p>
              ))}
            </div>
          </div>
        </div>
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
          <DealTable deals={newFYNewDeals} fyStart={fy.newStart} />
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
            <DealTable deals={stageDeals} showStage={false} fyStart={fy.newStart} />
          </div>
        );
      })}

      {newFYPipeline.length === 0 && newFYNewDeals.length === 0 && (
        <p className="text-[#5A7A95] text-sm italic mb-6">No deals targeting {fy.newLabel}.</p>
      )}

      {/* 6. New FY Financial Forecast - GP vs Costs */}
      {(() => {
        // Split deals by certainty
        const cwDeals = newFYNewDeals; // Closed Won - secured
        const negDeals = newFYPipeline.filter(d => d.stage === 'Negotiating');
        const quotDeals = newFYPipeline.filter(d => d.stage === 'Quoting');
        const earlyDeals = newFYPipeline.filter(d => ['Qualified', 'Lead', 'To Be Contacted'].includes(d.stage));

        // Recurring base (carrying forward from current FY)
        const baseMonthlyGP = newFYCombinedBaseSummary.monthlyGP;
        const baseAnnualGP = baseMonthlyGP * 12;

        // GP by stage
        const cwSummary = summarise(cwDeals);
        const negSummary = summarise(negDeals);
        const quotSummary = summarise(quotDeals);
        const earlySummary = summarise(earlyDeals);

        // Actual total FY costs from spreadsheet (sum of each month)
        const md = boardPlan.monthlyData || [];
        const newFYMonthlyData = md.filter(m => {
          const p = parseMonth(m.month);
          return p && inFY(p, fy.newStart);
        });
        const totalFYCosts = newFYMonthlyData.reduce((s, m) => s + m.totalCost, 0);
        const avgMonthlyCost = newFYMonthlyData.length > 0 ? Math.round(totalFYCosts / newFYMonthlyData.length) : 0;

        // New hire cost info
        const newHires = (boardPlan.newHireCosts || []).filter(h => {
          const p = parseMonth(h.startMonth);
          return p && inFY(p, fy.newStart);
        });
        const newHireMonthlyCost = newHires.reduce((s, h) => s + (h.totalMonthlyCost || 0), 0);
        const newFYMonthlyCosts = newFYMonthlyData.length > 0 ? newFYMonthlyData[newFYMonthlyData.length - 1].totalCost : 0;

        // Total GP by certainty level
        const securedGP = baseAnnualGP + cwSummary.monthlyGP * 12 + cwSummary.nrGP;
        const likelyGP = negSummary.monthlyGP * 12 + negSummary.nrGP;
        const possibleGP = (quotSummary.monthlyGP + earlySummary.monthlyGP) * 12 + quotSummary.nrGP + earlySummary.nrGP;
        const totalGP = securedGP + likelyGP + possibleGP;
        const totalNewFYNRGP = cwSummary.nrGP + negSummary.nrGP + quotSummary.nrGP + earlySummary.nrGP;

        return (
          <>
            <SubHeader>New FY Financial Forecast - GP vs Costs</SubHeader>
            <p className="text-[#5A7A95] text-[10px] mb-4 italic">
              {fy.newLabel} forecast broken down by deal certainty. Shows what GP is already secured vs what depends on closing pipeline deals. Costs reflect actual monthly figures from the business plan including new hires ramping in.
            </p>
            <InsightCard accent="#f59e0b">
              <p className="text-white font-semibold mb-4">{fy.newLabel} GP Forecast by Certainty</p>

              {/* Secured */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-3 h-3 rounded-full bg-[#059669]"></span>
                  <p className="text-[#059669] font-semibold text-sm">Secured (Closed Won + Recurring Base)</p>
                  <p className="text-[#059669] font-bold ml-auto">{money(securedGP)}</p>
                </div>
                <div className="grid grid-cols-3 gap-4 text-xs text-[#5A7A95] pl-5 mb-2">
                  <div>Recurring base: {money(baseAnnualGP)} ({money(baseMonthlyGP)}/mo x 12)</div>
                  <div>CW recurring: {money(cwSummary.monthlyGP * 12)} ({cwDeals.filter(d => d.dealType === 'Recurring').length} deals)</div>
                  <div>CW project/NR: {money(cwSummary.nrGP)}</div>
                </div>
                {cwDeals.length > 0 && (
                  <div className="pl-5 mt-1">
                    <table className="w-full text-[10px]">
                      <tbody>
                        {cwDeals.map((d, i) => (
                          <tr key={i} className="border-b border-[#2A4A6F]/20">
                            <td className="py-0.5 text-white/70 truncate max-w-[200px]">{d.customer}</td>
                            <td className="py-0.5 text-[#5A7A95] truncate max-w-[150px]">{d.description || '-'}</td>
                            <td className="py-0.5 text-right text-[#5A7A95]">{d.dealType}</td>
                            <td className="py-0.5 text-right font-mono text-[#059669]">{money(d.profit)}{d.dealType === 'Recurring' ? '/mo' : ''}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Likely */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-3 h-3 rounded-full bg-[#f59e0b]"></span>
                  <p className="text-[#f59e0b] font-semibold text-sm">Likely (Negotiating)</p>
                  <p className="text-[#f59e0b] font-bold ml-auto">{money(likelyGP)}</p>
                </div>
                <div className="grid grid-cols-3 gap-4 text-xs text-[#5A7A95] pl-5 mb-2">
                  <div>Recurring: {money(negSummary.monthlyGP * 12)} ({negDeals.filter(d => d.dealType === 'Recurring').length} deals)</div>
                  <div>NR/Project: {money(negSummary.nrGP)}</div>
                  <div>{negDeals.length} deal(s) total</div>
                </div>
                {negDeals.length > 0 && (
                  <div className="pl-5 mt-1">
                    <table className="w-full text-[10px]">
                      <tbody>
                        {negDeals.map((d, i) => (
                          <tr key={i} className="border-b border-[#2A4A6F]/20">
                            <td className="py-0.5 text-white/70 truncate max-w-[200px]">{d.customer}</td>
                            <td className="py-0.5 text-[#5A7A95] truncate max-w-[150px]">{d.description || '-'}</td>
                            <td className="py-0.5 text-right text-[#5A7A95]">{d.dealType}</td>
                            <td className="py-0.5 text-right font-mono text-[#f59e0b]">{money(d.profit)}{d.dealType === 'Recurring' ? '/mo' : ''}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Possible */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-3 h-3 rounded-full bg-[#0EA5E9]"></span>
                  <p className="text-[#0EA5E9] font-semibold text-sm">Possible (Quoting + Qualified/Lead)</p>
                  <p className="text-[#0EA5E9] font-bold ml-auto">{money(possibleGP)}</p>
                </div>
                <div className="grid grid-cols-3 gap-4 text-xs text-[#5A7A95] pl-5 mb-2">
                  <div>Recurring: {money((quotSummary.monthlyGP + earlySummary.monthlyGP) * 12)}</div>
                  <div>NR/Project: {money(quotSummary.nrGP + earlySummary.nrGP)}</div>
                  <div>{quotDeals.length + earlyDeals.length} deal(s) total</div>
                </div>
                {(quotDeals.length + earlyDeals.length) > 0 && (
                  <div className="pl-5 mt-1">
                    <table className="w-full text-[10px]">
                      <tbody>
                        {[...quotDeals, ...earlyDeals].map((d, i) => (
                          <tr key={i} className="border-b border-[#2A4A6F]/20">
                            <td className="py-0.5 text-white/70 truncate max-w-[200px]">{d.customer}</td>
                            <td className="py-0.5 text-[#5A7A95] truncate max-w-[150px]">{d.description || '-'}</td>
                            <td className="py-0.5 text-right text-[#5A7A95]">{d.stage}</td>
                            <td className="py-0.5 text-right font-mono text-[#0EA5E9]">{money(d.profit)}{d.dealType === 'Recurring' ? '/mo' : ''}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Totals */}
              <div className="border-t border-[#2A4A6F] pt-4 grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-[#5A7A95] text-xs">Total FY GP (All Stages)</p>
                  <p className="text-[#f59e0b] font-bold text-lg">{money(totalGP)}</p>
                </div>
                <div>
                  <p className="text-[#5A7A95] text-xs">Total FY Costs (Actual)</p>
                  <p className="text-red-400 font-bold text-lg">{money(totalFYCosts)}</p>
                  <p className="text-[#5A7A95] text-[10px]">Avg {money(avgMonthlyCost)}/mo (ramps from {money(newFYMonthlyData[0]?.totalCost || 0)} to {money(newFYMonthlyCosts)})</p>
                </div>
                <div>
                  <p className="text-[#5A7A95] text-xs">Best Case P&amp;L</p>
                  <p className={`font-bold text-lg ${totalGP >= totalFYCosts ? 'text-[#059669]' : 'text-red-400'}`}>
                    {money(totalGP - totalFYCosts)}
                  </p>
                  <p className="text-[#5A7A95] text-[10px]">If all pipeline closes</p>
                </div>
                <div>
                  <p className="text-[#5A7A95] text-xs">Secured Only P&amp;L</p>
                  <p className={`font-bold text-lg ${securedGP >= totalFYCosts ? 'text-[#059669]' : 'text-red-400'}`}>
                    {money(securedGP - totalFYCosts)}
                  </p>
                  <p className="text-[#5A7A95] text-[10px]">Without closing any more deals</p>
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

              // Get actual monthly costs from spreadsheet for each new FY month
              const md = boardPlan.monthlyData || [];
              const getMonthCost = (mi, yr) => {
                const entry = md.find(m => {
                  const p = parseMonth(m.month);
                  return p && p.month === mi && p.year === yr;
                });
                return entry ? entry.totalCost : newFYMonthlyCosts;
              };

              // Add actual costs per month to monthRows
              const monthRowsWithCosts = monthRows.map((mr, idx) => {
                const cost = getMonthCost(mr.mi, mr.yr);
                const newDeals = dealsByFYMonthIdx.filter(d => d.fyIdx === idx);
                return { ...mr, monthlyCost: cost, newDeals };
              });

              const newFYMonthlyCostsLocal = newFYMonthlyCosts; // end-of-FY rate for summary

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
                        <th className="text-right py-1">Pipeline Recurring</th>
                        <th className="text-right py-1">Pipeline NR</th>
                        <th className="text-right py-1">Total GP</th>
                        <th className="text-right py-1">Costs</th>
                        <th className="text-right py-1">Net</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthRowsWithCosts.map((mr, i) => {
                        const net = mr.totalMonthlyWithNR - mr.monthlyCost;
                        return (
                          <React.Fragment key={i}>
                            <tr className={`border-b border-[#2A4A6F]/40 ${net >= 0 ? 'bg-[#059669]/10' : ''}`}>
                              <td className="py-1 text-white text-xs">{mr.label}</td>
                              <td className="py-1 text-right font-mono text-xs text-[#0EA5E9]">{money(mr.baseRecGP)}</td>
                              <td className="py-1 text-right font-mono text-xs text-[#f59e0b]">{mr.pipelineRecGP > 0 ? money(mr.pipelineRecGP) : '-'}</td>
                              <td className="py-1 text-right font-mono text-xs text-amber-400">{mr.pipelineNRGP > 0 ? money(mr.pipelineNRGP) : '-'}</td>
                              <td className="py-1 text-right font-mono text-xs text-white font-bold">{money(mr.totalMonthlyWithNR)}</td>
                              <td className="py-1 text-right font-mono text-xs text-red-400">{money(mr.monthlyCost)}</td>
                              <td className={`py-1 text-right font-mono text-xs font-bold ${net >= 0 ? 'text-[#059669]' : 'text-red-400'}`}>{money(net)}</td>
                            </tr>
                            {mr.newDeals.length > 0 && mr.newDeals.map((d, j) => (
                              <tr key={`deal-${i}-${j}`} className="bg-[#1A2A3F]/50">
                                <td colSpan={2} className="py-0.5 pl-4 text-[10px] text-[#5A7A95] truncate">↳ {d.customer}</td>
                                <td className="py-0.5 text-right text-[10px] font-mono text-[#5A7A95]">{d.dealType === 'Recurring' ? money(d.profit) + '/mo' : '-'}</td>
                                <td className="py-0.5 text-right text-[10px] font-mono text-[#5A7A95]">{d.dealType !== 'Recurring' ? money(d.profit) : '-'}</td>
                                <td className="py-0.5 text-right text-[10px] text-[#5A7A95]">{d.stage}</td>
                                <td colSpan={2}></td>
                              </tr>
                            ))}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-[#2A4A6F] text-white font-semibold text-xs">
                        <td className="py-2">FY Total</td>
                        <td className="py-2 text-right font-mono text-[#0EA5E9]">{money(monthRowsWithCosts.reduce((s, m) => s + m.baseRecGP, 0))}</td>
                        <td className="py-2 text-right font-mono text-[#f59e0b]">{money(monthRowsWithCosts.reduce((s, m) => s + m.pipelineRecGP, 0))}</td>
                        <td className="py-2 text-right font-mono text-amber-400">{money(monthRowsWithCosts.reduce((s, m) => s + m.pipelineNRGP, 0))}</td>
                        <td className="py-2 text-right font-mono">{money(monthRowsWithCosts.reduce((s, m) => s + m.totalMonthlyWithNR, 0))}</td>
                        <td className="py-2 text-right font-mono text-red-400">{money(monthRowsWithCosts.reduce((s, m) => s + m.monthlyCost, 0))}</td>
                        <td className={`py-2 text-right font-mono font-bold ${monthRowsWithCosts.reduce((s, m) => s + m.totalMonthlyWithNR, 0) - monthRowsWithCosts.reduce((s2, m2) => s2 + m2.monthlyCost, 0) >= 0 ? 'text-[#059669]' : 'text-red-400'}`}>
                          {money(monthRowsWithCosts.reduce((s, m) => s + m.totalMonthlyWithNR, 0) - monthRowsWithCosts.reduce((s2, m2) => s2 + m2.monthlyCost, 0))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                  </div>
                  {(() => {
                    const breakEvenMonth = monthRowsWithCosts.find(mr => mr.totalMonthlyWithNR >= mr.monthlyCost);
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

              const lastMonth = monthRowsWithCosts[monthRowsWithCosts.length - 1];
              const endOfFYMonthlyGP = lastMonth.totalMonthlyGP;
              const endOfFYMonthlyWithNR = lastMonth.totalMonthlyWithNR;
              const totalFYGPEarned = monthRowsWithCosts.reduce((s, m) => s + m.totalMonthlyWithNR, 0);
              const totalFYCostsAll = monthRowsWithCosts.reduce((s, m) => s + m.monthlyCost, 0);
              const fyNetPL = totalFYGPEarned - totalFYCostsAll;
              const endOfFYSurplus = endOfFYMonthlyWithNR - lastMonth.monthlyCost;
              const totalNRContrib = monthRowsWithCosts.reduce((s, m) => s + m.pipelineNRGP, 0);

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
                      <p className="text-[#5A7A95] text-[10px]">Sum of actual monthly costs</p>
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
                        <p className="text-red-400 font-bold text-lg">{money(lastMonth.monthlyCost)}</p>
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

              // Dec cashflow note (c.90k engineering GP landing in Dec)
              const decNRGP = monthRowsWithCosts.find(m => m.mi === 11); // Dec
              const decCashflow = decNRGP ? decNRGP.pipelineNRGP : 90000;

              // ── Cashflow Runway Section ──
              // Build month-by-month cash position starting from Nov
              // NR GP (like the £90k in Dec) creates a cash buffer
              // Each month: cash += (recurring GP - costs) + any NR GP that month
              // Shows when cash runs out and how much new business is needed
              const cashflowRows = [];
              let cashBalance = 0;
              let cashRunsOutMonth = null;
              let peakCash = 0;
              let peakCashMonth = '';

              // Scenario 1: With current pipeline (all deals)
              for (let i = 0; i < monthRowsWithCosts.length; i++) {
                const mr = monthRowsWithCosts[i];
                const recGP = mr.baseRecGP + mr.pipelineRecGP;
                const nrGP = mr.pipelineNRGP;
                const costs = mr.monthlyCost;
                const monthlyNet = recGP + nrGP - costs;
                cashBalance += monthlyNet;

                if (cashBalance > peakCash) {
                  peakCash = cashBalance;
                  peakCashMonth = mr.label;
                }

                cashflowRows.push({
                  label: mr.label,
                  recGP,
                  nrGP,
                  costs,
                  monthlyNet,
                  cashBalance,
                  newDeals: mr.newDeals || [],
                });

                if (cashBalance < 0 && !cashRunsOutMonth) {
                  cashRunsOutMonth = mr.label;
                }
              }

              // Scenario 2: Secured only (no pipeline, just base recurring + CW)
              const securedCashRows = [];
              let securedCashBalance = 0;
              let securedRunsOutMonth = null;
              const cwRecOnly = summarise(newFYNewDeals.filter(d => d.dealType === 'Recurring')).monthlyGP;
              const cwNRDeals = newFYNewDeals.filter(d => d.dealType !== 'Recurring');

              for (let i = 0; i < monthRowsWithCosts.length; i++) {
                const mr = monthRowsWithCosts[i];
                // Only secured: base rec + CW recurring (layered by billing month)
                const cwActiveRec = dealsByFYMonthIdx
                  .filter(d => d.stage === 'Closed-Won' && d.dealType === 'Recurring' && d.fyIdx <= i)
                  .reduce((s, d) => s + d.profit, 0);
                const cwNR = dealsByFYMonthIdx
                  .filter(d => d.stage === 'Closed-Won' && d.dealType !== 'Recurring' && d.fyIdx === i)
                  .reduce((s, d) => s + d.profit, 0);
                const recGP = baseRecGP + cwActiveRec;
                const costs = mr.monthlyCost;
                const monthlyNet = recGP + cwNR - costs;
                securedCashBalance += monthlyNet;
                securedCashRows.push({ label: mr.label, recGP, nrGP: cwNR, costs, monthlyNet, cashBalance: securedCashBalance });
                if (securedCashBalance < 0 && !securedRunsOutMonth) {
                  securedRunsOutMonth = mr.label;
                }
              }

              // Calculate monthly GP gap needed to break even (secured only)
              const lastSecured = securedCashRows[securedCashRows.length - 1];
              const securedEndBalance = lastSecured.cashBalance;
              const monthsInDeficit = securedCashRows.filter(r => r.cashBalance < 0).length;
              const additionalMonthlyGPNeeded = securedEndBalance < 0 ? Math.ceil(Math.abs(securedEndBalance) / 12) : 0;

              const cashflowSection = (
                <div className={`${card} mt-6 mb-6 border-l-4 border-l-[#0EA5E9]`}>
                  <p className="text-white font-semibold mb-1 text-sm">💰 Total Pipeline Conversion Cashflow Runway - {fy.newLabel}</p>
                  <p className="text-[#5A7A95] text-[10px] mb-4 italic">
                    Cumulative cash position month-by-month. NR GP (e.g. {money(decCashflow)} in Dec) creates a buffer that offsets the gap between recurring GP and costs.
                    Shows when the buffer runs out and how much new business must be billing to stay positive.
                  </p>

                  {/* Key metrics */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm mb-4">
                    <div className="text-center">
                      <p className="text-[#5A7A95] text-xs mb-1">Dec NR Cash Injection</p>
                      <p className="text-[#0EA5E9] font-bold text-lg">{money(decCashflow)}</p>
                      <p className="text-[#5A7A95] text-[10px]">Project GP landing in Dec</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[#5A7A95] text-xs mb-1">Peak Cash Position</p>
                      <p className="text-[#059669] font-bold text-lg">{money(peakCash)}</p>
                      <p className="text-[#5A7A95] text-[10px]">{peakCashMonth}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[#5A7A95] text-xs mb-1">End of FY Cash</p>
                      <p className={`font-bold text-lg ${cashflowRows[cashflowRows.length - 1].cashBalance >= 0 ? 'text-[#059669]' : 'text-red-400'}`}>
                        {money(cashflowRows[cashflowRows.length - 1].cashBalance)}
                      </p>
                      <p className="text-[#5A7A95] text-[10px]">With all pipeline</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[#5A7A95] text-xs mb-1">Secured Only End Cash</p>
                      <p className={`font-bold text-lg ${securedEndBalance >= 0 ? 'text-[#059669]' : 'text-red-400'}`}>
                        {money(securedEndBalance)}
                      </p>
                      <p className="text-[#5A7A95] text-[10px]">{securedRunsOutMonth ? `Goes negative: ${securedRunsOutMonth}` : 'Stays positive all FY'}</p>
                    </div>
                  </div>

                  {/* Month-by-month cashflow table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-[#5A7A95] text-xs border-b border-[#2A4A6F]">
                          <th className="text-left py-1">Month</th>
                          <th className="text-right py-1">Recurring GP</th>
                          <th className="text-right py-1">NR GP</th>
                          <th className="text-right py-1">Costs</th>
                          <th className="text-right py-1">Monthly Net</th>
                          <th className="text-right py-1">Cash Balance</th>
                          <th className="text-right py-1" title="Independent calculation using only base recurring + Closed Won deals. Ignores all pipeline.">Secured Only *</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cashflowRows.map((cr, i) => {
                          const isNegative = cr.cashBalance < 0;
                          const securedNeg = securedCashRows[i].cashBalance < 0;
                          return (
                            <React.Fragment key={i}>
                              <tr className={`border-b border-[#2A4A6F]/40 ${isNegative ? 'bg-red-900/10' : cr.nrGP > 0 ? 'bg-[#0EA5E9]/5' : ''}`}>
                                <td className="py-1 text-white text-xs">{cr.label}</td>
                                <td className="py-1 text-right font-mono text-xs text-[#059669]">{money(cr.recGP)}</td>
                                <td className="py-1 text-right font-mono text-xs text-[#0EA5E9]">{cr.nrGP > 0 ? money(cr.nrGP) : '-'}</td>
                                <td className="py-1 text-right font-mono text-xs text-red-400">{money(cr.costs)}</td>
                                <td className={`py-1 text-right font-mono text-xs font-bold ${cr.monthlyNet >= 0 ? 'text-[#059669]' : 'text-red-400'}`}>{money(cr.monthlyNet)}</td>
                                <td className={`py-1 text-right font-mono text-xs font-bold ${isNegative ? 'text-red-400' : 'text-[#059669]'}`}>{money(cr.cashBalance)}</td>
                                <td className={`py-1 text-right font-mono text-xs ${securedNeg ? 'text-red-400' : 'text-[#059669]'}`}>{money(securedCashRows[i].cashBalance)}</td>
                              </tr>
                              {cr.newDeals.length > 0 && cr.newDeals.map((d, j) => (
                                <tr key={`cf-deal-${i}-${j}`} className="bg-[#1A2A3F]/50">
                                  <td colSpan={2} className="py-0.5 pl-4 text-[10px] text-[#5A7A95] truncate">↳ {d.customer}</td>
                                  <td className="py-0.5 text-right text-[10px] font-mono text-[#5A7A95]">{d.dealType !== 'Recurring' ? money(d.profit) : '-'}</td>
                                  <td colSpan={2} className="py-0.5 text-right text-[10px] text-[#5A7A95]">{d.dealType === 'Recurring' ? money(d.profit) + '/mo rec' : 'one-off'}</td>
                                  <td className="py-0.5 text-right text-[10px] text-[#5A7A95]">{d.stage}</td>
                                  <td></td>
                                </tr>
                              ))}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Analysis callouts */}
                  <div className="mt-4 space-y-2">
                    {cashRunsOutMonth ? (
                      <p className="text-red-400 text-xs font-semibold">
                        ⚠ Cash goes negative in {cashRunsOutMonth} with full pipeline. Need to accelerate deal closures or billing start dates before this point.
                      </p>
                    ) : (
                      <p className="text-[#059669] text-xs font-semibold">
                        ✓ Cash stays positive all FY with full pipeline. The {money(decCashflow)} Dec injection covers the early-FY gap while recurring builds.
                      </p>
                    )}
                    {securedRunsOutMonth && (
                      <p className="text-amber-400 text-xs font-semibold">
                        ⚠ Without pipeline: cash goes negative in {securedRunsOutMonth}. Need {money(additionalMonthlyGPNeeded)}/mo additional recurring GP to break even by end of FY.
                      </p>
                    )}
                    {!securedRunsOutMonth && securedEndBalance >= 0 && (
                      <p className="text-[#059669] text-xs font-semibold">
                        ✓ Even without closing any pipeline deals, secured revenue covers costs all FY.
                      </p>
                    )}
                    <p className="text-[#5A7A95] text-[10px] mt-3 italic">
                      * Secured Only is a separate calculation that only includes base recurring GP (£{Math.round(baseRecGP).toLocaleString()}/mo) + Closed Won deals. 
                      It ignores all Negotiating, Quoting and Lead pipeline. The other columns include all pipeline stages.
                    </p>
                  </div>
                </div>
              );

              return <>{monthTable}{summaryCard}{cashflowSection}</>;
            })()}
          </>
        );
      })()}

      {/* ════════════════════════════════════════════════════════════
          REALISTIC SCENARIO - CW + Negotiating Only
         ════════════════════════════════════════════════════════════ */}
      {(() => {
        // Only Closed Won + Negotiating deals billing in new FY
        const realisticDeals = [...newFYNewDeals, ...newFYPipeline.filter(d => d.stage === 'Negotiating')];
        const realisticRec = realisticDeals.filter(d => d.dealType === 'Recurring');
        const realisticNR = realisticDeals.filter(d => d.dealType !== 'Recurring');
        const realisticRecGP = realisticRec.reduce((s, d) => s + d.profit, 0);
        const realisticNRGP = realisticNR.reduce((s, d) => s + d.profit, 0);

        const baseMonthlyGP = newFYCombinedBaseSummary.monthlyGP;

        // Build month-by-month for realistic scenario
        const fyMonths = [];
        for (let m = 0; m < 12; m++) {
          const mi = (10 + m) % 12;
          const yr = mi >= 10 ? fy.newStart : fy.newStart + 1;
          fyMonths.push({ mi, yr, label: `${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][mi]} ${yr}` });
        }

        // Map deals to FY month index
        const dealsByIdx = realisticDeals.map(d => {
          const bp = d._bill || parseMonth(d.billingStart);
          if (!bp) return { ...d, fyIdx: 0 };
          const dealMI = bp.month;
          const dealYr = bp.year;
          let fyIdx;
          if (dealMI >= 10) fyIdx = dealMI - 10 + (dealYr === fy.newStart ? 0 : 12);
          else fyIdx = dealMI + 2 + (dealYr === fy.newStart + 1 ? 0 : (dealYr > fy.newStart + 1 ? 12 : -12));
          fyIdx = Math.max(0, Math.min(11, fyIdx));
          return { ...d, fyIdx };
        });

        // Costs from spreadsheet
        const md = boardPlan.monthlyData || [];
        const getMonthCost = (mi, yr) => {
          const entry = md.find(m => {
            const p = parseMonth(m.month);
            return p && p.month === mi && p.year === yr;
          });
          const fallback = md.filter(m => { const p = parseMonth(m.month); return p && inFY(p, fy.newStart); });
          return entry ? entry.totalCost : (fallback.length > 0 ? fallback[fallback.length - 1].totalCost : 0);
        };

        // Month-by-month
        let cashBalance = 0;
        let totalGPEarned = 0;
        let totalCosts = 0;
        const rows = fyMonths.map((fm, idx) => {
          const activeRec = dealsByIdx.filter(d => d.fyIdx <= idx && d.dealType === 'Recurring').reduce((s, d) => s + d.profit, 0);
          const monthNR = dealsByIdx.filter(d => d.fyIdx === idx && d.dealType !== 'Recurring').reduce((s, d) => s + d.profit, 0);
          const newDeals = dealsByIdx.filter(d => d.fyIdx === idx);
          const recGP = baseMonthlyGP + activeRec;
          const cost = getMonthCost(fm.mi, fm.yr);
          const net = recGP + monthNR - cost;
          cashBalance += net;
          totalGPEarned += recGP + monthNR;
          totalCosts += cost;
          return { ...fm, recGP, nrGP: monthNR, cost, net, cashBalance, newDeals };
        });

        const endOfFYRecGP = rows[rows.length - 1].recGP;
        const endOfFYCost = rows[rows.length - 1].cost;
        const fyPL = totalGPEarned - totalCosts;

        // Alysha overlay: R78 recurring £1k/mo from Jan + £5k/mo NR from Jan
        const alyshaStart = 2; // FY month index: Jan = 2 (Nov=0, Dec=1, Jan=2...)
        const alyshaMonths = 12 - alyshaStart; // 10 months
        let alyshaR78 = 0;
        for (let i = 0; i < alyshaMonths; i++) alyshaR78 += 1000 * (alyshaMonths - i);
        const alyshaNR = 5000 * alyshaMonths;
        const alyshaTotal = alyshaR78 + alyshaNR;
        const alyshaEndRec = 1000 * alyshaMonths; // £10k/mo by Oct

        // Alysha month-by-month overlay
        let alyCashBalance = 0;
        let alyTotalGP = 0;
        const alyRows = fyMonths.map((fm, idx) => {
          const activeRec = dealsByIdx.filter(d => d.fyIdx <= idx && d.dealType === 'Recurring').reduce((s, d) => s + d.profit, 0);
          const monthNR = dealsByIdx.filter(d => d.fyIdx === idx && d.dealType !== 'Recurring').reduce((s, d) => s + d.profit, 0);
          // Add Alysha: from Jan (idx=2), she adds £1k/mo × months active so far
          const alyRecGP = idx >= alyshaStart ? 1000 * (idx - alyshaStart + 1) : 0;
          const alyNR = idx >= alyshaStart ? 5000 : 0;
          const recGP = baseMonthlyGP + activeRec + alyRecGP;
          const totalNR = monthNR + alyNR;
          const cost = getMonthCost(fm.mi, fm.yr);
          const net = recGP + totalNR - cost;
          alyCashBalance += net;
          alyTotalGP += recGP + totalNR;
          return { ...fm, recGP, nrGP: totalNR, cost, net, cashBalance: alyCashBalance };
        });

        const alyFYPL = alyTotalGP - totalCosts;

        return (
          <>
            <SubHeader>Realistic Scenario - Closed Won + Negotiating Only</SubHeader>
            <p className="text-[#5A7A95] text-[10px] mb-4 italic">
              What the {fy.newLabel} looks like if we don't win any new business beyond what's already Closed Won or Negotiating. 
              These are the deals we're most confident about. Shown with and without Alysha's predicted contribution.
            </p>

            {/* Deal list */}
            <div className={`${card} mb-4`}>
              <p className="text-white font-semibold text-sm mb-3">Deals Included ({realisticDeals.length})</p>
              <table className="w-full text-xs">
               <thead>
                 <tr className="text-[#5A7A95] border-b border-[#2A4A6F]">
                   <th className="text-left py-1">Customer</th>
                   <th className="text-left py-1">Type</th>
                   <th className="text-left py-1">Stage</th>
                   <th className="text-right py-1">GP/mo</th>
                   <th className="text-right py-1">Billing Start</th>
                   <th className="text-right py-1">FY Contribution</th>
                 </tr>
               </thead>
               <tbody>
                 {dealsByIdx.map((d, i) => {
                   const fyMonthsRemaining = 12 - d.fyIdx;
                   const contribution = d.dealType === 'Recurring' ? d.profit * fyMonthsRemaining : d.profit;
                   return (
                     <tr key={i} className="border-b border-[#2A4A6F]/30">
                       <td className="py-1 text-white/80 truncate max-w-[180px]">{d.customer}</td>
                       <td className="py-1">
                         <span className={`px-1.5 py-0.5 rounded text-[10px] ${d.dealType === 'Recurring' ? 'bg-[#059669]/20 text-[#059669]' : 'bg-amber-500/20 text-amber-400'}`}>
                           {d.dealType}
                         </span>
                       </td>
                       <td className="py-1 text-[#5A7A95]">{d.stage}</td>
                       <td className="py-1 text-right font-mono text-white">{money(d.profit)}{d.dealType === 'Recurring' ? '/mo' : ''}</td>
                       <td className="py-1 text-right text-[#5A7A95]">{d.billingStart}</td>
                       <td className="py-1 text-right font-mono text-[#f59e0b] font-semibold">{money(contribution)}</td>
                     </tr>
                   );
                 })}
               </tbody>
               <tfoot>
                 <tr className="border-t border-[#2A4A6F] font-semibold">
                   <td colSpan={3} className="py-2 text-white">Total</td>
                   <td className="py-2 text-right font-mono text-white">{money(realisticRecGP)}/mo + {money(realisticNRGP)} NR</td>
                   <td></td>
                   <td className="py-2 text-right font-mono text-[#f59e0b]">{money(dealsByIdx.reduce((s, d) => s + (d.dealType === 'Recurring' ? d.profit * (12 - d.fyIdx) : d.profit), 0))}</td>
                 </tr>
               </tfoot>
              </table>
            </div>

            {/* Side by side: Without Alysha / With Alysha */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
              {/* WITHOUT Alysha */}
              <div className={`${card} border-l-4 border-l-[#f59e0b]`}>
               <p className="text-white font-semibold text-sm mb-1">Without Alysha</p>
                <p className="text-[#5A7A95] text-[10px] mb-3 italic">Closed Won + Negotiating deals only. No quoting or lead pipeline included.</p>
               <div className="overflow-x-auto">
                 <table className="w-full text-[11px]">
                   <thead>
                     <tr className="text-[#5A7A95] text-[10px] border-b border-[#2A4A6F]">
                       <th className="text-left py-1">Month</th>
                       <th className="text-right py-1">Rec GP</th>
                       <th className="text-right py-1">NR</th>
                       <th className="text-right py-1">Costs</th>
                       <th className="text-right py-1">Cash</th>
                     </tr>
                   </thead>
                   <tbody>
                     {rows.map((r, i) => (
                       <React.Fragment key={i}>
                         <tr className={`border-b border-[#2A4A6F]/30 ${r.cashBalance < 0 ? 'bg-red-900/10' : ''}`}>
                           <td className="py-0.5 text-white/80">{r.label}</td>
                           <td className="py-0.5 text-right font-mono text-[#059669]">{money(r.recGP)}</td>
                           <td className="py-0.5 text-right font-mono text-[#0EA5E9]">{r.nrGP > 0 ? money(r.nrGP) : '-'}</td>
                           <td className="py-0.5 text-right font-mono text-red-400">{money(r.cost)}</td>
                           <td className={`py-0.5 text-right font-mono font-bold ${r.cashBalance >= 0 ? 'text-[#059669]' : 'text-red-400'}`}>{money(r.cashBalance)}</td>
                         </tr>
                         {r.newDeals.length > 0 && r.newDeals.map((d, j) => (
                           <tr key={`d-${i}-${j}`} className="bg-[#1A2A3F]/50">
                             <td colSpan={3} className="py-0 pl-3 text-[9px] text-[#5A7A95] truncate">↳ {d.customer} ({d.dealType === 'Recurring' ? money(d.profit) + '/mo' : money(d.profit) + ' NR'})</td>
                             <td colSpan={2}></td>
                           </tr>
                         ))}
                       </React.Fragment>
                     ))}
                   </tbody>
                 </table>
               </div>
               <div className="border-t border-[#2A4A6F] mt-3 pt-3 grid grid-cols-2 gap-3 text-xs">
                 <div>
                   <p className="text-[#5A7A95]">Total FY GP</p>
                   <p className="text-[#f59e0b] font-bold text-lg">{money(totalGPEarned)}</p>
                 </div>
                 <div>
                   <p className="text-[#5A7A95]">FY P&amp;L</p>
                   <p className={`font-bold text-lg ${fyPL >= 0 ? 'text-[#059669]' : 'text-red-400'}`}>{money(fyPL)}</p>
                 </div>
                 <div>
                   <p className="text-[#5A7A95]">End of FY Monthly Rec</p>
                   <p className="text-[#059669] font-bold">{money(endOfFYRecGP)}/mo</p>
                 </div>
                 <div>
                   <p className="text-[#5A7A95]">vs Monthly Costs</p>
                   <p className={`font-bold ${endOfFYRecGP >= endOfFYCost ? 'text-[#059669]' : 'text-red-400'}`}>
                     {endOfFYRecGP >= endOfFYCost ? '✓ Covering' : `✗ Gap: ${money(endOfFYCost - endOfFYRecGP)}/mo`}
                   </p>
                 </div>
               </div>
              </div>

              {/* WITH Alysha */}
              <div className={`${card} border-l-4 border-l-[#a855f7]`}>
               <p className="text-white font-semibold text-sm mb-1">With Alysha</p>
                <p className="text-[#5A7A95] text-[10px] mb-3 italic">Closed Won + Negotiating deals plus Alysha's predicted £1k/mo recurring + £5k/mo NR from January.</p>
               <div className="overflow-x-auto">
                 <table className="w-full text-[11px]">
                   <thead>
                     <tr className="text-[#5A7A95] text-[10px] border-b border-[#2A4A6F]">
                       <th className="text-left py-1">Month</th>
                       <th className="text-right py-1">Rec GP</th>
                       <th className="text-right py-1">NR</th>
                       <th className="text-right py-1">Costs</th>
                       <th className="text-right py-1">Cash</th>
                     </tr>
                   </thead>
                   <tbody>
                     {alyRows.map((r, i) => (
                       <tr key={i} className={`border-b border-[#2A4A6F]/30 ${r.cashBalance < 0 ? 'bg-red-900/10' : ''} ${i >= alyshaStart ? 'bg-[#a855f7]/5' : ''}`}>
                         <td className="py-0.5 text-white/80">{r.label}</td>
                         <td className="py-0.5 text-right font-mono text-[#059669]">{money(r.recGP)}</td>
                         <td className="py-0.5 text-right font-mono text-[#0EA5E9]">{r.nrGP > 0 ? money(r.nrGP) : '-'}</td>
                         <td className="py-0.5 text-right font-mono text-red-400">{money(r.cost)}</td>
                         <td className={`py-0.5 text-right font-mono font-bold ${r.cashBalance >= 0 ? 'text-[#059669]' : 'text-red-400'}`}>{money(r.cashBalance)}</td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
               <div className="border-t border-[#2A4A6F] mt-3 pt-3 grid grid-cols-2 gap-3 text-xs">
                 <div>
                   <p className="text-[#5A7A95]">Total FY GP</p>
                   <p className="text-[#f59e0b] font-bold text-lg">{money(alyTotalGP)}</p>
                   <p className="text-[#a855f7] text-[10px]">+{money(alyshaTotal)} from Alysha</p>
                 </div>
                 <div>
                   <p className="text-[#5A7A95]">FY P&amp;L</p>
                   <p className={`font-bold text-lg ${alyFYPL >= 0 ? 'text-[#059669]' : 'text-red-400'}`}>{money(alyFYPL)}</p>
                   <p className="text-[#a855f7] text-[10px]">+{money(alyshaTotal)} vs without</p>
                 </div>
                 <div>
                   <p className="text-[#5A7A95]">End of FY Monthly Rec</p>
                   <p className="text-[#059669] font-bold">{money(endOfFYRecGP + alyshaEndRec)}/mo</p>
                   <p className="text-[#a855f7] text-[10px]">+{money(alyshaEndRec)}/mo from Alysha</p>
                 </div>
                 <div>
                   <p className="text-[#5A7A95]">vs Monthly Costs</p>
                   <p className={`font-bold ${(endOfFYRecGP + alyshaEndRec) >= endOfFYCost ? 'text-[#059669]' : 'text-red-400'}`}>
                     {(endOfFYRecGP + alyshaEndRec) >= endOfFYCost ? '✓ Covering' : `✗ Gap: ${money(endOfFYCost - endOfFYRecGP - alyshaEndRec)}/mo`}
                   </p>
                 </div>
               </div>
              </div>
            </div>
          </>
        );
      })()}

      {/* ════════════════════════════════════════════════════════════
          HIDDEN BENEFITS - Board Surprise (Alysha)
         ════════════════════════════════════════════════════════════ */}
      {(() => {
        // Alysha: £1k/mo recurring GP starting January, R78 weighted
        // FY26/27 = Nov 2026 - Oct 2027. Jan = month 3, so 10 months remain (Jan-Oct)
        const alyshaStartMonth = 2; // Jan = index 2 in FY month order (Nov=0, Dec=1, Jan=2...)
        const fyMonths = 12;
        const monthlyRecGP = 1000;
        // She closes £1k/mo each month from Jan. Each deal bills for remaining FY months.
        const monthsActive = fyMonths - alyshaStartMonth; // 10 months (Jan-Oct)
        // R78: deal closed in month X bills for (fyMonths - X) remaining months
        // Jan(10) + Feb(9) + Mar(8) + Apr(7) + May(6) + Jun(5) + Jul(4) + Aug(3) + Sep(2) + Oct(1)
        let r78Total = 0;
        const r78Rows = [];
        for (let i = 0; i < monthsActive; i++) {
          const remaining = monthsActive - i;
          const contribution = monthlyRecGP * remaining;
          r78Total += contribution;
          const monthNames = ['Nov','Dec','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct'];
          r78Rows.push({ month: monthNames[alyshaStartMonth + i], remaining, contribution });
        }

        // NR GP: £5k/mo for 10 months (Jan-Oct)
        const nrPerMonth = 5000;
        const totalNRGP = nrPerMonth * monthsActive; // £50k

        // End of FY monthly recurring position: by Oct she has £10k/mo recurring (£1k × 10 months of deals)
        const endOfFYMonthlyRec = monthlyRecGP * monthsActive; // £10k/mo by year end

        const totalAlyshaGP = r78Total + totalNRGP;

        // Pull in existing end of FY summary figures to show combined
        const md = boardPlan.monthlyData || [];
        const newFYMonthlyData = md.filter(m => {
          const p = parseMonth(m.month);
          return p && inFY(p, fy.newStart);
        });
        const totalFYCostsActual = newFYMonthlyData.reduce((s, m) => s + m.totalCost, 0);

        // Compute main forecast GP to show combined total with Alysha
        const allPipelineDealsAlysha = [...newFYNewDeals, ...newFYPipeline];
        const baseRecGPAlysha = newFYCombinedBaseSummary.monthlyGP;
        const mainForecastGP = (() => {
          const fyM = [];
          for (let m = 0; m < 12; m++) {
            const mi = (10 + m) % 12;
            const yr = mi >= 10 ? fy.newStart : fy.newStart + 1;
            fyM.push({ mi, yr });
          }
          const dealsByIdx = allPipelineDealsAlysha.map(d => {
            const bp = d._bill || parseMonth(d.billingStart);
            if (!bp) return { ...d, fyIdx: 0 };
            const dealMI = bp.month;
            const dealYr = bp.year;
            let fyIdx;
            if (dealMI >= 10) fyIdx = dealMI - 10 + (dealYr === fy.newStart ? 0 : 12);
            else fyIdx = dealMI + 2 + (dealYr === fy.newStart + 1 ? 0 : (dealYr > fy.newStart + 1 ? 12 : -12));
            fyIdx = Math.max(0, Math.min(11, fyIdx));
            return { ...d, fyIdx };
          });
          let total = 0;
          for (let idx = 0; idx < 12; idx++) {
            const activeDeals = dealsByIdx.filter(d => d.fyIdx <= idx);
            const pRec = activeDeals.filter(d => d.dealType === 'Recurring').reduce((s, d) => s + d.profit, 0);
            const pNR = dealsByIdx.filter(d => d.fyIdx === idx && d.dealType !== 'Recurring').reduce((s, d) => s + d.profit, 0);
            total += baseRecGPAlysha + pRec + pNR;
          }
          return total;
        })();

        return (
          <div className="mt-12 border-t-2 border-dashed border-[#f59e0b]/40 pt-8">
            <SectionHeader
              title="Hidden Benefits - Board Surprise"
              subtitle="Additional GP not included in main forecast figures above"
              accent="#a855f7"
            />
            <p className="text-[#5A7A95] text-xs mb-4 -mt-2 italic">
              Alysha's predicted contribution is excluded from the main forecast as a positive surprise for the board. These figures sit on top of everything shown above.
            </p>

            <InsightCard accent="#a855f7">
              <p className="text-white font-semibold mb-4">Alysha - Predicted GP Contribution ({fy.newLabel})</p>

              {/* Recurring R78 */}
              <div className="mb-4">
                <p className="text-[#a855f7] font-semibold text-sm mb-2">Recurring GP (Rule of 78) - Starting January</p>
                <p className="text-[#5A7A95] text-[10px] mb-3">
                  Closing £1,000/mo GP each month from January. Each deal accumulates billing for the remainder of the FY.
                </p>
                <div className="overflow-x-auto mb-3">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-[#5A7A95] border-b border-[#2A4A6F]">
                        <th className="text-left py-1 pr-3">Month Closed</th>
                        <th className="text-right py-1 pr-3">GP/mo</th>
                        <th className="text-right py-1 pr-3">FY Months</th>
                        <th className="text-right py-1 text-[#a855f7]">FY Contribution</th>
                      </tr>
                    </thead>
                    <tbody>
                      {r78Rows.map((r, i) => (
                        <tr key={i} className="border-b border-[#2A4A6F]/30 text-white/80">
                          <td className="py-1 pr-3">{r.month}</td>
                          <td className="py-1 pr-3 text-right font-mono">{money(monthlyRecGP)}</td>
                          <td className="py-1 pr-3 text-right font-mono">{r.remaining}/12</td>
                          <td className="py-1 text-right font-mono text-[#a855f7] font-semibold">{money(r.contribution)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-[#2A4A6F] font-semibold text-white">
                        <td colSpan={3} className="py-2 pr-3 text-right">Total R78 Recurring GP</td>
                        <td className="py-2 text-right font-mono text-[#a855f7]">{money(r78Total)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* NR GP */}
              <div className="mb-4">
                <p className="text-amber-400 font-semibold text-sm mb-2">Non-Recurring GP - Project Work</p>
                <p className="text-[#5A7A95] text-[10px] mb-2">
                  £5,000/mo NR GP from January to October ({monthsActive} months)
                </p>
                <p className="text-amber-400 font-bold text-lg">{money(totalNRGP)}</p>
              </div>

              {/* Totals */}
              <div className="border-t border-[#2A4A6F] pt-4 grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-[#5A7A95] text-xs">R78 Recurring GP</p>
                  <p className="text-[#a855f7] font-bold text-lg">{money(r78Total)}</p>
                </div>
                <div>
                  <p className="text-[#5A7A95] text-xs">NR GP (Projects)</p>
                  <p className="text-amber-400 font-bold text-lg">{money(totalNRGP)}</p>
                </div>
                <div>
                  <p className="text-[#5A7A95] text-xs">Total Alysha GP</p>
                  <p className="text-white font-bold text-xl">{money(totalAlyshaGP)}</p>
                </div>
                <div>
                  <p className="text-[#5A7A95] text-xs">End of FY Monthly Rec (+)</p>
                  <p className="text-[#059669] font-bold text-lg">+{money(endOfFYMonthlyRec)}/mo</p>
                  <p className="text-[#5A7A95] text-[10px]">Added to recurring base</p>
                </div>
              </div>
            </InsightCard>

            {/* Impact on End of FY Summary */}
            <div className={`${card} mt-4 mb-6 border-l-4 border-l-[#a855f7]`}>
              <p className="text-white font-semibold mb-3">Impact on {fy.newLabel} End of Year Position</p>
              <p className="text-[#5A7A95] text-[10px] mb-4 italic">
                Shows what the FY figures look like with Alysha's contribution added on top of the main forecast.
              </p>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
                <div>
                  <p className="text-[#5A7A95] text-xs">Main Forecast GP</p>
                  <p className="text-[#f59e0b] font-bold text-lg">{money(mainForecastGP)}</p>
                  <p className="text-[#5A7A95] text-[10px]">From main forecast above</p>
                </div>
                <div>
                  <p className="text-[#5A7A95] text-xs">+ Alysha GP</p>
                  <p className="text-[#a855f7] font-bold text-lg">+{money(totalAlyshaGP)}</p>
                  <p className="text-[#5A7A95] text-[10px]">R78 {money(r78Total)} + NR {money(totalNRGP)}</p>
                </div>
                <div>
                  <p className="text-[#5A7A95] text-xs">Total Combined GP</p>
                  <p className="text-white font-bold text-xl">{money(mainForecastGP + totalAlyshaGP)}</p>
                  <p className="text-[#5A7A95] text-[10px]">All sources combined</p>
                </div>
                <div>
                  <p className="text-[#5A7A95] text-xs">Combined P&amp;L</p>
                  <p className={`font-bold text-xl ${(mainForecastGP + totalAlyshaGP - totalFYCostsActual) >= 0 ? 'text-[#059669]' : 'text-red-400'}`}>
                    {money(mainForecastGP + totalAlyshaGP - totalFYCostsActual)}
                  </p>
                  <p className="text-[#5A7A95] text-[10px]">vs {money(totalFYCostsActual)} costs</p>
                </div>
              </div>
              <div className="border-t border-[#2A4A6F] mt-4 pt-3 grid grid-cols-2 gap-6 text-sm">
                <div>
                  <p className="text-[#5A7A95] text-xs">Additional Monthly Rec (End of FY)</p>
                  <p className="text-[#059669] font-bold text-lg">+{money(endOfFYMonthlyRec)}/mo</p>
                  <p className="text-[#5A7A95] text-[10px]">Carrying into following year</p>
                </div>
                <div>
                  <p className="text-[#5A7A95] text-xs">Total FY Costs</p>
                  <p className="text-red-400 font-bold text-lg">{money(totalFYCostsActual)}</p>
                  <p className="text-[#5A7A95] text-[10px]">Unchanged - already included in main forecast</p>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      </>)}

      {/* ── Footer ── */}
      <div className="border-t border-[#2A4A6F] mt-10 pt-6 text-center">
        <p className="text-[#5A7A95] text-xs">
          Unleashed Solutions Ltd &middot; Board Sales Dashboard &middot; FY runs November to October
        </p>
      </div>
    </Layout>
  );
}