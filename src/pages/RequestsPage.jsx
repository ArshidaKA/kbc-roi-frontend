import { useEffect, useState } from 'react';
import { requestsApi } from '@/shared/api/index';
import { fmt, fmtDate } from '@/shared/utils/format';
import { Plus, Check, X, Trash2 } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';

const STATUS_BADGE = {
  pending: 'badge-warn',
  approved: 'badge-success',
  rejected: 'badge-danger',
};

const AddModal = ({ onClose, onDone }) => {
  const [form, setForm] = useState({ type: '', amount: '', note: '' });
  const [saving, setSaving] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setSaving(true);
    try { await requestsApi.create({ ...form, amount: Number(form.amount) }); onDone(); onClose(); } catch (err) { alert(err.response?.data?.message || 'Error'); } finally { setSaving(false); }
  };
  return (
    <div className="modal-overlay">
      <div className="modal-content space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-text">New Request</h3>
          <button onClick={onClose} className="text-muted hover:text-text cursor-pointer"><X size={18} /></button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="label">Type</label>
            <input type="text" className="input" placeholder="e.g. Advance, Leave, Purchase" value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} required />
          </div>
          <div>
            <label className="label">Amount (optional)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">₹</span>
              <input type="number" min="0" className="input pl-7" placeholder="0" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="label">Note</label>
            <textarea className="input h-20 resize-none" placeholder="Describe your request..." value={form.note} onChange={e => setForm(p => ({ ...p, note: e.target.value }))} />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost flex-1 justify-center">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">Submit</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default function RequestsPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params = filter !== 'all' ? { status: filter } : {};
      const r = await requestsApi.getAll(params);
      setRequests(r.data);
    } catch (e) {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filter]);

  const updateStatus = async (id, status) => {
    await requestsApi.update(id, { status });
    load();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this request?')) return;
    await requestsApi.delete(id);
    load();
  };

  const isAdmin = ['admin','owner'].includes(user?.role);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-text">Requests</h2>
        <button onClick={() => setShowAdd(true)} className="btn-primary text-sm"><Plus size={15} /> New Request</button>
      </div>

      <div className="flex gap-2">
        {['all','pending','approved','rejected'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all cursor-pointer"
            style={filter === s
              ? { background: 'var(--color-primary)', color: '#fff', boxShadow: '0 2px 8px rgba(139,92,246,0.4)' }
              : { background: 'rgba(255,255,255,0.05)', border: '1px solid var(--color-border)', color: 'var(--color-muted-light)' }
            }>
            {s}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
        ) : requests.length === 0 ? (
          <div className="card text-center py-12 text-muted">No {filter !== 'all' ? filter : ''} requests</div>
        ) : requests.map(r => (
          <div key={r._id} className="card">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-text">{r.type}</span>
                  <span className={STATUS_BADGE[r.status]}>{r.status}</span>
                </div>
                {r.amount > 0 && <p className="text-muted text-sm">Amount: <span className="font-mono text-text">{fmt(r.amount)}</span></p>}
                {r.note && <p className="text-muted-light text-sm mt-1">{r.note}</p>}
                <div className="mt-2 flex items-center gap-3 text-xs text-muted">
                  <span>By: {r.requestedBy?.name}</span>
                  <span>{fmtDate(r.createdAt)}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {isAdmin && r.status === 'pending' && (
                  <>
                    <button onClick={() => updateStatus(r._id, 'approved')} className="p-1.5 rounded cursor-pointer transition-colors" style={{ color: '#64748B' }} onMouseEnter={e => { e.currentTarget.style.color='#10B981'; e.currentTarget.style.background='rgba(16,185,129,0.12)'; }} onMouseLeave={e => { e.currentTarget.style.color='#64748B'; e.currentTarget.style.background='transparent'; }} title="Approve"><Check size={15} /></button>
                    <button onClick={() => updateStatus(r._id, 'rejected')} className="p-1.5 rounded cursor-pointer transition-colors" style={{ color: '#64748B' }} onMouseEnter={e => { e.currentTarget.style.color='#EF4444'; e.currentTarget.style.background='rgba(239,68,68,0.12)'; }} onMouseLeave={e => { e.currentTarget.style.color='#64748B'; e.currentTarget.style.background='transparent'; }} title="Reject"><X size={15} /></button>
                  </>
                )}
                {isAdmin && <button onClick={() => handleDelete(r._id)} className="p-1.5 rounded cursor-pointer transition-colors" style={{ color: '#64748B' }} onMouseEnter={e => { e.currentTarget.style.color='#EF4444'; e.currentTarget.style.background='rgba(239,68,68,0.12)'; }} onMouseLeave={e => { e.currentTarget.style.color='#64748B'; e.currentTarget.style.background='transparent'; }} title="Delete"><Trash2 size={14} /></button>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {showAdd && <AddModal onClose={() => setShowAdd(false)} onDone={load} />}
    </div>
  );
}
