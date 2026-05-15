import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { entriesApi } from '@/shared/api/index';
import { fmt, fmtDate, ACCOUNT_LABELS, calcEntryTotals } from '@/shared/utils/format';
import { ArrowLeft, Pencil, CreditCard } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import EntryDayReport from '@/shared/ui/EntryDayReport';
import ScrollableRegion from '@/shared/ui/ScrollableRegion';

const Row = ({ label, value, credit, mono = true }) => (
  <div className="flex justify-between py-2 border-b border-border/50 last:border-0">
    <span className="text-muted text-sm">{label}</span>
    <div className="text-right">
      <span className={`text-sm ${mono ? 'font-mono' : ''} text-text`}>{value}</span>
      {credit > 0 && <span className="ml-2 badge-warn">Credit {fmt(credit)}</span>}
    </div>
  </div>
);

export default function EntryDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [entry, setEntry] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    entriesApi.getOne(id).then(r => setEntry(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!entry) return <div className="text-muted text-center py-20">Entry not found</div>;

  const { totalRevenue, purchaseCost, indirect, netProfit, expCredit } = calcEntryTotals(entry);
  const ops = entry.expenses?.operations || {};
  const gas = entry.expenses?.gas || {};
  const fw = entry.expenses?.foodWastage || {};

  const Section = ({ title, children }) => (
    <div className="card">
      <h3 className="font-semibold text-text border-b border-border pb-2 mb-3">{title}</h3>
      {children}
    </div>
  );

  const ExpItem = ({ label, item }) => item?.amount > 0 ? (
    <Row label={label} value={fmt(item.amount)} credit={item.isCredit ? (item.amount - (item.creditSettled || 0)) : 0} />
  ) : null;

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link to="/entries" className="btn-ghost text-sm py-1.5 px-2"><ArrowLeft size={16} /></Link>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-text">Entry — {fmtDate(entry.date)}</h2>
          {entry.ventureName && <p className="text-muted text-sm">{entry.ventureName}</p>}
        </div>
        <Link to={`/entries/${id}/edit`} className="btn-ghost text-sm"><Pencil size={15} /> Edit</Link>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Revenue', value: fmt(totalRevenue), color: 'success' },
          { label: 'Purchase Cost', value: fmt(purchaseCost), color: 'muted-light' },
          { label: 'Indirect Exp', value: fmt(indirect), color: 'muted-light' },
          { label: 'Net Profit', value: fmt(netProfit), color: netProfit >= 0 ? 'success' : 'danger' },
        ].map(c => (
          <div key={c.label} className="card text-center">
            <p className="text-muted text-xs mb-1">{c.label}</p>
            <p className="font-mono font-bold" style={{ color: c.color === 'success' ? 'var(--color-success)' : c.color === 'danger' ? 'var(--color-danger)' : 'var(--color-muted-light)' }}>{c.value}</p>
          </div>
        ))}
      </div>

      {expCredit > 0 && (
        <div className="card border-warn/30 bg-warn/5 flex items-center gap-2">
          <CreditCard size={15} className="text-warn" />
          <span className="text-warn text-sm">Credit Outstanding: {fmt(expCredit)}</span>
        </div>
      )}

      <div className="card">
        <EntryDayReport entry={entry} />
      </div>

      {/* Purchase */}
      {entry.purchaseCost?.length > 0 && (
        <Section title="Purchase Cost">
          <ScrollableRegion count={entry.purchaseCost.length} innerClassName="px-1">
          {entry.purchaseCost.map((p, i) => (
            <div key={i} className="py-2 border-b border-border/50 last:border-0">
              <div className="flex justify-between">
                <div>
                  <p className="text-text text-sm">{p.item || 'Item'}</p>
                  {p.vendorName && <p className="text-muted text-xs">{p.vendorName}</p>}
                  {p.fromAccount && <p className="text-muted text-xs">From: {ACCOUNT_LABELS[p.fromAccount]}</p>}
                </div>
                <div className="text-right">
                  <p className="font-mono text-sm">{fmt(p.amount)}</p>
                  {p.isCredit && <span className="badge-warn">Credit {fmt((p.amount||0)-(p.creditSettled||0))}</span>}
                </div>
              </div>
            </div>
          ))}
          </ScrollableRegion>
        </Section>
      )}

      {/* Operations */}
      <Section title="Operations">
        <ExpItem label="Food & Refreshment" item={ops.foodRefreshment} />
        <ExpItem label="Rent" item={ops.rent} />
        <ExpItem label="Electricity" item={ops.electricity} />
        <ExpItem label="Travel & Fuel" item={ops.travelFuel} />
        <ExpItem label="Mobile & Internet" item={ops.mobileInternet} />
        <ExpItem label="Maintenance" item={ops.maintenance} />
        <ExpItem label="Incentive" item={ops.incentive} />
        <ExpItem label="Gas — Staff" item={gas.staff} />
        <ExpItem label="Gas — Store" item={gas.store} />
        {Object.values(ops).every(o => !o?.amount) && !gas.staff?.amount && !gas.store?.amount && (
          <p className="text-muted text-sm text-center py-2">No operations recorded</p>
        )}
      </Section>

      {entry.expenses?.royaltyFees?.length > 0 && (
        <Section title="Royalty / Management Fees">
          <ScrollableRegion count={entry.expenses.royaltyFees.length} innerClassName="px-1">
          {entry.expenses.royaltyFees.map((r, i) => <Row key={i} label={r.label || 'Fee'} value={fmt(r.amount)} credit={r.isCredit ? (r.amount - (r.creditSettled||0)) : 0} />)}
          </ScrollableRegion>
        </Section>
      )}

      {entry.expenses?.marketing?.length > 0 && (
        <Section title="Marketing">
          <ScrollableRegion count={entry.expenses.marketing.length} innerClassName="px-1">
          {entry.expenses.marketing.map((m, i) => <Row key={i} label={m.label || 'Campaign'} value={fmt(m.amount)} credit={m.isCredit ? (m.amount - (m.creditSettled||0)) : 0} />)}
          </ScrollableRegion>
        </Section>
      )}

      {(fw.cooked?.length > 0 || fw.raw?.length > 0) && (
        <Section title="Food Wastage">
          {fw.cooked?.length > 0 && (
            <>
              <p className="text-muted-light text-xs font-medium mb-1">Cooked</p>
              <ScrollableRegion count={fw.cooked.length} innerClassName="px-1">
                {fw.cooked.map((f, i) => (
                  <Row key={i} label={`${f.item || '—'}${(f.qty ?? 0) > 0 ? ` · qty ${f.qty}` : ''}`} value={fmt(f.amount)} />
                ))}
              </ScrollableRegion>
            </>
          )}
          {fw.raw?.length > 0 && (
            <>
              <p className="text-muted-light text-xs font-medium mt-2 mb-1">Raw</p>
              <ScrollableRegion count={fw.raw.length} innerClassName="px-1">
                {fw.raw.map((f, i) => (
                  <Row key={i} label={`${f.item || '—'}${(f.qty ?? 0) > 0 ? ` · qty ${f.qty}` : ''}`} value={fmt(f.amount)} />
                ))}
              </ScrollableRegion>
            </>
          )}
        </Section>
      )}

      {entry.expenses?.other?.length > 0 && (
        <Section title="Other">
          <ScrollableRegion count={entry.expenses.other.length} innerClassName="px-1">
          {entry.expenses.other.map((o, i) => <Row key={i} label={o.label || 'Other'} value={fmt(o.amount)} credit={o.isCredit ? (o.amount - (o.creditSettled||0)) : 0} />)}
          </ScrollableRegion>
        </Section>
      )}

      {entry.expenses?.salary?.length > 0 && (
        <Section title="Salary Payments">
          <ScrollableRegion count={entry.expenses.salary.length} innerClassName="px-1">
          {entry.expenses.salary.map((s, i) => (
            <div key={i} className="py-2 border-b border-border/50 last:border-0 flex justify-between">
              <div>
                <p className="text-text text-sm">{s.staffName || 'Staff'}</p>
                {s.note && <p className="text-muted text-xs">{s.note}</p>}
              </div>
              <div className="text-right">
                <p className="font-mono text-sm">{fmt(s.amount)}</p>
                {s.isCredit && <span className="badge-warn">Credit</span>}
              </div>
            </div>
          ))}
          </ScrollableRegion>
        </Section>
      )}

      <div className="pb-8" />
    </div>
  );
}
