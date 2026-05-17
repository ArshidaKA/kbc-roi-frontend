import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { staffApi } from '@/shared/api/index';
import { fmt, fmtDate, fmtDateInput, ACCOUNTS, ACCOUNT_LABELS } from '@/shared/utils/format';
import { useAuth } from '@/features/auth/AuthContext';
import ConfirmModal from '@/shared/ui/ConfirmModal';
import {
  ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Plus, Pencil, Trash2,
  X, Check, Calendar, Search
} from 'lucide-react';

const STAFF_PAGE_SIZE = 6;
const TABLE_PAGE_SIZE = 10;
const CARD_SECTION_PAGE_SIZE = 6;

const PERIOD_FILTERS = [
  { value: 'today',      label: 'Today' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'this_year',  label: 'This Year' },
  { value: 'all',        label: 'All Time' },
  { value: 'custom',     label: 'Custom Range' },
];

const monthKey = (d) => {
  const dt = d instanceof Date ? d : new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
};

const monthKeysBetweenInclusive = (startStr, endStr) => {
  const keys = new Set();
  if (!startStr || !endStr) return keys;
  let d = new Date(`${startStr.slice(0, 10)}T12:00:00`);
  const end = new Date(`${endStr.slice(0, 10)}T12:00:00`);
  const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);
  d = new Date(d.getFullYear(), d.getMonth(), 1);
  while (d <= endMonth) {
    keys.add(monthKey(d));
    d.setMonth(d.getMonth() + 1);
  }
  return keys;
};

const billingMonthKeysForSummary = (period, custom) => {
  const now = new Date();
  if (period === 'all') return null;
  if (period === 'today' || period === 'this_month') return new Set([monthKey(now)]);
  if (period === 'last_month') return new Set([monthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1))]);
  if (period === 'this_year') {
    const y = now.getFullYear();
    const keys = new Set();
    for (let m = 1; m <= 12; m += 1) keys.add(`${y}-${String(m).padStart(2, '0')}`);
    return keys;
  }
  if (period === 'custom' && custom.start && custom.end) return monthKeysBetweenInclusive(custom.start, custom.end);
  return new Set([monthKey(now)]);
};

const formatMonthKeyPretty = (key) => {
  const [y, mo] = key.split('-');
  const d = new Date(parseInt(y, 10), parseInt(mo, 10) - 1, 1);
  return d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
};

const describeBillingMonthsLabel = (keys) => {
  if (!keys || keys.size === 0) return '—';
  const sorted = [...keys].sort();
  if (sorted.length === 1) return `${formatMonthKeyPretty(sorted[0])} payroll`;
  return `${formatMonthKeyPretty(sorted[0])} – ${formatMonthKeyPretty(sorted[sorted.length - 1])} (${sorted.length} mo.)`;
};

const sumSalaryCreditsInMonths = (staffList, monthKeysSet) => {
  if (!monthKeysSet || monthKeysSet.size === 0) return 0;
  let sum = 0;
  (staffList || []).forEach((s) => {
    (s.salaryCredits || []).forEach((c) => {
      if (monthKeysSet.has(c.month)) sum += c.amount || 0;
    });
  });
  return sum;
};

const getPeriodRange = (period, custom) => {
  const now = new Date();
  switch (period) {
    case 'today': {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      return { start, end };
    }
    case 'this_month':
      return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999) };
    case 'last_month':
      return { start: new Date(now.getFullYear(), now.getMonth() - 1, 1), end: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999) };
    case 'this_year':
      return { start: new Date(now.getFullYear(), 0, 1), end: new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999) };
    case 'custom':
      return { start: custom.start ? new Date(custom.start) : null, end: custom.end ? new Date(custom.end + 'T23:59:59') : null };
    default: return { start: null, end: null };
  }
};

const filterSettlements = (settlements, period, custom) => {
  if (period === 'all') return settlements || [];
  const { start, end } = getPeriodRange(period, custom);
  return (settlements || []).filter(s => {
    const d = new Date(s.date);
    if (start && d < start) return false;
    if (end && d > end) return false;
    return true;
  });
};

