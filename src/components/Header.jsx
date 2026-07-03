export default function Header() {
  return (
    <header className="border-b border-[#2A4A6F] bg-[#102943]/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-[#2A4A6F] bg-[#0EA5E9]/10">
            <img src="/assets/mark.png" alt="Unleashed Solutions mark" className="h-8 w-8 object-contain" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#0EA5E9]">Unleashed Solutions</p>
            <h1 className="text-2xl font-bold text-white">Sales Forecast Dashboard</h1>
            <p className="text-sm text-[#5A7A95]">Pipeline, forecasting and rep performance in one view.</p>
          </div>
        </div>
        <img src="/assets/logo-white.png" alt="Unleashed Solutions" className="h-10 w-auto self-start sm:self-center" />
      </div>
    </header>
  );
}
