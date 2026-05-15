import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/features/auth/AuthContext';
import Layout from '@/widgets/Layout/Layout';
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import EntriesPage from '@/pages/EntriesPage';
import EntryFormPage from '@/pages/EntryFormPage';
import EntryDetailPage from '@/pages/EntryDetailPage';
import StaffPage from '@/pages/StaffPage';
import ManageStaffPage from '@/pages/ManageStaffPage';
import StockPage from '@/pages/StockPage';
import UsersPage from '@/pages/UsersPage';
import RequestsPage from '@/pages/RequestsPage';

// One theme only — clean glassy light. Strip any legacy dark class.
if (typeof document !== 'undefined') {
  document.documentElement.classList.remove('dark');
  document.documentElement.classList.remove('light');
  localStorage.removeItem('kbc_theme');
}

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }} />
    </div>
  );
  return user ? children : <Navigate to="/login" replace />;
};

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="entries" element={<EntriesPage />} />
            <Route path="entries/new" element={<EntryFormPage />} />
            <Route path="entries/:id" element={<EntryDetailPage />} />
            <Route path="entries/:id/edit" element={<EntryFormPage />} />
            <Route path="staff" element={<StaffPage />} />
            <Route path="staff/manage" element={<ManageStaffPage />} />
            <Route path="stock" element={<StockPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="requests" element={<RequestsPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
