import { useEffect, useState, useCallback } from 'react';
import { stockApi } from '@/shared/api/index';
import { fmt, fmtDate, fmtDateInput } from '@/shared/utils/format';
import { Plus, Trash2, Save, ChevronLeft, ChevronRight } from 'lucide-react';

const HISTORY_PAGE_SIZE = 20;

const StockForm = ({ type, label, initialData, date, onSaved }) => {
  const [items, setItems] = useState(initialData?.items || [{ item: '', unit: '', value: 0 }]);
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [saving, setSaving] = useState(false);

  const totalValue = items.reduce((s, i) => s + (Number(i.value) || 0), 0);

  const addItem = () => setItems(p => [...p, { item: '', unit: '', value: 0 }]);
  const updItem = (i, f, v) => setItems(p => { const a = [...p]; a[i] = { ...a[i], [f]: v }; return a; });
  const delItem = (i) => setItems(p => p.filter((_, j) => j !== i));

  const save = async () => {
    setSaving(true);
    try {
      const res = await stockApi.save({ date, type, items, notes });
      onSaved(res.data);
    } catch (err) { alert(err.response?.data?.message || 'Error'); } finally { setSaving(false); }
  };

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-text">{label}</h3>
        <span className="font-mono font-bold text-primary">{fmt(totalValue)}</span>
      </div>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="grid grid-cols-12 gap-2">
            <input type="text" placeholder="Item name" value={item.item} onChange={e => updItem(i, 'item', e.target.value)} className="input text-sm col-span-5" />
            <input type="text" placeholder="kg / L / pcs" value={item.unit} onChange={e => updItem(i, 'unit', e.target.value)} className="input text-sm col-span-3" />
            <div className="relative col-span-3">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted text-xs">₹</span>
              <input type="number" min="0" placeholder="0" value={item.value || ''} onChange={e => updItem(i, 'value', e.target.value)} className="input pl-5 text-sm" />
            </div>
            <button type="button" onClick={() => delItem(i)} className="col-span-1 text-muted hover:text-danger flex items-center justify-center cursor-pointer"><Trash2 size={14} /></button>
          </div>
        ))}
      </div>
      <button type="button" onClick={addItem} className="btn-ghost text-sm"><Plus size={15} /> Add item</button>
      <textarea placeholder="Notes (optional)" value={notes} onChange={e => setNotes(e.target.value)} className="input text-sm h-16 resize-none" />
      <div className="flex justify-between items-center">
        <p className="text-muted text-sm">Total: <span className="font-mono text-text">{fmt(totalValue)}</span></p>
        <button onClick={save} disabled={saving} className="btn-primary text-sm">
          {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save size={15} />}
          Save {label.split(' ')[0]} Stock
        </button>
      </div>
    </div>
  );
};

