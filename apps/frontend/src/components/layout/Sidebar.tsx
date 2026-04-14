import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, FileText, Bell, Settings, LogOut, ChevronRight
} from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';

const NAV = [
  { to: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/contracts',  icon: FileText,         label: 'Verträge' },
  { to: '/reminders',  icon: Bell,             label: 'Erinnerungen' },
  { to: '/settings',   icon: Settings,         label: 'Einstellungen' },
];

export function Sidebar() {
  const { user, logout } = useAuthStore();

  return (
    <aside className="fixed top-0 left-0 h-screen w-[240px] bg-[#07111f] flex flex-col z-30">

      {/* Logo-Bereich */}
      <div className="px-5 py-5 border-b border-white/8">
        <div className="flex items-center gap-3">
          {/* Logo-Slot: Bild falls vorhanden, sonst Text-Fallback */}
          <div className="w-8 h-8 rounded-lg bg-[#f59e0b] flex items-center justify-center flex-shrink-0 overflow-hidden">
            <img
              src="/logo.png"
              alt="Logo"
              className="w-full h-full object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
                (e.target as HTMLImageElement).parentElement!.innerHTML =
                  '<span class="text-[#07111f] font-bold text-sm">V</span>';
              }}
            />
          </div>
          <div className="overflow-hidden">
            <p className="text-white text-sm font-semibold leading-tight truncate">
              Vertragsverwaltung
            </p>
            <p className="text-white/40 text-xs truncate">{user?.tenantId?.slice(0, 8)}…</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group
              ${isActive
                ? 'bg-white/12 text-white'
                : 'text-white/55 hover:text-white hover:bg-white/6'}`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={16} className={isActive ? 'text-[#fbbf24]' : ''} />
                <span className="flex-1">{label}</span>
                {isActive && <ChevronRight size={14} className="text-white/30" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User-Footer */}
      <div className="px-3 pb-4 border-t border-white/8 pt-3">
        <div className="flex items-center gap-3 px-3 py-2 mb-1">
          <div className="w-7 h-7 rounded-full bg-[#235191] flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-semibold">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </span>
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-white text-xs font-medium truncate">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-white/40 text-[11px] truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-white/50 hover:text-white hover:bg-white/6 transition-all duration-150"
        >
          <LogOut size={14} />
          Abmelden
        </button>
      </div>
    </aside>
  );
}
