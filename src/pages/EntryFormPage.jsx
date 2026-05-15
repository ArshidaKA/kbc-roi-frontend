import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { entriesApi, staffApi } from '@/shared/api/index';
import { fmt, fmtDate, fmtDateInput, ACCOUNTS, ACCOUNT_LABELS, money } from '@/shared/utils/format';
import { Plus, Trash2, CreditCard, ArrowLeft, Save, RefreshCw } from 'lucide-react';
import ScrollableRegion from '@/shared/ui/ScrollableRegion';

/* ── Stable components defined OUTSIDE — prevents remount on every keystroke ── */

const Section = ({ title, children }) => (
  <div className="card space-y-4">
    <h3 className="font-semibold text-text border-b border-border pb-2">{title}</h3>
    {children}
  </div>
);

const AccountSelect = ({ value, onChange }) => (
  <select value={value} onChange={e => onChange(e.target.value)} className="select text-sm">
    <option value="">— account —</option>
    {ACCOUNTS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
  </select>
);

const CreditBtn = ({ active, onToggle }) => (
  <button
    type="button"
    onClick={onToggle}
    style={active ? { background: 'rgba(245,158,11,0.12)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.3)' } : {}}
    className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 cursor-pointer whitespace-nowrap transition-all border ${active ? '' : 'text-muted border-border hover:text-warn'}`}
  >
    <CreditCard size={11} /> {active ? 'Credit' : '+ Credit'}
  </button>
);

const RupeeInput = ({ value, onChange, className = '' }) => (
  <div className="relative flex-1">
    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm select-none">₹</span>
    <input
      type="number" min="0" placeholder="0"
      value={value || ''}
      onChange={e => onChange(Number(e.target.value))}
      className={`input pl-7 text-sm ${className}`}
    />
  </div>
);

const ExpenseRow = ({ label, data, onChange }) => (
  <div className="border border-border rounded-lg p-3 space-y-2">
    <div className="flex items-center justify-between">
      <span className="text-text text-sm font-medium">{label}</span>
      <CreditBtn active={data.isCredit} onToggle={() => onChange({ ...data, isCredit: !data.isCredit })} />
    </div>
    <div className="flex gap-2">
      <RupeeInput value={data.amount} onChange={v => onChange({ ...data, amount: v })} />
      <div className="flex-1"><AccountSelect value={data.fromAccount || ''} onChange={v => onChange({ ...data, fromAccount: v })} /></div>
    </div>
    {data.isCredit && (
      <div className="relative">
        <label className="label text-xs">Settled amount</label>
        <RupeeInput value={data.creditSettled} onChange={v => onChange({ ...data, creditSettled: v })} />
      </div>
    )}
  </div>
);

/* ── Helpers ── */
const initExpItem = () => ({ amount: 0, fromAccount: '', isCredit: false, creditSettled: 0 });
const initEntry = () => ({
  date: fmtDateInput(new Date()),
  revenue: { cash: 0, federal: 0, vibgyor: 0, asif: 0 },
  purchaseCost: [],
  expenses: {
    royaltyFees: [],
    operations: {
      foodRefreshment: initExpItem(), rent: initExpItem(), electricity: initExpItem(),
      travelFuel: initExpItem(), mobileInternet: initExpItem(), maintenance: initExpItem(), incentive: initExpItem(),
    },
    gas: { staff: initExpItem(), store: initExpItem() },
    marketing: [],
    foodWastage: { cooked: [], raw: [] },
    other: [],
    salary: [],
  },
});

const settlementsToSalaryItems = (rows) =>
  (rows || []).map((r) => ({
    staffId: r.staffId,
    staffName: r.staffName || '',
    amount: Number(r.amount) || 0,
    fromAccount: r.fromAccount || '',
    isCredit: false,
    creditSettled: 0,
    note: r.note ? `Settlement · ${r.note}` : 'Salary settlement',
    sourceSettlementId: r.settlementId,
  }));

/* ── Main Component ── */
export default function EntryFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [form, setForm] = useState(initEntry());
  const [staffRowsForDay, setStaffRowsForDay] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!form.date) return;
    staffApi.getSettlementsForDay(form.date).then((r) => setStaffRowsForDay(r.data || [])).catch(() => setStaffRowsForDay([]));
  }, [form.date]);

  const salaryByAccount = useMemo(() => {
    const by = { cash: 0, federal: 0, vibgyor: 0, asif: 0 };
    let total = 0;
    const add = (fromAccount, amount) => {
      const a = money(amount);
      total += a;
      const k = fromAccount;
      if (k && by[k] !== undefined) by[k] += a;
    };
    if (isEdit) {
      (form.expenses?.salary || []).forEach((s) => add(s.fromAccount, s.amount));
    } else {
      staffRowsForDay.forEach((r) => add(r.fromAccount, r.amount));
    }
    return { by, total };
  }, [isEdit, form.expenses?.salary, staffRowsForDay]);

  useEffect(() => {
    if (isEdit) {
      setLoading(true);
      entriesApi.getOne(id).then(r => {
        const e = r.data;
        const base = initEntry();
        setForm({
          ...e,
          date: fmtDateInput(e.date),
          expenses: {
            ...base.expenses,
            ...e.expenses,
            operations: { ...base.expenses.operations, ...(e.expenses?.operations || {}) },
            gas: { staff: e.expenses?.gas?.staff || initExpItem(), store: e.expenses?.gas?.store || initExpItem() },
            foodWastage: {
              cooked: (e.expenses?.foodWastage?.cooked || []).map((x) => ({ ...x, qty: x.qty ?? 0 })),
              raw: (e.expenses?.foodWastage?.raw || []).map((x) => ({ ...x, qty: x.qty ?? 0 })),
            },
          },
        });
      }).catch(() => {}).finally(() => setLoading(false));
    }
  }, [id]);

  const totalRevenue = ['cash','federal','vibgyor','asif'].reduce((s, k) => s + (form.revenue[k] || 0), 0);

  const setRev   = (k, v)    => setForm(p => ({ ...p, revenue: { ...p.revenue, [k]: v } }));
  const setExp   = (patch)   => setForm(p => ({ ...p, expenses: { ...p.expenses, ...patch } }));
  const updOp    = (k, v)    => setExp({ operations: { ...form.expenses.operations, [k]: v } });
  const updGas   = (k, v)    => setExp({ gas: { ...form.expenses.gas, [k]: v } });

  const arrAdd   = (key, item) => setExp({ [key]: [...form.expenses[key], item] });
  const arrUpd   = (key, i, v) => setExp({ [key]: form.expenses[key].map((x, j) => j === i ? v : x) });
  const arrDel   = (key, i)    => setExp({ [key]: form.expenses[key].filter((_, j) => j !== i) });

  const pcAdd  = ()      => setForm(p => ({ ...p, purchaseCost: [...p.purchaseCost, { item: '', amount: 0, fromAccount: '', isCredit: false, creditSettled: 0, vendorName: '' }] }));
  const pcUpd  = (i, v)  => setForm(p => ({ ...p, purchaseCost: p.purchaseCost.map((x, j) => j === i ? v : x) }));
  const pcDel  = (i)     => setForm(p => ({ ...p, purchaseCost: p.purchaseCost.filter((_, j) => j !== i) }));

  const fwAdd  = (type)      => setExp({ foodWastage: { ...form.expenses.foodWastage, [type]: [...form.expenses.foodWastage[type], { item: '', qty: 0, amount: 0 }] } });
  const fwUpd  = (type, i, v) => setExp({ foodWastage: { ...form.expenses.foodWastage, [type]: form.expenses.foodWastage[type].map((x, j) => j === i ? v : x) } });
  const fwDel  = (type, i)   => setExp({ foodWastage: { ...form.expenses.foodWastage, [type]: form.expenses.foodWastage[type].filter((_, j) => j !== i) } });

  const dupFoodWastage = () => {
    const dupIn = (rows) => {
      const seen = new Set();
      for (const r of rows || []) {
        const k = (r.item || '').trim().toLowerCase();
        if (!k) continue;
        if (seen.has(k)) return k;
        seen.add(k);
      }
      return null;
    };
    const c = dupIn(form.expenses.foodWastage.cooked);
    if (c) return `Duplicate cooked item (same name): fix "${c}"`;
    const r = dupIn(form.expenses.foodWastage.raw);
    if (r) return `Duplicate raw item (same name): fix "${r}"`;
    return null;
  };

  const submit = async (e) => {
    e.preventDefault();
    const dup = dupFoodWastage();
    if (dup) { alert(dup); return; }
    setSaving(true);
    try {
      const salaryPayload = isEdit
        ? (form.expenses?.salary || [])
        : settlementsToSalaryItems(staffRowsForDay);
      const payload = {
        ...form,
        expenses: {
          ...form.expenses,
          salary: salaryPayload,
        },
      };
      if (isEdit) await entriesApi.update(id, payload);
      else await entriesApi.create(payload);
      navigate('/entries');
    } catch (err) { alert(err.response?.data?.message || 'Error saving entry'); }
    finally { setSaving(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <form onSubmit={submit} className="space-y-4 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/entries" className="btn-ghost text-sm py-1.5 px-2"><ArrowLeft size={16} /></Link>
        <h2 className="text-lg font-bold text-text">{isEdit ? 'Edit Entry' : 'Add ROI Entry'}</h2>
      </div>

      {/* Date only */}
      <Section title="Basic Info">
        <div>
          <label className="label">Date</label>
          <input type="date" className="input max-w-xs" value={form.date}
            onChange={e => setForm(p => ({ ...p, date: e.target.value }))} required />
        </div>
      </Section>

      {/* Revenue */}
      <Section title="Revenue — By Account">
        <div className="flex items-center justify-between rounded-lg px-4 py-3" style={{ background: 'var(--color-bg)' }}>
          <span className="text-muted text-sm">Total Revenue</span>
          <span className="font-mono font-bold text-success text-lg">{fmt(totalRevenue)}</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[['cash','Cash'],['federal','Federal Bank'],['vibgyor','Vibgyor Bank'],['asif','Asif Account']].map(([k, l]) => (
            <div key={k}>
              <label className="label">{l}</label>
              <RupeeInput value={form.revenue[k]} onChange={v => setRev(k, v)} />
            </div>
          ))}
        </div>
      </Section>

      {/* Purchase Cost */}
      <Section title="Purchase Cost">
        <p className="text-muted text-xs">Tap + Credit on any item to mark it as unpaid.</p>
        <ScrollableRegion count={form.purchaseCost.length} innerClassName="p-2 space-y-2">
        {form.purchaseCost.map((item, i) => (
          <div key={i} className="border border-border rounded-lg p-3 space-y-2">
            <div className="flex gap-2 items-start">
              <input type="text" placeholder="Item name" value={item.item}
                onChange={e => pcUpd(i, { ...item, item: e.target.value })} className="input text-sm flex-1" />
              <button type="button" onClick={() => pcDel(i)} className="text-muted hover:text-danger p-1.5 cursor-pointer mt-0.5">
                <Trash2 size={14} />
              </button>
            </div>
            <input type="text" placeholder="Vendor name" value={item.vendorName || ''}
              onChange={e => pcUpd(i, { ...item, vendorName: e.target.value })} className="input text-sm" />
            <div className="flex gap-2 items-center">
              <RupeeInput value={item.amount} onChange={v => pcUpd(i, { ...item, amount: v })} />
              <div className="flex-1"><AccountSelect value={item.fromAccount} onChange={v => pcUpd(i, { ...item, fromAccount: v })} /></div>
              <CreditBtn active={item.isCredit} onToggle={() => pcUpd(i, { ...item, isCredit: !item.isCredit })} />
            </div>
            {item.isCredit && (
              <div>
                <label className="label text-xs">Settled</label>
                <RupeeInput value={item.creditSettled} onChange={v => pcUpd(i, { ...item, creditSettled: v })} />
              </div>
            )}
          </div>
        ))}
        </ScrollableRegion>
        <button type="button" onClick={pcAdd} className="btn-ghost text-sm"><Plus size={15} /> Add item</button>
      </Section>

      {/* Royalty */}
      <Section title="Royalty / Management Fees">
        <ScrollableRegion count={form.expenses.royaltyFees.length} innerClassName="p-2 space-y-2">
        {form.expenses.royaltyFees.map((item, i) => (
          <div key={i} className="border border-border rounded-lg p-3 space-y-2">
            <div className="flex gap-2">
              <input type="text" placeholder="Fee Label" value={item.label}
                onChange={e => arrUpd('royaltyFees', i, { ...item, label: e.target.value })} className="input text-sm flex-1" />
              <button type="button" onClick={() => arrDel('royaltyFees', i)} className="text-muted hover:text-danger p-1.5 cursor-pointer"><Trash2 size={14} /></button>
            </div>
            <div className="flex gap-2 items-center">
              <RupeeInput value={item.amount} onChange={v => arrUpd('royaltyFees', i, { ...item, amount: v })} />
              <div className="flex-1"><AccountSelect value={item.fromAccount} onChange={v => arrUpd('royaltyFees', i, { ...item, fromAccount: v })} /></div>
              <CreditBtn active={item.isCredit} onToggle={() => arrUpd('royaltyFees', i, { ...item, isCredit: !item.isCredit })} />
            </div>
          </div>
        ))}
        </ScrollableRegion>
        <button type="button" onClick={() => arrAdd('royaltyFees', { label: 'Royalty / Mgt. Fee', amount: 0, fromAccount: '', isCredit: false, creditSettled: 0 })} className="btn-ghost text-sm">
          <Plus size={15} /> Add royalty fee
        </button>
      </Section>

      {/* Operations */}
      <Section title="Operations">
        {[
          ['foodRefreshment','Food & Refreshment'],['rent','Rent'],['electricity','Electricity'],
          ['travelFuel','Travel & Fuel'],['mobileInternet','Mobile & Internet'],
          ['maintenance','Maintenance'],['incentive','Incentive'],
        ].map(([k, label]) => (
          <ExpenseRow key={k} label={label} data={form.expenses.operations[k]} onChange={v => updOp(k, v)} />
        ))}
      </Section>

      {/* Gas */}
      <Section title="Gas">
        <ExpenseRow label="Gas — Staff" data={form.expenses.gas.staff} onChange={v => updGas('staff', v)} />
        <ExpenseRow label="Gas — Store" data={form.expenses.gas.store} onChange={v => updGas('store', v)} />
      </Section>

      {/* Marketing */}
      <Section title="Marketing">
        <ScrollableRegion count={form.expenses.marketing.length} innerClassName="p-2 space-y-2">
        {form.expenses.marketing.map((item, i) => (
          <div key={i} className="border border-border rounded-lg p-3 space-y-2">
            <div className="flex gap-2">
              <input type="text" placeholder="Campaign / description" value={item.label}
                onChange={e => arrUpd('marketing', i, { ...item, label: e.target.value })} className="input text-sm flex-1" />
              <button type="button" onClick={() => arrDel('marketing', i)} className="text-muted hover:text-danger p-1.5 cursor-pointer"><Trash2 size={14} /></button>
            </div>
            <div className="flex gap-2 items-center">
              <RupeeInput value={item.amount} onChange={v => arrUpd('marketing', i, { ...item, amount: v })} />
              <div className="flex-1"><AccountSelect value={item.fromAccount} onChange={v => arrUpd('marketing', i, { ...item, fromAccount: v })} /></div>
              <CreditBtn active={item.isCredit} onToggle={() => arrUpd('marketing', i, { ...item, isCredit: !item.isCredit })} />
            </div>
          </div>
        ))}
        </ScrollableRegion>
        <button type="button" onClick={() => arrAdd('marketing', { label: '', amount: 0, fromAccount: '', isCredit: false, creditSettled: 0 })} className="btn-ghost text-sm">
          <Plus size={15} /> Add marketing item
        </button>
      </Section>

      {/* Food Wastage */}
      <Section title="Food Wastage">
        <p className="text-muted text-xs mb-2">One ROI entry per day (app-wide). Item names must not repeat within cooked or within raw. Log quantity and value.</p>
        {['cooked', 'raw'].map(type => (
          <div key={type}>
            <p className="text-muted-light text-sm font-medium mb-2 capitalize">{type} Food</p>
            <ScrollableRegion count={form.expenses.foodWastage[type].length} innerClassName="p-2 space-y-2">
            {form.expenses.foodWastage[type].map((item, i) => (
              <div key={i} className="flex flex-wrap gap-2 items-center">
                <input type="text" placeholder="Food item" value={item.item}
                  onChange={e => fwUpd(type, i, { ...item, item: e.target.value })} className="input text-sm flex-1 min-w-[120px]" />
                <div className="w-24">
                  <label className="label text-xs sr-only">Qty</label>
                  <input type="number" min="0" step="1" placeholder="Qty" value={item.qty === 0 || item.qty === undefined ? '' : item.qty}
                    onChange={e => fwUpd(type, i, { ...item, qty: Number(e.target.value) || 0 })} className="input text-sm" />
                </div>
                <div className="w-36">
                  <RupeeInput value={item.amount} onChange={v => fwUpd(type, i, { ...item, amount: v })} />
                </div>
                <button type="button" onClick={() => fwDel(type, i)} className="text-muted hover:text-danger p-1.5 cursor-pointer"><Trash2 size={14} /></button>
              </div>
            ))}
            </ScrollableRegion>
            <button type="button" onClick={() => fwAdd(type)} className="btn-ghost text-sm mb-2"><Plus size={15} /> Add item</button>
          </div>
        ))}
      </Section>

      {/* Other */}
      <Section title="Other Expenses">
        <ScrollableRegion count={form.expenses.other.length} innerClassName="p-2 space-y-2">
        {form.expenses.other.map((item, i) => (
          <div key={i} className="border border-border rounded-lg p-3 space-y-2">
            <div className="flex gap-2">
              <input type="text" placeholder="Reason / description" value={item.label}
                onChange={e => arrUpd('other', i, { ...item, label: e.target.value })} className="input text-sm flex-1" />
              <button type="button" onClick={() => arrDel('other', i)} className="text-muted hover:text-danger p-1.5 cursor-pointer"><Trash2 size={14} /></button>
            </div>
            <div className="flex gap-2 items-center">
              <RupeeInput value={item.amount} onChange={v => arrUpd('other', i, { ...item, amount: v })} />
              <div className="flex-1"><AccountSelect value={item.fromAccount} onChange={v => arrUpd('other', i, { ...item, fromAccount: v })} /></div>
              <CreditBtn active={item.isCredit} onToggle={() => arrUpd('other', i, { ...item, isCredit: !item.isCredit })} />
            </div>
          </div>
        ))}
        </ScrollableRegion>
        <button type="button" onClick={() => arrAdd('other', { label: '', amount: 0, fromAccount: '', isCredit: false, creditSettled: 0 })} className="btn-ghost text-sm">
          <Plus size={15} /> Add other
        </button>
      </Section>

      {/* Salary — reference from Staff; written on ROI only when you save a new entry or click Apply (edit) */}
      <Section title="Salary (from Staff)">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-muted text-xs flex-1 min-w-[200px]">
            {isEdit ? (
              <>
                Payments for <span className="text-text font-medium">{fmtDate(form.date)}</span> (from <Link to="/staff" className="text-primary hover:underline">Staff</Link>) are shown for reference only.
                Settling on Staff does not change this ROI row until you use <span className="text-text">Apply staff settlements</span> and save.
              </>
            ) : (
              <>
                When you <span className="text-text">save this new entry</span>, staff settlements dated <span className="text-text font-medium">{fmtDate(form.date)}</span> are copied onto this ROI row.
                Record payments on <Link to="/staff" className="text-primary hover:underline">Staff</Link>, then refresh here before saving.
              </>
            )}
          </p>
          <div className="flex flex-wrap gap-2 shrink-0">
            {isEdit && (
              <button
                type="button"
                className="btn-ghost text-xs flex items-center gap-1"
                onClick={() =>
                  setForm((p) => ({
                    ...p,
                    expenses: {
                      ...p.expenses,
                      salary: settlementsToSalaryItems(staffRowsForDay),
                    },
                  }))
                }
              >
                Apply staff settlements
              </button>
            )}
            <button
              type="button"
              className="btn-ghost text-xs flex items-center gap-1"
              onClick={() => staffApi.getSettlementsForDay(form.date).then((r) => setStaffRowsForDay(r.data || [])).catch(() => {})}
            >
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
        </div>
        <ScrollableRegion count={staffRowsForDay.length} innerClassName="p-0">
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-[1] bg-[rgba(139,92,246,0.12)] backdrop-blur-sm">
                <tr>
                  {['Staff', 'Date', 'Account', 'Amount', 'Note'].map((h) => (
                    <th key={h} className={`px-3 py-2 text-left text-xs font-medium text-muted ${h === 'Amount' ? 'text-right' : ''}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {staffRowsForDay.length === 0 ? (
                  <tr><td colSpan={5} className="px-3 py-6 text-center text-muted text-xs">No settlements for this date — record them under Staff → Settle</td></tr>
                ) : staffRowsForDay.map((row, i) => (
                  <tr key={`${row.staffId}-${row.settlementId || i}`} className="border-t border-border/60">
                    <td className="px-3 py-2 text-text">{row.staffName}</td>
                    <td className="px-3 py-2 text-muted whitespace-nowrap">{fmtDate(row.date)}</td>
                    <td className="px-3 py-2 text-muted capitalize">{ACCOUNT_LABELS[row.fromAccount] || row.fromAccount || '—'}</td>
                    <td className="px-3 py-2 text-right font-mono">{fmt(row.amount)}</td>
                    <td className="px-3 py-2 text-muted text-xs max-w-[200px]">{row.note || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ScrollableRegion>
        {((!isEdit && staffRowsForDay.length > 0) || (isEdit && (form.expenses?.salary || []).length > 0)) && (
          <div className="mt-3 rounded-lg border border-border px-3 py-2 space-y-1.5 text-xs">
            <p className="text-muted font-medium">{isEdit ? 'Salary saved on this entry — by account' : 'Will save — salary by account (from Staff)'}</p>
            {ACCOUNTS.map((a) => {
              const v = salaryByAccount.by[a.value];
              if (!v) return null;
              return (
                <div key={a.value} className="flex justify-between font-mono">
                  <span className="text-muted">{a.label}</span>
                  <span className="text-text">{fmt(v)}</span>
                </div>
              );
            })}
            <div className="flex justify-between font-semibold text-text pt-1 border-t border-border">
              <span>{isEdit ? 'Total salary on this entry' : 'Total (copied when you save)'}</span>
              <span className="font-mono">{fmt(salaryByAccount.total)}</span>
            </div>
          </div>
        )}
      </Section>

      {/* Actions */}
      <div className="flex gap-3 pb-8">
        <Link to="/entries" className="btn-ghost flex-1 justify-center py-2.5">Cancel</Link>
        <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center py-2.5">
          {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save size={16} />}
          {saving ? 'Saving...' : isEdit ? 'Update Entry' : 'Save Entry'}
        </button>
      </div>
    </form>
  );
}
