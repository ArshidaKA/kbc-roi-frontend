import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '@/widgets/Sidebar/Sidebar';
import { Menu } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { entriesApi } from '@/shared/api/index';

const TITLES = {
  '/dashboard': 'Dashboard',
  '/entries': 'Entries',
  '/entries/new': 'New Entry',
  '/staff': 'Staff',
  '/staff/manage': 'Manage Staff',
  '/stock': 'Stock',
  '/users': 'Users',
  '/requests': 'Requests',
};

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { pathname } = useLocation();
  const { user } = useAuth();
  const title = Object.entries(TITLES).find(([k]) => pathname.startsWith(k) && (TITLES[pathname] || k === pathname))?.[1] || 'KBC';

  useEffect(() => {
    if (!user) return;
    const day = new Date().toISOString().slice(0, 10);
    const key = `kbc_ensure_entry_${day}`;
    if (localStorage.getItem(key)) return;
    entriesApi.ensureToday()
      .then(() => localStorage.setItem(key, '1'))
      .catch(() => {});
  }, [user]);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 lg:ml-60">
        <header
          className="h-14 flex items-center px-4 gap-3 flex-shrink-0"
          style={{
            background: 'rgba(9, 9, 15, 0.88)',
            backdropFilter: 'blur(20px) saturate(150%)',
            WebkitBackdropFilter: 'blur(20px) saturate(150%)',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-1 cursor-pointer" style={{ color: '#64748B' }}>
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <div className="w-2 h-2 rounded-full" style={{ background: 'var(--color-primary)', boxShadow: '0 0 8px rgba(139,92,246,0.7)' }} />
            <h1 className="font-semibold text-sm" style={{ color: '#F1F5F9' }}>{title}</h1>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
