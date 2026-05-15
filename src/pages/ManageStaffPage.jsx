import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { staffApi } from '@/shared/api/index';
import { fmt, fmtDateInput } from '@/shared/utils/format';
import { Plus, Pencil, Trash2, ArrowLeft, X, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import ConfirmModal from '@/shared/ui/ConfirmModal';

const PAGE_SIZE = 10;

const StaffModal = ({ staff, onClose, onDone }) => {
  const isEdit = Boolean(staff?._id);
  const [form, setForm] = useState({
    name:     staff?.name     || '',
    role:     staff?.role     || '',
    salary:   staff?.salary   ?? '',
    joinedAt: staff?.joinedAt ? fmtDateInput(staff.joinedAt) : fmtDateInput(new Date()),
  });
  const [saveConfirm, setSaveConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  const doSave = async () => {
    setSaving(true);
    try {
      const payload = { ...form, salary: Number(form.salary) };
      if (isEdit) await staffApi.update(staff._id, payload);
      else        await staffApi.create(payload);
      onDone();
      onClose();
    } catch (err) { alert(err.response?.data?.message || 'Error'); }
    finally { setSaving(false); setSaveConfirm(false); }
  };

  if (saveConfirm) {
    return (
      <ConfirmModal
        title={isEdit ? 'Save staff changes?' : 'Add this staff member?'}
        confirmText={isEdit ? 'Save' : 'Create'}
        onCancel={() => setSaveConfirm(false)}
        onConfirm={doSave}
        loading={saving}
      >
        <p><span className="text-text font-medium">{form.name}</span> · {form.role}</p>
        <p className="mt-2">Monthly salary: <span className="font-mono text-text">{fmt(Number(form.salary) || 0)}</span></p>
        {!isEdit && <p className="mt-1 text-xs">Joined: {form.joinedAt}</p>}
      </ConfirmModal>
    );
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-text">{isEdit ? 'Edit Staff' : 'Add New Staff'}</h3>
          <button type="button" onClick={onClose} className="text-muted hover:text-text cursor-pointer"><X size={18} /></button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); setSaveConfirm(true); }} className="space-y-3">
          <div>
            <label className="label">Name</label>
            <input type="text" className="input" placeholder="Enter full name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
          </div>
          <div>
            <label className="label">Role</label>
            <input type="text" className="input" placeholder="Job title" value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Monthly salary (editable)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">₹</span>
                <input type="number" min="0" className="input pl-7" placeholder="Salary" value={form.salary} onChange={e => setForm(p => ({ ...p, salary: e.target.value }))} required />
              </div>
            </div>
            <div>
              <label className="label">Joined Date</label>
              <input type="date" className="input" value={form.joinedAt} onChange={e => setForm(p => ({ ...p, joinedAt: e.target.value }))} required disabled={isEdit} />
            </div>
          </div>
          {!isEdit && <p className="text-xs text-muted">Monthly salary auto-bills from this date forward.</p>}
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

export default function ManageStaffPage() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [page, setPage] = useState(1);
  const [removeTarget, setRemoveTarget] = useState(null);
  const [removing, setRemoving] = useState(false);

  const load = async () => {
    setLoading(true);
    try { const r = await staffApi.getAll(); setStaff(r.data); } catch (e) {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => { setPage(1); }, [staff.length]);

  const totalPages = Math.max(1, Math.ceil(staff.length / PAGE_SIZE));
  const slice = staff.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const confirmRemoveStaff = async () => {
    if (!removeTarget) return;
    setRemoving(true);
    try {
      await staffApi.delete(removeTarget.id);
      setRemoveTarget(null);
      load();
    } catch (err) { alert(err.response?.data?.message || 'Error'); }
    finally { setRemoving(false); }
  };

  const totalSalary = staff.reduce((s, st) => s + st.salary, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link to="/staff" className="btn-ghost text-sm py-1.5 px-2"><ArrowLeft size={16} /></Link>
        <h2 className="text-lg font-bold text-text flex-1">Manage Staff</h2>
        <button type="button" onClick={() => setModal({})} className="btn-primary text-sm"><Plus size={15} /> Add Staff</button>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-3 flex justify-between items-center flex-wrap gap-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <span className="text-xs" style={{ color: '#94A3B8' }}>{staff.length} staff · Total salary: {fmt(totalSalary)}/month · {PAGE_SIZE} per page</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border">
              <tr>
                {['Name','Role','Salary','Actions'].map(h => (
                  <th key={h} className={`px-4 py-3 text-xs font-medium text-muted ${h === 'Actions' ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="py-12 text-center"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" /></td></tr>
              ) : staff.length === 0 ? (
                <tr><td colSpan={4} className="py-12 text-center text-muted">No staff found</td></tr>
              ) : slice.map(s => (
                <tr key={s._id} className="transition-colors" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }} onMouseEnter={e => e.currentTarget.style.background='rgba(139,92,246,0.06)'} onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                  <td className="px-4 py-3 font-medium" style={{ color: '#F1F5F9' }}>{s.name}</td>
                  <td className="px-4 py-3" style={{ color: '#94A3B8' }}>{s.role}</td>
                  <td className="px-4 py-3 font-mono" style={{ color: '#F1F5F9' }}>{fmt(s.salary)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        type="button"
                        onClick={() => setModal(s)}
                        className="p-1.5 rounded cursor-pointer transition-colors"
                        style={{ color: '#64748B' }}
                        onMouseEnter={e => { e.currentTarget.style.color='#A78BFA'; e.currentTarget.style.background='rgba(139,92,246,0.12)'; }}
                        onMouseLeave={e => { e.currentTarget.style.color='#64748B'; e.currentTarget.style.background='transparent'; }}
                        title="Edit name, role & salary"
                      ><Pencil size={14} /></button>
                      <button
                        type="button"
                        onClick={() => setRemoveTarget({ id: s._id, name: s.name })}
                        className="p-1.5 rounded cursor-pointer transition-colors"
                        style={{ color: '#64748B' }}
                        onMouseEnter={e => { e.currentTarget.style.color='#EF4444'; e.currentTarget.style.background='rgba(239,68,68,0.12)'; }}
                        onMouseLeave={e => { e.currentTarget.style.color='#64748B'; e.currentTarget.style.background='transparent'; }}
                        title="Remove staff (deactivate)"
                      ><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
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

      {modal !== null && <StaffModal staff={modal._id ? modal : null} onClose={() => setModal(null)} onDone={load} />}

      {removeTarget && (
        <ConfirmModal
          title="Remove staff member?"
          danger
          confirmText="Remove"
          onCancel={() => !removing && setRemoveTarget(null)}
          onConfirm={confirmRemoveStaff}
          loading={removing}
        >
          Deactivate <span className="font-medium text-text">{removeTarget.name}</span>? They will no longer appear in active staff lists. Existing salary history is kept.
        </ConfirmModal>
      )}
    </div>
  );
}