const filterSalaryCredits = (credits, period, custom) => {
  const list = credits || [];
  if (period === 'all') return list;
  const now = new Date();
  if (period === 'today' || period === 'this_month') return list.filter(c => c.month === monthKey(now));
  if (period === 'last_month') return list.filter(c => c.month === monthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1)));
  if (period === 'this_year') return list.filter(c => (c.month || '').startsWith(`${now.getFullYear()}-`));
  if (period === 'custom' && custom.start && custom.end) {
    const sm = custom.start.slice(0, 7);
    const em = custom.end.slice(0, 7);
    return list.filter(c => c.month >= sm && c.month <= em);
  }
  return list;
};

const periodDescription = (period, custom) => {
  switch (period) {
    case 'all': return 'all-time';
    case 'today': return 'today';
    case 'this_month': return 'this month';
    case 'last_month': return 'last month';
    case 'this_year': return 'this calendar year';
    case 'custom': return (custom.start && custom.end) ? `${custom.start} → ${custom.end}` : 'custom range';
    default: return period;
  }
};

const formatMonth = (key) => {
  const [y, m] = key.split('-');
  return new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
};

const Skeleton = ({ style = {} }) => (
  <div style={{
    borderRadius: 8,
    background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s infinite',
    ...style,
  }} />
);

