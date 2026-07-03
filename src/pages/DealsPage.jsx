import { useMemo, useState } from 'react';
import { dealTypes, deals, ownerList, stageList } from '../data/salesData';

const cardClass = 'rounded-xl border border-[#2A4A6F] bg-[#1A334F] p-6';
const currency = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 });
const stageBadgeClasses = {
  Lead: 'border-[#8b5cf6]/40 bg-[#8b5cf6]/10 text-[#c4b5fd]',
  'To Be Contacted': 'border-[#06b6d4]/40 bg-[#06b6d4]/10 text-[#67e8f9]',
  Qualified: 'border-[#0EA5E9]/40 bg-[#0EA5E9]/10 text-[#7dd3fc]',
  Quoting: 'border-[#f59e0b]/40 bg-[#f59e0b]/10 text-[#fcd34d]',
  Negotiating: 'border-[#ef4444]/40 bg-[#ef4444]/10 text-[#fca5a5]',
  'Closed-Won': 'border-[#059669]/40 bg-[#059669]/10 text-[#6ee7b7]',
};

export default function DealsPage() {
  const [stage, setStage] = useState('All');
  const [owner, setOwner] = useState('All');
  const [type, setType] = useState('All');
  const [search, setSearch] = useState('');

  const filteredDeals = useMemo(() => {
    const query = search.trim().toLowerCase();
    return deals.filter((deal) => {
      const matchesStage = stage === 'All' || deal.stage === stage;
      const matchesOwner = owner === 'All' || deal.owner === owner;
      const matchesType = type === 'All' || deal.dealType === type;
      const matchesSearch =
        !query ||
        [deal.id, deal.customer, deal.description, deal.serviceType]
          .join(' ')
          .toLowerCase()
          .includes(query);
      return matchesStage && matchesOwner && matchesType && matchesSearch;
    });
  }, [owner, search, stage, type]);

  return (
    <section className={`${cardClass} space-y-6 pb-2`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Deals</h2>
          <p className="text-sm text-[#5A7A95]">Filter by owner, stage or deal type and search across customers and descriptions.</p>
        </div>
        <div className="text-sm text-[#5A7A95]">{filteredDeals.length} deals shown</div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <select value={stage} onChange={(event) => setStage(event.target.value)} className="rounded-xl border border-[#2A4A6F] bg-[#0D2338] px-4 py-3 text-white outline-none">
          <option>All</option>
          {stageList.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <select value={owner} onChange={(event) => setOwner(event.target.value)} className="rounded-xl border border-[#2A4A6F] bg-[#0D2338] px-4 py-3 text-white outline-none">
          <option>All</option>
          {ownerList.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <select value={type} onChange={(event) => setType(event.target.value)} className="rounded-xl border border-[#2A4A6F] bg-[#0D2338] px-4 py-3 text-white outline-none">
          <option>All</option>
          {dealTypes.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search deals"
          className="rounded-xl border border-[#2A4A6F] bg-[#0D2338] px-4 py-3 text-white outline-none placeholder:text-[#5A7A95]"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-[#2A4A6F] text-left text-[#5A7A95]">
              <th className="pb-3 pr-4">ID</th>
              <th className="pb-3 pr-4">Customer</th>
              <th className="pb-3 pr-4">Owner</th>
              <th className="pb-3 pr-4">Stage</th>
              <th className="pb-3 pr-4">Type</th>
              <th className="pb-3 pr-4">Service</th>
              <th className="pb-3 pr-4">Predicted</th>
              <th className="pb-3 pr-4">Billing</th>
              <th className="pb-3 pr-4">Revenue</th>
              <th className="pb-3 pr-4">Profit</th>
              <th className="pb-3">Description</th>
            </tr>
          </thead>
          <tbody>
            {filteredDeals.map((deal) => (
              <tr key={deal.id} className="border-b border-[#2A4A6F]/60 align-top text-white">
                <td className="py-4 pr-4 font-semibold text-[#0EA5E9]">{deal.id}</td>
                <td className="py-4 pr-4">{deal.customer}</td>
                <td className="py-4 pr-4">{deal.owner}</td>
                <td className="py-4 pr-4">
                  <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${stageBadgeClasses[deal.stage]}`}>
                    {deal.stage}
                  </span>
                </td>
                <td className="py-4 pr-4">{deal.dealType}</td>
                <td className="py-4 pr-4">{deal.serviceType}</td>
                <td className="py-4 pr-4">{deal.predictedMonth}</td>
                <td className="py-4 pr-4">{deal.billingStart}</td>
                <td className="py-4 pr-4">{currency.format(deal.revenue)}</td>
                <td className="py-4 pr-4">{currency.format(deal.profit)}</td>
                <td className="py-4 text-[#CBD5E1]">{deal.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
