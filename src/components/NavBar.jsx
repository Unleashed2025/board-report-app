import { NavLink, Link } from 'react-router-dom';

const links = [
  { to: '/overview', label: 'Overview' },
  { to: '/pipeline', label: 'Pipeline' },
  { to: '/reps', label: 'Sales Reps' },
  { to: '/forecast', label: 'Forecast' },
  { to: '/deals', label: 'Deals' },
];

export default function NavBar() {
  return (
    <nav className="border-b border-[#1A334F] bg-[#0D2338] sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-4">
        <Link to="/" className="text-[#5A7A95] hover:text-white text-xs font-medium mr-2">← Home</Link>
        <div className="flex flex-wrap gap-2">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                [
                  'px-4 py-1.5 text-sm font-medium rounded-lg transition-colors',
                  isActive
                    ? 'bg-[#0EA5E9]/10 text-[#0EA5E9] border border-[#0EA5E9]'
                    : 'text-[#5A7A95] hover:text-white border border-transparent',
                ].join(' ')
              }
            >
              {link.label}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
}
