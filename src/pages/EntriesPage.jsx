import { useEffect, useState, Fragment } from 'react';
import { Link } from 'react-router-dom';
import { entriesApi, dashboardApi } from '@/shared/api/index';
import { fmt, fmtDate, FILTERS, calcEntryTotals, ACCOUNT_LABELS } from '@/shared/utils/format';
import {
  downloadEntriesPdf,
  downloadFoodWastagePdf,
  downloadAccountBalancesPdf,
  downloadEntriesAndAccountsCombinedPdf,
} from '@/shared/utils/pdfReports';
import { Plus, Eye, Pencil, Trash2, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, FileDown } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import ConfirmModal from '@/shared/ui/ConfirmModal';
import EntryDayReport from '@/shared/ui/EntryDayReport';
import AccountBalanceBreakdownModal from '@/shared/ui/AccountBalanceBreakdownModal';
import ScrollableRegion from '@/shared/ui/ScrollableRegion';

const periodLabel = (filter, custom) => {
  const f = FILTERS.find((x) => x.value === filter);
  if (filter === 'custom' && custom.start && custom.end) return `${custom.start} → ${custom.end}`;
  return f?.label || filter;
};

const foodWastageLines = (e) => {
  const fw = e.expenses?.foodWastage || {};
  const out = [];
  (fw.cooked || []).forEach((r) => out.push({ ...r, kind: 'Cooked' }));
  (fw.raw || []).forEach((r) => out.push({ ...r, kind: 'Raw' }));
  return out.filter((r) => (r.amount || 0) > 0 || (r.qty || 0) > 0 || (r.item || '').trim());
};

