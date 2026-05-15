import { fmt, ACCOUNT_LABELS, calcEntryTotals, getEntryIndirectBreakdown, money } from '@/shared/utils/format';
import ScrollableRegion from '@/shared/ui/ScrollableRegion';

/**
 * Full P&L-style breakdown for one ROI entry (revenue by account, purchase, every indirect line incl. salary & wastage).
 */
export default function EntryDayReport({ entry, compact = false }) {
  const { totalRevenue, purchaseCost, indirect, netProfit, expCredit, totalExpenses } = calcEntryTotals(entry);
  const indirectLines = getEntryIndirectBreakdown(entry);
  const rev = entry?.revenue || {};
  const channels = [
    ['cash', 'Cash'],
    ['federal', 'Federal Bank'],
    ['vibgyor', 'Vibgyor Bank'],
    ['asif', 'Asif Account'],
  ].filter(([k]) => money(rev[k]) > 0);
  const legacyRevenueOnly = channels.length === 0 && totalRevenue > 0;

  const text = compact ? 'text-xs' : 'text-sm';
  const th = compact ? 'text-[10px] px-2 py-1' : 'text-xs px-3 py-2';

  return (
    <div className={`space-y-4 rounded-lg border border-border ${compact ? 'p-3' : 'p-4'}`} style={{ background: 'var(--color-bg)' }}>
      <p className={`font-semibold text-text ${compact ? 'text-xs' : 'text-sm'}`}>Full day — revenue & costs</p>

      <div>
        <p className={`text-muted font-medium mb-1.5 uppercase tracking-wide ${compact ? 'text-[10px]' : 'text-xs'}`}>Revenue by account</p>
        <table className={`w-full ${text}`}>
          <tbody>
            {legacyRevenueOnly ? (
              <tr className="border-t border-border/50">
                <td className={`py-1.5 ${th} text-muted`}>Total revenue (no per-account split stored)</td>
                <td className={`py-1.5 text-right font-mono text-success ${th}`}>{fmt(totalRevenue)}</td>
              </tr>
            ) : channels.length === 0 ? (
              <tr><td colSpan={2} className="text-muted py-1">No channel revenue recorded</td></tr>
            ) : (
              channels.map(([k, label]) => (
                <tr key={k} className="border-t border-border/50">
                  <td className={`py-1.5 ${th} text-muted`}>{label}</td>
                  <td className={`py-1.5 text-right font-mono text-success ${th}`}>{fmt(money(rev[k]))}</td>
                </tr>
              ))
            )}
            {!legacyRevenueOnly && (
              <tr className="border-t border-border font-semibold">
                <td className={`py-2 ${th} text-text`}>Total revenue</td>
                <td className={`py-2 text-right font-mono text-success ${th}`}>{fmt(totalRevenue)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div>
        <p className={`text-muted font-medium mb-1.5 uppercase tracking-wide ${compact ? 'text-[10px]' : 'text-xs'}`}>Purchase cost</p>
        {(entry?.purchaseCost || []).length === 0 ? (
          <p className="text-muted text-xs py-1">No purchase lines</p>
        ) : (
          <ScrollableRegion count={(entry.purchaseCost || []).length} innerClassName="p-0">
          <table className={`w-full ${text}`}>
            <thead className={`sticky top-0 z-[1] border-b border-border/60 ${compact ? 'text-[10px]' : 'text-xs'}`} style={{ background: 'var(--color-bg)' }}>
              <tr>
                <th className={`text-left text-muted font-medium py-2 ${th}`}>Item / vendor / account</th>
                <th className={`text-right text-muted font-medium py-2 ${th}`}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {(entry.purchaseCost || []).map((p, i) => (
                <tr key={i} className="border-t border-border/50">
                  <td className={`py-1.5 ${th}`}>
                    <span className="text-text">{p.item || '—'}</span>
                    {p.vendorName ? <span className="text-muted block text-[10px]">{p.vendorName}</span> : null}
                    {p.fromAccount ? <span className="text-muted block text-[10px]">{ACCOUNT_LABELS[p.fromAccount] || p.fromAccount}</span> : null}
                  </td>
                  <td className={`py-1.5 text-right font-mono ${th}`}>{fmt(money(p.amount))}</td>
                </tr>
              ))}
              <tr className="border-t border-border font-semibold">
                <td className={`py-2 ${th} text-text`}>Total purchase</td>
                <td className={`py-2 text-right font-mono ${th}`}>{fmt(purchaseCost)}</td>
              </tr>
            </tbody>
          </table>
          </ScrollableRegion>
        )}
      </div>

      <div>
        <p className={`text-muted font-medium mb-1.5 uppercase tracking-wide ${compact ? 'text-[10px]' : 'text-xs'}`}>Indirect & other expenses</p>
        {indirectLines.length === 0 ? (
          <p className="text-muted text-xs py-1">No indirect lines</p>
        ) : (
          <ScrollableRegion count={indirectLines.length} innerClassName="p-0">
          <table className={`w-full ${text}`}>
            <thead className={`sticky top-0 z-[1] border-b border-border/60 ${compact ? 'text-[10px]' : 'text-xs'}`} style={{ background: 'var(--color-bg)' }}>
              <tr>
                <th className={`text-left text-muted font-medium py-2 ${th}`}>Category</th>
                <th className={`text-right text-muted font-medium py-2 ${th}`}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {indirectLines.map((row) => (
                <tr key={row.label} className="border-t border-border/50">
                  <td className={`py-1.5 ${th} text-muted`}>{row.label}</td>
                  <td className={`py-1.5 text-right font-mono text-danger ${th}`}>{fmt(row.value)}</td>
                </tr>
              ))}
              <tr className="border-t border-border font-semibold">
                <td className={`py-2 ${th} text-text`}>Total indirect</td>
                <td className={`py-2 text-right font-mono text-danger ${th}`}>{fmt(indirect)}</td>
              </tr>
            </tbody>
          </table>
          </ScrollableRegion>
        )}
      </div>

      <div className={`border-t border-border pt-3 space-y-1.5 ${text}`}>
        <div className="flex justify-between">
          <span className="text-muted">Total expenses (purchase + indirect)</span>
          <span className="font-mono text-danger">{fmt(totalExpenses)}</span>
        </div>
        <div className="flex justify-between font-semibold text-text">
          <span>Net profit</span>
          <span className={`font-mono ${netProfit >= 0 ? 'text-success' : 'text-danger'}`}>{fmt(netProfit)}</span>
        </div>
        {expCredit > 0 && (
          <div className="flex justify-between text-warn">
            <span>Expense credit outstanding</span>
            <span className="font-mono">{fmt(expCredit)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
