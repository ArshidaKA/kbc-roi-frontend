import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import {
  LayoutDashboard, BookOpen, Users, ClipboardList,
  UserCheck, Package, LogOut, ChevronRight
} from 'lucide-react';

const NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/entries',   icon: BookOpen,        label: 'Entries' },
  { to: '/users',     icon: Users,           label: 'Users' },
  { to: '/requests',  icon: ClipboardList,   label: 'Requests' },
  { to: '/staff',     icon: UserCheck,       label: 'Staff' },
  { to: '/stock',     icon: Package,         label: 'Stock' },
];

export default function Sidebar({ open, onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-20 lg:hidden"
          style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)' }}
          onClick={onClose}
        />
      )}
      <aside
        className={`fixed top-0 left-0 h-full w-60 z-30 flex flex-col transition-transform duration-300 ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
        style={{
          background: 'rgba(11, 11, 20, 0.93)',
          backdropFilter: 'blur(24px) saturate(150%)',
          WebkitBackdropFilter: 'blur(24px) saturate(150%)',
          borderRight: '1px solid rgba(255,255,255,0.07)',
          boxShadow: '4px 0 32px rgba(0,0,0,0.5)',
        }}
      >
        {/* Logo */}
        <div className="px-5 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center font-mono font-bold text-white text-sm"
              style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)', boxShadow: '0 4px 14px rgba(124,58,237,0.45)' }}>
              KBC
            </div>
            <div>
              <p className="font-semibold text-sm leading-tight" style={{ color: '#F1F5F9' }}>KBC Tracker</p>
              <p className="text-xs" style={{ color: '#64748B' }}>ROI Management</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to} to={to} onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 group cursor-pointer ${
                  isActive ? 'font-semibold' : ''
                }`
              }
              style={({ isActive }) => isActive ? {
                background: 'linear-gradient(135deg, rgba(139,92,246,0.22) 0%, rgba(124,58,237,0.15) 100%)',
                color: '#A78BFA',
                boxShadow: '0 2px 8px rgba(124,58,237,0.18)',
              } : { color: '#64748B' }}
              onMouseEnter={e => { if (!e.currentTarget.classList.contains('font-semibold')) e.currentTarget.style.color = '#94A3B8'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
              onMouseLeave={e => { if (!e.currentTarget.classList.contains('font-semibold')) { e.currentTarget.style.color = '#64748B'; e.currentTarget.style.background = 'transparent'; } }}
            >
              {({ isActive }) => (
                <>
                  <Icon size={17} style={{ color: isActive ? '#8B5CF6' : '#64748B' }} />
                  <span className="flex-1">{label}</span>
                  {isActive && <ChevronRight size={14} style={{ color: '#8B5CF6' }} />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="px-3 pb-4 pt-3 space-y-1" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="px-3 py-2">
            <p className="text-sm font-medium truncate" style={{ color: '#F1F5F9' }}>{user?.name}</p>
            <p className="text-xs capitalize" style={{ color: '#64748B' }}>{user?.role}</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 cursor-pointer"
            style={{ color: '#64748B' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.12)'; e.currentTarget.style.color = '#EF4444'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748B'; }}
          >
            <LogOut size={17} />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}
