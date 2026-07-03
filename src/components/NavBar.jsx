import { NavLink } from 'react-router-dom';

const links = [
  { to: '/', label: 'Overview', end: true },
  { to: '/pipeline', label: 'Pipeline' },
  { to: '/reps', label: 'Sales Reps' },
  { to: '/forecast', label: 'Forecast' },
  { to: '/deals', label: 'Deals' },
];

export default function NavBar() {
  return (
    <nav className="mx-auto max-w-7xl px-6 py-5">
      <div className="flex flex-wrap gap-3 rounded-xl border border-[#2A4A6F] bg-[#1A334F] p-2">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) =>
              [
                'rounded-xl border px-4 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'border-[#0EA5E9] bg-[#0EA5E9]/10 text-[#0EA5E9]'
                  : 'border-transparent text-[#5A7A95] hover:border-[#2A4A6F] hover:text-white',
              ].join(' ')
            }
          >
            {link.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
