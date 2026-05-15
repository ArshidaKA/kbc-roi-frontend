import { useEffect, useState } from 'react';
import { usersApi, authApi } from '@/shared/api/index';
import { fmtDate } from '@/shared/utils/format';
import { Pencil, Trash2, Plus, KeyRound, X, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import ConfirmModal from '@/shared/ui/ConfirmModal';

const PAGE_SIZE = 10;
const ROLES = ['owner','admin','staff','user'];

const UserModal = ({ user, onClose, onDone }) => {
  const isEdit = Boolean(user?._id);
  const [form, setForm] = useState({ name: user?.name || '', email: user?.email || '', role: user?.role || 'user', password: '' });
  const [saveConfirm, setSaveConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  const doSave = async () => {
    setSaving(true);
    try {
      if (isEdit) await usersApi.update(user._id, { name: form.name, email: form.email, role: form.role });
      else await authApi.register(form);
      onDone(); onClose();
    } catch (err) { alert(err.response?.data?.message || 'Error'); } finally { setSaving(false); setSaveConfirm(false); }
  };

  if (saveConfirm) {
    return (
      <ConfirmModal
        title={isEdit ? 'Save user changes?' : 'Create this user?'}
        confirmText={isEdit ? 'Save' : 'Create'}
        onCancel={() => setSaveConfirm(false)}
        onConfirm={doSave}
        loading={saving}
      >
        <p><span className="text-text font-medium">{form.name}</span> · {form.email}</p>
        <p className="mt-1">Role: <span className="text-text">{form.role}</span></p>
      </ConfirmModal>
    );
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-text">{isEdit ? 'Edit User' : 'Add User'}</h3>
          <button type="button" onClick={onClose} className="text-muted hover:text-text cursor-pointer"><X size={18} /></button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); setSaveConfirm(true); }} className="space-y-3">
          <div>
            <label className="label">Name</label>
            <input type="text" className="input" placeholder="Full name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
          </div>
          <div>
            <label className="label">Email</label>
            <input type="email" className="input" placeholder="email@kbc.com" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required />
          </div>
          {!isEdit && (
            <div>
              <label className="label">Password</label>
              <input type="password" className="input" placeholder="••••••••" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required />
            </div>
          )}
          <div>
            <label className="label">Role</label>
            <select className="select" value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost flex-1 justify-center">Cancel</button>
            <button type="submit" className="btn-primary flex-1 justify-center">
              <Check size={15} />
              {isEdit ? 'Review & update' : 'Review & add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const ResetPwModal = ({ user, onClose }) => {
  const [pw, setPw] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setConfirmOpen(true);
  };
  const doReset = async () => {
    setSaving(true);
    try { await usersApi.resetPassword(user._id, { password: pw }); alert('Password reset'); setConfirmOpen(false); onClose(); } catch (err) { alert(err.response?.data?.message || 'Error'); } finally { setSaving(false); }
  };
  if (confirmOpen) {
    return (
      <ConfirmModal title="Reset password?" confirmText="Reset" onCancel={() => setConfirmOpen(false)} onConfirm={doReset} loading={saving}>
        Set a new password for <span className="font-medium text-text">{user.name}</span>.
      </ConfirmModal>
    );
  }
  return (
    <div className="modal-overlay">
      <div className="modal-content space-y-4">
        <h3 className="font-semibold text-text">Reset Password — {user.name}</h3>
        <form onSubmit={submit} className="space-y-3">
          <input type="password" className="input" placeholder="New password" value={pw} onChange={e => setPw(e.target.value)} required minLength={6} />
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="btn-ghost flex-1 justify-center">Cancel</button>
            <button type="submit" className="btn-primary flex-1 justify-center">Continue</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default function UsersPage() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [resetModal, setResetModal] = useState(null);
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    setLoading(true);
    try { const r = await usersApi.getAll(); setUsers(r.data); } catch (e) {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { setPage(1); }, [users.length]);

  const totalPages = Math.max(1, Math.ceil(users.length / PAGE_SIZE));
  const slice = users.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const confirmDeleteUser = async () => {
    if (!deleteTarget || deleteTarget._id === me._id) return;
    setDeleting(true);
    try {
      await usersApi.delete(deleteTarget._id);
      setDeleteTarget(null);
      load();
    } catch (err) { alert(err.response?.data?.message || 'Error'); }
    finally { setDeleting(false); }
  };

  const roleBadge = (r) => {
    const cls = { owner: 'badge-warn', admin: 'badge-primary', staff: 'badge-success', user: 'badge-primary' };
    return <span className={cls[r] || cls.user}>{r}</span>;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-text">Users</h2>
        <button type="button" onClick={() => setModal({})} className="btn-primary text-sm"><Plus size={15} /> Add User</button>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-2 border-b border-border flex justify-between items-center">
          <span className="text-xs text-muted">{users.length} user(s) · {PAGE_SIZE} per page</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border">
              <tr>
                {['Name','Email','Role','Joined','Actions'].map(h => (
                  <th key={h} className={`px-4 py-3 text-xs font-medium text-muted ${h === 'Actions' ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="py-12 text-center"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" /></td></tr>
              ) : slice.map(u => (
                <tr key={u._id} className="transition-colors" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }} onMouseEnter={e => e.currentTarget.style.background='rgba(139,92,246,0.06)'} onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                  <td className="px-4 py-3 font-medium" style={{ color: '#F1F5F9' }}>
                    {u.name}
                    {u._id === me._id && <span className="ml-2 badge-primary">You</span>}
                  </td>
                  <td className="px-4 py-3" style={{ color: '#94A3B8' }}>{u.email}</td>
                  <td className="px-4 py-3">{roleBadge(u.role)}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: '#94A3B8' }}>{fmtDate(u.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button type="button" onClick={() => setModal(u)} className="p-1.5 rounded cursor-pointer transition-colors" style={{ color: '#64748B' }} onMouseEnter={e => { e.currentTarget.style.color='#A78BFA'; e.currentTarget.style.background='rgba(139,92,246,0.12)'; }} onMouseLeave={e => { e.currentTarget.style.color='#64748B'; e.currentTarget.style.background='transparent'; }} title="Edit"><Pencil size={14} /></button>
                      <button type="button" onClick={() => setResetModal(u)} className="p-1.5 rounded cursor-pointer transition-colors" style={{ color: '#64748B' }} onMouseEnter={e => { e.currentTarget.style.color='#8B5CF6'; e.currentTarget.style.background='rgba(139,92,246,0.12)'; }} onMouseLeave={e => { e.currentTarget.style.color='#64748B'; e.currentTarget.style.background='transparent'; }} title="Reset password"><KeyRound size={14} /></button>
                      <button type="button" onClick={() => { if (u._id === me._id) { alert('Cannot delete yourself'); return; } setDeleteTarget(u); }} className="p-1.5 rounded cursor-pointer transition-colors" style={{ color: '#64748B' }} onMouseEnter={e => { e.currentTarget.style.color='#EF4444'; e.currentTarget.style.background='rgba(239,68,68,0.12)'; }} onMouseLeave={e => { e.currentTarget.style.color='#64748B'; e.currentTarget.style.background='transparent'; }} title="Delete"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && users.length === 0 && <tr><td colSpan={5} className="py-12 text-center text-muted">No users</td></tr>}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-2 border-t border-border">
            <span className="text-xs text-muted">Page {page} / {totalPages}</span>
            <div className="flex gap-2">
              <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="btn-ghost text-xs py-1 px-2 disabled:opacity-40"><ChevronLeft size={14} /></button>
              <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="btn-ghost text-xs py-1 px-2 disabled:opacity-40"><ChevronRight size={14} /></button>
            </div>
          </div>
        )}
      </div>

      {modal !== null && <UserModal user={modal._id ? modal : null} onClose={() => setModal(null)} onDone={load} />}
      {resetModal && <ResetPwModal user={resetModal} onClose={() => setResetModal(null)} />}

      {deleteTarget && (
        <ConfirmModal
          title="Delete user?"
          danger
          confirmText="Delete"
          onCancel={() => !deleting && setDeleteTarget(null)}
          onConfirm={confirmDeleteUser}
          loading={deleting}
        >
          Permanently delete <span className="font-medium text-text">{deleteTarget.name}</span> ({deleteTarget.email})? This cannot be undone.
        </ConfirmModal>
      )}
    </div>
  );
}