export default function StockPage() {
  const [date, setDate] = useState(fmtDateInput(new Date()));
  const [today, setToday] = useState({ opening: null, closing: null });
  const [history, setHistory] = useState([]);
  const [histPage, setHistPage] = useState(1);
  const [histTotal, setHistTotal] = useState(0);
  const [histPages, setHistPages] = useState(1);
  const [monthOpening, setMonthOpening] = useState(0);
  const [monthClosing, setMonthClosing] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadToday = useCallback(async () => {
    try {
      const r = await stockApi.getToday();
      setToday(r.data);
    } catch (e) {}
  }, []);

  const loadMonthTotals = useCallback(async () => {
    try {
      const r = await stockApi.getMonthTotals();
      setMonthOpening(r.data.monthOpening ?? 0);
      setMonthClosing(r.data.monthClosing ?? 0);
    } catch (e) {}
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      const r = await stockApi.getAll({ page: histPage, limit: HISTORY_PAGE_SIZE });
      setHistory(r.data.stocks || []);
      setHistTotal(r.data.total ?? 0);
      setHistPages(r.data.pages ?? 1);
    } catch (e) {}
  }, [histPage]);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadToday(), loadMonthTotals(), loadHistory()]).finally(() => setLoading(false));
  }, [loadToday, loadMonthTotals, loadHistory]);

  const refreshAfterSave = useCallback(async () => {
    await Promise.all([loadToday(), loadMonthTotals(), loadHistory()]);
  }, [loadToday, loadMonthTotals, loadHistory]);

  const todayOpening = today.opening;
  const todayClosing = today.closing;
  const diff = todayOpening && todayClosing ? todayClosing.totalValue - todayOpening.totalValue : null;

  const grouped = {};
  history.forEach(s => {
    const d = new Date(s.date).toISOString().split('T')[0];
    if (!grouped[d]) grouped[d] = {};
    grouped[d][s.type] = s;
  });

  const sortedDays = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-bold text-text flex-1">Inventory — Stock Management</h2>
      </div>

      <div className="card flex items-center gap-4">
        <label className="label mb-0">Date</label>
        <input type="date" className="input w-44" value={date} onChange={e => setDate(e.target.value)} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Opening (Today)', value: todayOpening ? fmt(todayOpening.totalValue) : '₹0', sub: todayOpening ? '' : 'Not entered yet', color: 'success' },
          { label: 'Closing (Today)', value: todayClosing ? fmt(todayClosing.totalValue) : '₹0', sub: todayClosing ? '' : 'Not entered yet', color: 'primary' },
          { label: 'Difference', value: diff !== null ? fmt(diff) : '—', sub: diff !== null ? '' : 'Need both entries', color: diff !== null ? (diff >= 0 ? 'success' : 'danger') : 'muted' },
          { label: 'Mo. Opening', value: fmt(monthOpening), sub: 'This month (all records)', color: 'text' },
        ].map(c => (
          <div key={c.label} className="card text-center">
            <p className="text-muted text-xs mb-1">{c.label}</p>
            <p className={`font-mono font-bold text-${c.color}`}>{c.value}</p>
            {c.sub && <p className="text-muted text-xs mt-0.5">{c.sub}</p>}
          </div>
        ))}
      </div>

      <div className="card text-center py-2">
        <p className="text-muted text-xs">Month closing total (all rows this month): <span className="font-mono text-text">{fmt(monthClosing)}</span></p>
      </div>

      <StockForm type="opening" label="Opening Stock" date={date} initialData={todayOpening} onSaved={() => refreshAfterSave()} />
      <StockForm type="closing" label="Closing Stock" date={date} initialData={todayClosing} onSaved={() => refreshAfterSave()} />

      <div className="card">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <h3 className="font-semibold text-text">Stock history</h3>
          <span className="text-muted text-xs">{histTotal} record(s) · {HISTORY_PAGE_SIZE} per page</span>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-8"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <div className="space-y-3">
            {sortedDays.map((d) => {
              const types = grouped[d];
              return (
              <div key={d} className="border border-border rounded-xl overflow-hidden">
                <div className="px-4 py-2 flex justify-between" style={{ background: 'rgba(255,255,255,0.5)', borderBottom: '1px solid var(--color-border)' }}>
                  <span className="text-muted-light text-sm font-medium">{fmtDate(d)}</span>
                  {types.opening && types.closing && (
                    <span className={`text-xs font-mono ${types.closing.totalValue - types.opening.totalValue >= 0 ? 'text-success' : 'text-danger'}`}>
                      Diff: {fmt(types.closing.totalValue - types.opening.totalValue)}
                    </span>
                  )}
                </div>
                <div className="divide-y divide-border/50">
                  {Object.entries(types).map(([type, s]) => (
                    <div key={type} className="px-4 py-2">
                      <div className="flex justify-between items-center">
                        <span className={`text-xs font-medium capitalize ${type === 'opening' ? 'text-success' : 'text-primary'}`}>{type}</span>
                        <span className="font-mono text-sm text-text">{fmt(s.totalValue)}</span>
                      </div>
                      {s.items?.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {s.items.map((item, i) => (
                            <span key={i} className="text-xs px-2 py-0.5 rounded" style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)', color: '#94A3B8' }}>
                              {item.item} {item.unit && `(${item.unit})`} {fmt(item.value)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              );
            })}
            {sortedDays.length === 0 && <p className="text-muted text-center py-8">No stock entries on this page</p>}
            {histPages > 1 && (
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <span className="text-muted text-xs">Page {histPage} of {histPages}</span>
                <div className="flex gap-2">
                  <button type="button" disabled={histPage <= 1} onClick={() => setHistPage((p) => p - 1)} className="btn-ghost text-xs py-1 px-2 disabled:opacity-40"><ChevronLeft size={14} /></button>
                  <button type="button" disabled={histPage >= histPages} onClick={() => setHistPage((p) => p + 1)} className="btn-ghost text-xs py-1 px-2 disabled:opacity-40"><ChevronRight size={14} /></button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
