export default function Header() {
  return (
    <header className="bg-[#0D2338] border-b border-[#1A334F] px-8 py-6">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-4">
          <img src={import.meta.env.BASE_URL + 'assets/logo-white.png'} alt="Unleashed Solutions" className="h-12" />
        </div>
        <div className="text-right">
          <p className="text-[#0EA5E9] text-sm font-semibold">Sales Forecast Platform</p>
          <p className="text-[#5A7A95] text-xs">Unleashed Solutions Ltd</p>
        </div>
      </div>
    </header>
  );
}