export default function EntriesPage() {
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState('all');
  const [custom, setCustom] = useState({ start: '', end: '' });
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'report'
  const [expandedId, setExpandedId] = useState(null);
  const [fullReportId, setFullReportId] = useState(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [dash, setDash] = useState(null);
  const [dashLoading, setDashLoading] = useState(false);
  const [accountModalKey, setAccountModalKey] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const params = { filter, page, limit: 20 };
      if (filter === 'custom') { params.start = custom.start; params.end = custom.end; }
      const res = await entriesApi.getAll(params);
      setEntries(res.data.entries);
      setTotal(res.data.total);
      setPages(res.data.pages);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filter, page, custom]);

  useEffect(() => {
    const params = { filter };
    if (filter === 'custom') {
      params.start = custom.start;
      params.end = custom.end;
    }
    setDashLoading(true);
    dashboardApi
      .getSummary(params)
      .then((r) => setDash(r.data))
      .catch(() => setDash(null))
      .finally(() => setDashLoading(false));
  }, [filter, custom.start, custom.end]);

  useEffect(() => {
    setAccountModalKey(null);
  }, [filter, custom.start, custom.end]);

  const confirmDeleteEntry = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await entriesApi.delete(deleteId);
      setDeleteId(null);
      load();
    } catch (e) {
      console.error(e);
      alert(e.response?.data?.message || 'Could not delete entry');
    } finally {
      setDeleting(false);
    }
  };

  const pl = periodLabel(filter, custom);

  const fetchAllForExport = async () => {
    const params = { filter, page: 1, limit: 5000 };
    if (filter === 'custom') { params.start = custom.start; params.end = custom.end; }
    const res = await entriesApi.getAll(params);
    return res.data.entries || [];
  };

  const onPdfEntries = async () => {
    setPdfBusy(true);
    try {
      const list = await fetchAllForExport();
      downloadEntriesPdf(list, pl);
    } catch (e) { console.error(e); alert('Could not load entries for PDF'); }
    finally { setPdfBusy(false); }
  };

  const onPdfWastage = async () => {
    setPdfBusy(true);
    try {
      const list = await fetchAllForExport();
      downloadFoodWastagePdf(list, pl);
    } catch (e) { console.error(e); alert('Could not load entries for PDF'); }
    finally { setPdfBusy(false); }
  };

  const onPdfAccounts = async () => {
    setPdfBusy(true);
    try {
      const params = { filter };
      if (filter === 'custom') {
        params.start = custom.start;
        params.end = custom.end;
      }
      const res = await dashboardApi.getSummary(params);
      if (!res.data?.accounts) {
        alert('Could not load account balances');
        return;
      }
      downloadAccountBalancesPdf(res.data.accounts, pl);
    } catch (e) {
      console.error(e);
      alert('Could not generate account balances PDF');
    } finally {
      setPdfBusy(false);
    }
  };

  const onPdfEntriesAndAccounts = async () => {
    setPdfBusy(true);
    try {
      const params = { filter };
      if (filter === 'custom') {
        params.start = custom.start;
        params.end = custom.end;
      }
      const [list, dashRes] = await Promise.all([fetchAllForExport(), dashboardApi.getSummary(params)]);
      downloadEntriesAndAccountsCombinedPdf(list, dashRes.data?.accounts || {}, pl);
    } catch (e) {
      console.error(e);
      alert('Could not generate combined PDF');
    } finally {
      setPdfBusy(false);
    }
  };

  const accountBalanceSum =
    dash?.accounts &&
    ['cash', 'federal', 'vibgyor', 'asif'].reduce((s, k) => s + (Number(dash.accounts[k]) || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-text">Entries</h2>
          <p className="text-muted text-xs">{total} total entries · 20 per page · filter above applies to both views</p>
        </div>
        <Link to="/entries/new" className="btn-primary text-sm"><Plus size={16} /> New Entry</Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map(f => (
          <button key={f.value} onClick={() => { setFilter(f.value); setPage(1); }}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer"
            style={filter === f.value
              ? { background: 'var(--color-primary)', color: '#fff', boxShadow: '0 2px 8px rgba(139,92,246,0.4)' }
              : { background: 'rgba(255,255,255,0.05)', border: '1px solid var(--color-border)', color: 'var(--color-muted-light)' }
            }>
            {f.label}
          </button>
        ))}
        {filter === 'custom' && (
          <div className="flex gap-2 items-center">
            <input type="date" className="input text-xs py-1.5 w-36" value={custom.start} onChange={e => { setPage(1); setCustom(p => ({ ...p, start: e.target.value })); }} />
            <span className="text-muted text-xs">to</span>
            <input type="date" className="input text-xs py-1.5 w-36" value={custom.end} onChange={e => { setPage(1); setCustom(p => ({ ...p, end: e.target.value })); }} />
          </div>
        )}
      </div>

      {/* Same period as entries filter — matches dashboard “Account balances” */}
      <div className="card space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-text">Account balances</h3>
            <p className="text-muted text-xs mt-0.5">
              Revenue in this period credited to each account, minus paid expenses and salary settlements from that account. Tap a bank for the split.
            </p>
          </div>
          {dashLoading && (
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0" />
          )}
        </div>
        {dash?.accounts ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {['cash', 'federal', 'vibgyor', 'asif'].map((k) => {
                const v = Number(dash.accounts[k]) || 0;
                const neg = v < 0;
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setAccountModalKey(k)}
                    className="rounded-lg p-3 border border-border text-left w-full cursor-pointer transition-shadow hover:ring-1 hover:ring-primary/40"
                    style={{ background: 'var(--color-bg)' }}
                  >
                    <p className="text-muted text-xs mb-1">{ACCOUNT_LABELS[k]}</p>
                    <p
                      className="font-mono font-bold text-lg"
                      style={{ color: neg ? 'var(--color-danger)' : 'var(--color-success)' }}
                    >
                      {neg ? `−${fmt(Math.abs(v))}` : fmt(v)}
                    </p>
                    <p className="text-muted text-xs mt-0.5">{neg ? 'overdrawn' : 'available'}</p>
                    <p className="text-[10px] text-primary/80 mt-1">Tap for split</p>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted">
              Combined: <span className="font-mono font-medium text-text">{fmt(accountBalanceSum)}</span>
            </p>
          </>
        ) : !dashLoading ? (
          <p className="text-muted text-xs">Could not load balances for this filter.</p>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex gap-2">
          {[
            { id: 'table', label: 'Table' },
            { id: 'report', label: 'Report' },
          ].map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setViewMode(m.id)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all"
              style={viewMode === m.id
                ? { background: 'rgba(139,92,246,0.25)', border: '1px solid rgba(139,92,246,0.5)', color: '#E9D5FF' }
                : { background: 'rgba(255,255,255,0.05)', border: '1px solid var(--color-border)', color: 'var(--color-muted)' }
              }
            >
              {m.label} view
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onPdfEntries}
            className="btn-ghost text-xs py-1.5 flex items-center gap-1"
            disabled={pdfBusy || total === 0}
          >
            <FileDown size={14} /> {pdfBusy ? '…' : 'PDF — entries'}
          </button>
          <button
            type="button"
            onClick={onPdfWastage}
            className="btn-ghost text-xs py-1.5 flex items-center gap-1"
            disabled={pdfBusy || total === 0}
          >
            <FileDown size={14} /> {pdfBusy ? '…' : 'PDF — food wastage'}
          </button>
          <button
            type="button"
            onClick={onPdfAccounts}
            className="btn-ghost text-xs py-1.5 flex items-center gap-1"
            disabled={pdfBusy}
          >
            <FileDown size={14} /> {pdfBusy ? '…' : 'PDF — accounts'}
          </button>
          <button
            type="button"
            onClick={onPdfEntriesAndAccounts}
            className="btn-ghost text-xs py-1.5 flex items-center gap-1"
            disabled={pdfBusy || total === 0}
          >
            <FileDown size={14} /> {pdfBusy ? '…' : 'PDF — entries + accounts'}
          </button>
        </div>
      </div>

      {viewMode === 'report' ? (
        <div className="space-y-4">
          {loading ? (
            <div className="card flex justify-center py-16"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
          ) : entries.length === 0 ? (
            <div className="card text-center py-12 text-muted">No entries found</div>
          ) : (
            entries.map((e) => {
              const { totalRevenue, purchaseCost, indirect, netProfit, expCredit } = calcEntryTotals(e);
              const fw = foodWastageLines(e);
              return (
                <div key={e._id} className="card space-y-3">
                  <div className="flex flex-wrap justify-between gap-2 border-b border-border pb-2">
                    <div>
                      <p className="font-semibold text-text">{fmtDate(e.date)}</p>
                    </div>
                    <div className="flex gap-2">
                      <Link to={`/entries/${e._id}`} className="btn-ghost text-xs py-1"><Eye size={13} /> View</Link>
                      <Link to={`/entries/${e._id}/edit`} className="btn-ghost text-xs py-1"><Pencil size={13} /> Edit</Link>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
                    {[
                      { k: 'Revenue', v: totalRevenue, c: 'text-success' },
                      { k: 'Purchase', v: purchaseCost, c: 'text-muted-light' },
                      { k: 'Indirect', v: indirect, c: 'text-muted-light' },
                      { k: 'Profit', v: netProfit, c: netProfit >= 0 ? 'text-success' : 'text-danger' },
                      { k: 'Exp. credit', v: expCredit, c: 'text-warn' },
                    ].map((x) => (
                      <div key={x.k} className="rounded-lg p-2" style={{ background: 'var(--color-bg)' }}>
                        <p className="text-muted text-xs">{x.k}</p>
                        <p className={`font-mono font-medium ${x.c}`}>{x.k === 'Exp. credit' && expCredit <= 0 ? '—' : fmt(x.v)}</p>
                      </div>
                    ))}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted mb-2 uppercase tracking-wide">Food wastage split</p>
                    {fw.length === 0 ? (
                      <p className="text-xs text-muted">No wastage lines</p>
                    ) : (
                      <ScrollableRegion count={fw.length} innerClassName="p-0">
                      <div className="overflow-x-auto rounded-lg border border-border">
                        <table className="w-full text-xs">
                          <thead className="sticky top-0 z-[1] bg-[rgba(139,92,246,0.12)]">
                            <tr>
                              {['Type', 'Item', 'Qty', 'Amount'].map((h) => (
                                <th key={h} className={`px-3 py-2 text-left font-medium text-muted ${h === 'Amount' ? 'text-right' : ''}`}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {fw.map((r, i) => (
                              <tr key={i} className="border-t border-border/60">
                                <td className="px-3 py-1.5 text-muted-light">{r.kind}</td>
                                <td className="px-3 py-1.5 text-text">{r.item || '—'}</td>
                                <td className="px-3 py-1.5 font-mono">{r.qty ?? 0}</td>
                                <td className="px-3 py-1.5 text-right font-mono">{fmt(r.amount)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      </ScrollableRegion>
                    )}
                  </div>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setFullReportId((id) => (id === e._id ? null : e._id))}
                      className="text-xs font-medium text-primary hover:underline cursor-pointer"
                    >
                      {fullReportId === e._id ? 'Hide full day cost report' : 'Show full day cost report'}
                    </button>
                    {fullReportId === e._id && (
                      <div className="mt-2">
                        <EntryDayReport entry={e} compact />
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
          {!loading && pages > 1 && (
            <div className="flex items-center justify-between card px-4 py-3">
              <span className="text-muted text-xs">Page {page} of {pages}</span>
              <div className="flex gap-2">
                <button type="button" disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="btn-ghost text-xs py-1 px-2 disabled:opacity-40"><ChevronLeft size={14} /></button>
                <button type="button" disabled={page === pages} onClick={() => setPage((p) => p + 1)} className="btn-ghost text-xs py-1 px-2 disabled:opacity-40"><ChevronRight size={14} /></button>
              </div>
            </div>
          )}
        </div>
      ) : (
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border">
              <tr>
                {['','Date','Revenue','Purchase','Indirect','Profit','Exp Credit','actions'].map(h => (
                  <th key={h} className={`px-4 py-3 text-xs font-medium text-muted ${['','Date'].includes(h) ? 'text-left' : h === 'actions' ? 'text-right' : 'text-right'}`}>{h === 'actions' ? '' : h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="py-12 text-center"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" /></td></tr>
              ) : entries.length === 0 ? (
                <tr><td colSpan={8} className="py-12 text-center text-muted">No entries found</td></tr>
              ) : entries.map(e => {
                const { totalRevenue, purchaseCost, indirect, netProfit, expCredit } = calcEntryTotals(e);
                const fw = foodWastageLines(e);
                const open = expandedId === e._id;
                return (
                  <Fragment key={e._id}>
                  <tr className="border-b border-border/50 transition-colors" style={{ borderColor: 'rgba(255,255,255,0.06)' }} onMouseEnter={ev => ev.currentTarget.style.background='rgba(139,92,246,0.06)'} onMouseLeave={ev => ev.currentTarget.style.background='transparent'}>
                    <td className="px-2 py-3 w-8">
                      <button
                        type="button"
                        className="p-1 text-muted hover:text-text cursor-pointer"
                        title="Food wastage split"
                        onClick={() => setExpandedId(open ? null : e._id)}
                      >
                        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-text whitespace-nowrap">{fmtDate(e.date)}</td>
                    <td className="px-4 py-3 text-right font-mono text-success">{fmt(totalRevenue)}</td>
                    <td className="px-4 py-3 text-right font-mono text-muted-light">{fmt(purchaseCost)}</td>
                    <td className="px-4 py-3 text-right font-mono text-muted-light">{fmt(indirect)}</td>
                    <td className={`px-4 py-3 text-right font-mono ${netProfit >= 0 ? 'text-success' : 'text-danger'}`}>{fmt(netProfit)}</td>
                    <td className="px-4 py-3 text-right font-mono text-warn">{expCredit > 0 ? fmt(expCredit) : '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <Link to={`/entries/${e._id}`} className="p-1.5 rounded cursor-pointer transition-colors" style={{ color: '#64748B' }} onMouseEnter={e2 => { e2.currentTarget.style.color='#8B5CF6'; e2.currentTarget.style.background='rgba(139,92,246,0.1)'; }} onMouseLeave={e2 => { e2.currentTarget.style.color='#64748B'; e2.currentTarget.style.background='transparent'; }} title="View"><Eye size={14} /></Link>
                        <Link to={`/entries/${e._id}/edit`} className="p-1.5 rounded cursor-pointer transition-colors" style={{ color: '#64748B' }} onMouseEnter={e2 => { e2.currentTarget.style.color='#A78BFA'; e2.currentTarget.style.background='rgba(139,92,246,0.1)'; }} onMouseLeave={e2 => { e2.currentTarget.style.color='#64748B'; e2.currentTarget.style.background='transparent'; }} title="Edit"><Pencil size={14} /></Link>
                        {['admin','owner'].includes(user?.role) && (
                          <button type="button" onClick={() => setDeleteId(e._id)} className="p-1.5 rounded cursor-pointer transition-colors" style={{ color: '#64748B' }} onMouseEnter={e2 => { e2.currentTarget.style.color='#EF4444'; e2.currentTarget.style.background='rgba(239,68,68,0.1)'; }} onMouseLeave={e2 => { e2.currentTarget.style.color='#64748B'; e2.currentTarget.style.background='transparent'; }} title="Delete"><Trash2 size={14} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {open && (
                    <tr key={`${e._id}-fw`} className="bg-[rgba(139,92,246,0.04)]">
                      <td colSpan={8} className="px-4 py-3">
                        <p className="text-xs font-medium text-muted mb-2">Food wastage — split (cooked / raw)</p>
                        {fw.length === 0 ? (
                          <p className="text-xs text-muted">No lines recorded</p>
                        ) : (
                          <ScrollableRegion count={fw.length} innerClassName="p-0">
                          <table className="w-full max-w-xl text-xs border border-border rounded-lg overflow-hidden">
                            <thead>
                              <tr className="sticky top-0 z-[1] bg-[rgba(0,0,0,0.35)] backdrop-blur-sm">
                                {['Type', 'Item', 'Qty', 'Amount'].map((h) => (
                                  <th key={h} className={`px-3 py-1.5 text-left text-muted ${h === 'Amount' ? 'text-right' : ''}`}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {fw.map((r, i) => (
                                <tr key={i}>
                                  <td className="px-3 py-1.5 text-muted-light">{r.kind}</td>
                                  <td className="px-3 py-1.5">{r.item || '—'}</td>
                                  <td className="px-3 py-1.5 font-mono">{r.qty ?? 0}</td>
                                  <td className="px-3 py-1.5 text-right font-mono">{fmt(r.amount)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          </ScrollableRegion>
                        )}
                      </td>
                    </tr>
                  )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <span className="text-muted text-xs">Page {page} of {pages}</span>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p-1)} className="btn-ghost text-xs py-1 px-2 disabled:opacity-40"><ChevronLeft size={14} /></button>
              <button disabled={page === pages} onClick={() => setPage(p => p+1)} className="btn-ghost text-xs py-1 px-2 disabled:opacity-40"><ChevronRight size={14} /></button>
            </div>
          </div>
        )}
      </div>
      )}

      <AccountBalanceBreakdownModal
        open={Boolean(accountModalKey)}
        accountKey={accountModalKey}
        detail={accountModalKey ? dash?.cardDetails?.accountBreakdown?.[accountModalKey] : null}
        periodHint={pl}
        onClose={() => setAccountModalKey(null)}
      />

      {deleteId && (
        <ConfirmModal
          title="Delete entry?"
          danger
          confirmText="Delete"
          onCancel={() => !deleting && setDeleteId(null)}
          onConfirm={confirmDeleteEntry}
          loading={deleting}
        >
          This removes the ROI row for{' '}
          <span className="font-medium text-text">
            {fmtDate(entries.find((x) => x._id === deleteId)?.date)}
          </span>
          . This cannot be undone.
        </ConfirmModal>
      )}
    </div>
  );
}