const SettleModal = ({ staff, settlement, onClose, onDone }) => {
  const isEdit = Boolean(settlement?._id);
  const [form, setForm] = useState({
    amount:      settlement?.amount ?? '',
    fromAccount: settlement?.fromAccount ?? '',
    note:        settlement?.note ?? '',
    date:        settlement?.date ? fmtDateInput(settlement.date) : fmtDateInput(new Date()),
  });
  const [saveConfirm, setSaveConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  const doSave = async () => {
    setSaving(true);
    try {
      const payload = { ...form, amount: Number(form.amount), date: form.date };
      if (isEdit) await staffApi.updateSettlement(staff._id, settlement._id, payload);
      else        await staffApi.addSettlement(staff._id, payload);
      onDone(); onClose();
    } catch (err) { alert(err.response?.data?.message || 'Error'); }
    finally { setSaving(false); setSaveConfirm(false); }
  };

  if (saveConfirm) {
    return (
      <ConfirmModal title={isEdit ? 'Update this settlement?' : 'Record this settlement?'} confirmText={isEdit ? 'Update' : 'Record payment'} onCancel={() => setSaveConfirm(false)} onConfirm={doSave} loading={saving}>
        <p><span className="text-text font-medium">{staff.name}</span> · {fmtDate(form.date)} · {fmt(Number(form.amount) || 0)}</p>
        <p className="mt-2">Account: {(ACCOUNTS.find(a => a.value === form.fromAccount)?.label) || form.fromAccount || '—'}</p>
        {form.note ? <p className="mt-1">Note: {form.note}</p> : null}
      </ConfirmModal>
    );
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold" style={{ color: '#F1F5F9' }}>{isEdit ? 'Edit Settlement' : `Settle — ${staff.name}`}</h3>
          <button type="button" onClick={onClose} className="p-1 cursor-pointer" style={{ color: '#94A3B8' }}><X size={18} /></button>
        </div>
        {!isEdit && (
          <p className="text-xs" style={{ color: '#94A3B8' }}>
            Billed (all-time): <span className="font-mono" style={{ color: '#F1F5F9' }}>{fmt(staff.totalBilled)}</span> · Outstanding: <span className="font-mono" style={{ color: '#F59E0B' }}>{fmt(staff.outstanding)}</span>
          </p>
        )}
        <form onSubmit={e => { e.preventDefault(); setSaveConfirm(true); }} className="space-y-3">
          <div>
            <label className="label">Date</label>
            <input type="date" className="input" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} required />
          </div>
          <div>
            <label className="label">Amount</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: '#94A3B8' }}>₹</span>
              <input type="number" min="1" className="input pl-7" placeholder="0" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} required />
            </div>
          </div>
          <div>
            <label className="label">From Account</label>
            <select className="select" value={form.fromAccount} onChange={e => setForm(p => ({ ...p, fromAccount: e.target.value }))}>
              <option value="">— account —</option>
              {ACCOUNTS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Note</label>
            <input type="text" className="input" placeholder="Note (optional)" value={form.note} onChange={e => setForm(p => ({ ...p, note: e.target.value }))} />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost flex-1 justify-center">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center"><Check size={15} />{isEdit ? 'Review & update' : 'Review & settle'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const StaffCard = ({ s, filteredSettlements, filteredCredits, onAdd, onEdit, onDelete, expanded, onToggle, canRemoveStaff, onRequestRemoveStaff }) => {
  const [billPage, setBillPage] = useState(1);
  const [payPage, setPayPage] = useState(1);
  useEffect(() => { setBillPage(1); setPayPage(1); }, [expanded, filteredCredits, filteredSettlements]);

  const sortedCredits = useMemo(() => [...filteredCredits].sort((a, b) => b.month.localeCompare(a.month)), [filteredCredits]);
  const sortedPay = useMemo(() => [...filteredSettlements].sort((a, b) => new Date(b.date) - new Date(a.date)), [filteredSettlements]);
  const billPages = Math.max(1, Math.ceil(sortedCredits.length / CARD_SECTION_PAGE_SIZE));
  const payPages  = Math.max(1, Math.ceil(sortedPay.length  / CARD_SECTION_PAGE_SIZE));
  const billSlice = sortedCredits.slice((billPage - 1) * CARD_SECTION_PAGE_SIZE, billPage * CARD_SECTION_PAGE_SIZE);
  const paySlice  = sortedPay.slice((payPage - 1) * CARD_SECTION_PAGE_SIZE, payPage * CARD_SECTION_PAGE_SIZE);

  const periodBilled      = filteredCredits.reduce((sum, c) => sum + (c.amount || 0), 0);
  const periodSettled     = filteredSettlements.reduce((sum, st) => sum + (st.amount || 0), 0);
  const periodOutstanding = periodBilled - periodSettled;
  const pct = periodBilled > 0 ? Math.round((periodSettled / periodBilled) * 100) : (periodSettled > 0 ? 100 : 0);

  return (
    <div className="card p-0 overflow-hidden">
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium" style={{ color: '#F1F5F9' }}>{s.name}</p>
            <p className="text-xs" style={{ color: '#94A3B8' }}>{s.role} · {filteredCredits.length} bill(s) in period</p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => onAdd(s)} className="btn-primary text-xs py-1.5 px-3"><Plus size={12} /> Settle</button>
            {canRemoveStaff && (
              <button type="button" onClick={() => onRequestRemoveStaff(s)} className="btn-ghost text-xs py-1.5 px-2 border border-border" style={{ color: '#94A3B8' }} title="Deactivate staff"><Trash2 size={12} /></button>
            )}
            <button type="button" onClick={onToggle} className="p-1 cursor-pointer" style={{ color: '#94A3B8' }}>
              {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
          {[
            { label: 'Per month',         value: fmt(s.salary),          color: '#F1F5F9' },
            { label: 'Billed in period',  value: fmt(periodBilled),      color: '#F1F5F9' },
            { label: 'Settled in period', value: fmt(periodSettled),     color: '#10B981' },
            { label: 'Outstanding',       value: fmt(periodOutstanding), color: periodOutstanding > 0 ? '#F59E0B' : '#94A3B8' },
          ].map(c => (
            <div key={c.label}>
              <p className="text-xs" style={{ color: '#94A3B8' }}>{c.label}</p>
              <p className="font-mono text-sm font-medium" style={{ color: c.color }}>{c.value}</p>
            </div>
          ))}
        </div>
        <div className="mt-3">
          <div className="flex justify-between text-xs mb-1" style={{ color: '#94A3B8' }}>
            <span>{periodBilled > 0 ? `${pct}% settled in period` : 'No bills in period'}</span>
            <span>{fmt(periodSettled)} of {fmt(periodBilled)}</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <div className="h-full transition-all" style={{ width: `${Math.min(pct, 100)}%`, background: 'linear-gradient(90deg, #8B5CF6, #7C3AED)' }} />
          </div>
        </div>
      </div>

      {expanded && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="text-sm font-medium mb-2 flex items-center gap-1.5" style={{ color: '#F1F5F9' }}>
              <Calendar size={14} style={{ color: '#8B5CF6' }} /> Salary bills in period
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {billSlice.map((c, i) => (
                <div key={`${c.month}-${i}`} className="text-xs flex items-center justify-between rounded-md px-2 py-1" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <span style={{ color: '#94A3B8' }}>{formatMonth(c.month)}</span>
                  <span className="font-mono font-medium" style={{ color: '#F1F5F9' }}>{fmt(c.amount)}</span>
                </div>
              ))}
              {filteredCredits.length === 0 && <p className="text-xs" style={{ color: '#94A3B8' }}>No bills in this period</p>}
            </div>
            {billPages > 1 && (
              <div className="flex items-center justify-between mt-2 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <span className="text-xs" style={{ color: '#64748B' }}>Bills {billPage}/{billPages}</span>
                <div className="flex gap-1">
                  <button type="button" disabled={billPage <= 1} onClick={() => setBillPage(p => p - 1)} className="p-1 rounded disabled:opacity-40" style={{ color: '#94A3B8' }}><ChevronLeft size={14} /></button>
                  <button type="button" disabled={billPage >= billPages} onClick={() => setBillPage(p => p + 1)} className="p-1 rounded disabled:opacity-40" style={{ color: '#94A3B8' }}><ChevronRight size={14} /></button>
                </div>
              </div>
            )}
          </div>
          <div className="px-4 py-3">
            <p className="text-sm font-medium mb-2" style={{ color: '#F1F5F9' }}>Payment history (this staff, period)</p>
            {filteredSettlements.length > 0 ? (
              <>
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                      {['Date', 'From', 'Note', 'Amount', ''].map(h => (
                        <th key={h} className={`py-1.5 pr-3 font-medium text-left`} style={{ color: '#64748B' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paySlice.map(st => (
                      <tr key={st._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td className="py-1.5 pr-3" style={{ color: '#94A3B8' }}>{fmtDate(st.date)}</td>
                        <td className="py-1.5 pr-3" style={{ color: '#94A3B8' }}>{ACCOUNT_LABELS[st.fromAccount] || st.fromAccount || '—'}</td>
                        <td className="py-1.5 pr-3 truncate max-w-32" style={{ color: '#94A3B8' }}>{st.note || '—'}</td>
                        <td className="py-1.5 pr-3 text-right font-mono" style={{ color: '#10B981' }}>{fmt(st.amount)}</td>
                        <td className="py-1.5">
                          <div className="flex items-center gap-1 justify-end">
                            <button type="button" onClick={() => onEdit(s, st)} className="p-1 rounded cursor-pointer" style={{ color: '#64748B' }} onMouseEnter={e => e.currentTarget.style.color='#8B5CF6'} onMouseLeave={e => e.currentTarget.style.color='#64748B'}><Pencil size={12} /></button>
                            <button type="button" onClick={() => onDelete(s, st)} className="p-1 rounded cursor-pointer" style={{ color: '#64748B' }} onMouseEnter={e => e.currentTarget.style.color='#EF4444'} onMouseLeave={e => e.currentTarget.style.color='#64748B'}><Trash2 size={12} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {payPages > 1 && (
                  <div className="flex items-center justify-between mt-2 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <span className="text-xs" style={{ color: '#64748B' }}>Payments {payPage}/{payPages}</span>
                    <div className="flex gap-1">
                      <button type="button" disabled={payPage <= 1} onClick={() => setPayPage(p => p - 1)} className="p-1 rounded disabled:opacity-40" style={{ color: '#94A3B8' }}><ChevronLeft size={14} /></button>
                      <button type="button" disabled={payPage >= payPages} onClick={() => setPayPage(p => p + 1)} className="p-1 rounded disabled:opacity-40" style={{ color: '#94A3B8' }}><ChevronRight size={14} /></button>
                    </div>
                  </div>
                )}
              </>
            ) : <p className="text-xs py-2" style={{ color: '#94A3B8' }}>No payments in this period</p>}
          </div>
        </div>
      )}
    </div>
  );
};

export default function StaffPage() {
  const { user } = useAuth();
  const canRemoveStaff = ['admin', 'owner'].includes(user?.role);
  const [data, setData]       = useState({ staff: [], totalBill: 0, totalSettled: 0, outstanding: 0 });
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState(null);
  const [expanded, setExpanded] = useState({});
  const [period, setPeriod]   = useState('this_month');
  const [custom, setCustom]   = useState({ start: '', end: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [staffListPage, setStaffListPage] = useState(1);
  const [payTablePage, setPayTablePage]   = useState(1);
  const [deleteSettlementConfirm, setDeleteSettlementConfirm] = useState(null);
  const [deletingSettlement, setDeletingSettlement] = useState(false);
  const [removeStaffTarget, setRemoveStaffTarget] = useState(null);
  const [removingStaff, setRemovingStaff] = useState(false);

  const load = async () => {
    setLoading(true);
    try { const res = await staffApi.getSalarySummary(); setData(res.data); }
    catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { setStaffListPage(1); setPayTablePage(1); }, [period, custom.start, custom.end, searchQuery]);

  const toggleExpand = (id) => setExpanded(p => ({ ...p, [id]: !p[id] }));

  const staffWithFiltered = useMemo(() => (data.staff || []).map(s => {
    const filteredSettlements = filterSettlements(s.settlements || [], period, custom);
    const filteredCredits     = filterSalaryCredits(s.salaryCredits || [], period, custom);
    const periodBilled        = filteredCredits.reduce((sum, c) => sum + (c.amount || 0), 0);
    const periodSettled       = filteredSettlements.reduce((sum, st) => sum + (st.amount || 0), 0);
    return { ...s, filteredSettlements, filteredCredits, periodBilled, periodSettled, periodOutstanding: periodBilled - periodSettled };
  }), [data.staff, period, custom]);

  const filteredStaff = useMemo(() => {
    if (!searchQuery.trim()) return staffWithFiltered;
    const q = searchQuery.toLowerCase();
    return staffWithFiltered.filter(s => s.name?.toLowerCase().includes(q) || s.role?.toLowerCase().includes(q));
  }, [staffWithFiltered, searchQuery]);

  const periodBilledTotal      = useMemo(() => staffWithFiltered.reduce((sum, s) => sum + s.periodBilled, 0), [staffWithFiltered]);
  const periodSettledTotal     = useMemo(() => staffWithFiltered.reduce((sum, s) => sum + s.periodSettled, 0), [staffWithFiltered]);
  const periodOutstandingTotal = periodBilledTotal - periodSettledTotal;

  const allPaymentsInPeriod = useMemo(() => {
    const rows = [];
    staffWithFiltered.forEach(s => s.filteredSettlements.forEach(st => rows.push({ staffName: s.name, staffId: s._id, ...st })));
    return rows.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [staffWithFiltered]);

  const billingKeys = useMemo(() => billingMonthKeysForSummary(period, custom), [period, custom.start, custom.end]);
  const monthlySalaryBillTotal = useMemo(() => period === 'all' ? (data.totalBill || 0) : sumSalaryCreditsInMonths(data.staff, billingKeys), [period, data.totalBill, data.staff, billingKeys]);
  const billingMonthsSubtitle  = useMemo(() => period === 'all' ? `${data.staff?.length || 0} staff · all-time` : `${data.staff?.length || 0} staff · ${describeBillingMonthsLabel(billingKeys)}`, [period, data.staff?.length, billingKeys]);

  const payTablePages = Math.max(1, Math.ceil(allPaymentsInPeriod.length / TABLE_PAGE_SIZE));
  const payTableSlice = useMemo(() => allPaymentsInPeriod.slice((payTablePage - 1) * TABLE_PAGE_SIZE, payTablePage * TABLE_PAGE_SIZE), [allPaymentsInPeriod, payTablePage]);
  const staffListPages = Math.max(1, Math.ceil(filteredStaff.length / STAFF_PAGE_SIZE));
  const staffListSlice = useMemo(() => filteredStaff.slice((staffListPage - 1) * STAFF_PAGE_SIZE, staffListPage * STAFF_PAGE_SIZE), [filteredStaff, staffListPage]);

  const pDesc = periodDescription(period, custom);

  return (
    <div className="space-y-4">
      <style>{`@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-lg font-bold" style={{ color: '#F1F5F9' }}>Staff Management</h2>
        <Link to="/staff/manage" className="btn-ghost text-sm"><Plus size={15} /> Manage Staff →</Link>
      </div>

      {/* Filters — all 6 visible including Today and Custom */}
      <div className="flex flex-wrap gap-2 items-center">
        {PERIOD_FILTERS.map(f => {
          const isActive  = period === f.value;
          const isDefault = f.value === 'this_month';
          return (
            <button key={f.value} type="button" onClick={() => { setPeriod(f.value); setStaffListPage(1); }}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer relative"
              style={isActive
                ? { background: 'var(--color-primary)', color: '#fff', boxShadow: '0 2px 8px rgba(139,92,246,0.4)' }
                : isDefault
                  ? { background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.4)', color: '#A78BFA' }
                  : { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#94A3B8' }
              }>
              {f.label}
              {isDefault && !isActive && (
                <span style={{ position: 'absolute', top: -4, right: -4, width: 8, height: 8, borderRadius: '50%', background: 'var(--color-primary)', border: '1.5px solid var(--color-surface)' }} />
              )}
            </button>
          );
        })}
        {period === 'custom' && (
          <div className="flex gap-2 items-center mt-1 w-full sm:w-auto">
            <input type="date" className="input text-xs py-1.5 w-36" value={custom.start} onChange={e => setCustom(p => ({ ...p, start: e.target.value }))} />
            <span className="text-xs" style={{ color: '#94A3B8' }}>to</span>
            <input type="date" className="input text-xs py-1.5 w-36" value={custom.end} onChange={e => setCustom(p => ({ ...p, end: e.target.value }))} />
          </div>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#64748B' }} />
        <input type="text" className="input pl-9 text-sm" placeholder="Search staff by name or role…"
          value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setStaffListPage(1); }} />
        {searchQuery && (
          <button type="button" onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer" style={{ color: '#64748B' }}><X size={14} /></button>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: 'Total salary bill', value: fmt(monthlySalaryBillTotal), sub: billingMonthsSubtitle, color: '#F1F5F9' },
          { label: period === 'all' ? 'Total settled' : 'Settled in period', value: fmt(period === 'all' ? data.totalSettled : periodSettledTotal), sub: `Payments · ${pDesc}`, color: '#10B981' },
          { label: 'Outstanding', value: fmt(period === 'all' ? data.outstanding : periodOutstandingTotal), sub: period === 'all' ? 'All-time billed − settled' : 'Period bills − payments', color: periodOutstandingTotal > 0 ? '#F59E0B' : '#94A3B8' },
        ].map(c => (
          <div key={c.label} className="card text-center">
            <p className="text-xs mb-1" style={{ color: '#94A3B8' }}>{c.label}</p>
            <p className="font-mono font-bold text-xl" style={{ color: c.color }}>{c.value}</p>
            <p className="text-xs mt-0.5" style={{ color: '#64748B' }}>{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Payment history table */}
      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-text">Payment history — all staff</h3>
          <p className="text-xs text-muted">{allPaymentsInPeriod.length} payment(s) · {pDesc}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border">
              <tr>
                {['Staff', 'Date', 'Account', 'Amount', 'Note'].map(h => (
                  <th key={h} className={`px-3 py-2 text-left text-xs font-medium text-muted ${h === 'Amount' ? 'text-right' : ''}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array(4).fill(0).map((_, i) => (
                  <tr key={i} className="border-b border-border/50">
                    {[120, 80, 80, 60, 100].map((w, j) => (
                      <td key={j} className="px-3 py-2"><Skeleton style={{ height: 13, width: w }} /></td>
                    ))}
                  </tr>
                ))
              ) : allPaymentsInPeriod.length === 0 ? (
                <tr><td colSpan={5} className="px-3 py-8 text-center text-muted text-xs">No payments in this period</td></tr>
              ) : payTableSlice.map((row, i) => (
                <tr key={`${row.staffId}-${row._id || i}`} className="border-b border-border/50">
                  <td className="px-3 py-2 text-text text-xs font-medium">{row.staffName}</td>
                  <td className="px-3 py-2 text-muted text-xs whitespace-nowrap">{fmtDate(row.date)}</td>
                  <td className="px-3 py-2 text-muted text-xs">{ACCOUNT_LABELS[row.fromAccount] || row.fromAccount || '—'}</td>
                  <td className="px-3 py-2 text-right font-mono text-xs text-success">{fmt(row.amount)}</td>
                  <td className="px-3 py-2 text-muted text-xs truncate max-w-[120px]">{row.note || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && payTablePages > 1 && (
          <div className="flex items-center justify-between px-3 py-2 border-t border-border">
            <span className="text-xs text-muted">Page {payTablePage} / {payTablePages}</span>
            <div className="flex gap-2">
              <button type="button" disabled={payTablePage <= 1} onClick={() => setPayTablePage(p => p - 1)} className="btn-ghost text-xs py-1 px-2 disabled:opacity-40"><ChevronLeft size={14} /></button>
              <button type="button" disabled={payTablePage >= payTablePages} onClick={() => setPayTablePage(p => p + 1)} className="btn-ghost text-xs py-1 px-2 disabled:opacity-40"><ChevronRight size={14} /></button>
            </div>
          </div>
        )}
      </div>

      {/* Staff cards */}
      {loading ? (
        <div className="space-y-3">
          {Array(3).fill(0).map((_, i) => (
            <div key={i} className="card p-4 space-y-3">
              <div className="flex justify-between">
                <div className="space-y-2"><Skeleton style={{ height: 16, width: 120 }} /><Skeleton style={{ height: 11, width: 80 }} /></div>
                <Skeleton style={{ height: 32, width: 80, borderRadius: 8 }} />
              </div>
              <div className="grid grid-cols-4 gap-3">
                {Array(4).fill(0).map((_, j) => <div key={j} className="space-y-1"><Skeleton style={{ height: 10, width: 60 }} /><Skeleton style={{ height: 16, width: 80 }} /></div>)}
              </div>
              <Skeleton style={{ height: 6, borderRadius: 4 }} />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {searchQuery && (
            <p className="text-xs" style={{ color: '#94A3B8' }}>
              {filteredStaff.length === 0 ? 'No staff matched your search.' : `${filteredStaff.length} result(s) for "${searchQuery}"`}
            </p>
          )}
          {staffListSlice.map(s => (
            <StaffCard key={s._id} s={s}
              filteredSettlements={s.filteredSettlements}
              filteredCredits={s.filteredCredits}
              onAdd={staff => setModal({ staff, settlement: null })}
              onEdit={(staff, settlement) => setModal({ staff, settlement })}
              onDelete={(staff, settlement) => setDeleteSettlementConfirm({ staff, settlement })}
              expanded={!!expanded[s._id]}
              onToggle={() => toggleExpand(s._id)}
              canRemoveStaff={canRemoveStaff}
              onRequestRemoveStaff={st => setRemoveStaffTarget(st)}
            />
          ))}
          {staffListPages > 1 && (
            <div className="flex items-center justify-between card px-4 py-2">
              <span className="text-xs text-muted">Staff page {staffListPage} / {staffListPages}</span>
              <div className="flex gap-2">
                <button type="button" disabled={staffListPage <= 1} onClick={() => setStaffListPage(p => p - 1)} className="btn-ghost text-xs py-1 px-2 disabled:opacity-40"><ChevronLeft size={14} /></button>
                <button type="button" disabled={staffListPage >= staffListPages} onClick={() => setStaffListPage(p => p + 1)} className="btn-ghost text-xs py-1 px-2 disabled:opacity-40"><ChevronRight size={14} /></button>
              </div>
            </div>
          )}
          {(!data.staff || data.staff.length === 0) && (
            <div className="card text-center py-12" style={{ color: '#94A3B8' }}>
              No staff found. <Link to="/staff/manage" style={{ color: '#8B5CF6' }}>Add staff →</Link>
            </div>
          )}
        </div>
      )}

      {modal && <SettleModal staff={modal.staff} settlement={modal.settlement} onClose={() => setModal(null)} onDone={load} />}

      {deleteSettlementConfirm && (
        <ConfirmModal title="Delete settlement?" danger confirmText="Delete"
          onCancel={() => !deletingSettlement && setDeleteSettlementConfirm(null)}
          onConfirm={async () => {
            const { staff, settlement } = deleteSettlementConfirm;
            setDeletingSettlement(true);
            try { await staffApi.deleteSettlement(staff._id, settlement._id); setDeleteSettlementConfirm(null); load(); }
            catch (err) { alert(err.response?.data?.message || 'Error'); }
            finally { setDeletingSettlement(false); }
          }}
          loading={deletingSettlement}>
          Remove payment of <span className="font-mono text-text">{fmt(deleteSettlementConfirm.settlement.amount)}</span> for{' '}
          <span className="text-text font-medium">{deleteSettlementConfirm.staff.name}</span> on {fmtDate(deleteSettlementConfirm.settlement.date)}?
        </ConfirmModal>
      )}

      {removeStaffTarget && (
        <ConfirmModal title="Deactivate staff member?" danger confirmText="Remove"
          onCancel={() => !removingStaff && setRemoveStaffTarget(null)}
          onConfirm={async () => {
            setRemovingStaff(true);
            try { await staffApi.delete(removeStaffTarget._id); setRemoveStaffTarget(null); load(); }
            catch (err) { alert(err.response?.data?.message || 'Could not remove staff'); }
            finally { setRemovingStaff(false); }
          }}
          loading={removingStaff}>
          Deactivate <span className="font-medium text-text">{removeStaffTarget.name}</span>? They disappear from this list; history is kept.
        </ConfirmModal>
      )}
    </div>
  );
}