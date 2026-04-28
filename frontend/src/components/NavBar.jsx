import { NavLink } from 'react-router-dom';
import { Home, Dumbbell, History, TrendingUp, Settings, Anchor, Flag } from 'lucide-react';

const navItems = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/rutina', icon: Dumbbell, label: 'Rutina' },
  { to: '/campanas', icon: Flag, label: 'Campañas' },
  { to: '/historial', icon: History, label: 'Historial' },
  { to: '/ajustes', icon: Settings, label: 'Ajustes' },
];

export const NavBar = () => (
  <>
    {/* Header */}
    <header className="fixed top-0 left-0 right-0 z-40 bg-navy-900/80 backdrop-blur-md border-b border-white/10 px-4 py-3 flex items-center gap-2">
      <Anchor size={20} className="text-neon" />
      <span className="font-black text-lg tracking-wider text-white">MLP <span className="text-neon">FITNESS</span></span>
    </header>

    {/* Bottom nav */}
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-navy-900/90 backdrop-blur-md border-t border-white/10 px-2 pb-safe">
      <div className="flex justify-around items-center py-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `nav-item ${isActive ? 'text-neon' : 'text-white/50'}`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={22} strokeWidth={isActive ? 2.5 : 1.5} />
                <span className="text-[10px] font-semibold">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  </>
);
