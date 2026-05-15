import { fmt, fmtDate, ACCOUNT_LABELS } from '@/shared/utils/format';
import { X } from 'lucide-react';
import ScrollableRegion from '@/shared/ui/ScrollableRegion';

/**
 * @param {object} props
 * @param {boolean} props.open
 * @param {string} props.accountKey — cash | federal | vibgyor | asif
 * @param {object} [props.detail] — server `cardDetails.accountBreakdown[key]`
 * @param {string} [props.periodHint] — e.g. "This month"
 * @param {() => void} props.onClose
 */
export default function AccountBalanceBreakdownModal({ open, accountKey, detail, periodHint, onClose }) {
  if (!open || !accountKey) return null;

  const title = `${ACCOUNT_LABELS[accountKey] || accountKey} — how this balance is built`;

  const Row = ({ label, value, valueClass = 'text-text', prefix = '' }) => (
    <div className="flex justify-between gap-3 border-b border-border/50 py-2 text-sm">
      <span className="text-muted text-xs leading-snug pr-2">{label}</span>
      <span className={`font-mono shrink-0 ${valueClass}`}>
        {prefix}
        {fmt(Math.abs(Number(value) || 0))}
      </span>
    </div>
  );

  return (
    <div className="modal-overlay z-40" onClick={onClose}>
      <div className="modal-content max-w-md max-h-[85vh] overflow-y-auto space-y-2 z-50" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border pb-2 sticky top-0 bg-[var(--color-card)] pt-0">
          <h3 className="font-semibold text-text pr-2">{title}</h3>
          <button type="button" onClick={onClose} className="p-1 text-muted hover:text-text cursor-pointer shrink-0">
            <X size={18} />
          </button>
        </div>
        {periodHint && <p className="text-xs text-muted">{periodHint}</p>}
        {!detail ? (
          <p className="text-muted text-sm py-4">No breakdown data.</p>
        ) : (
          <>
            <p className="text-xs text-muted">
              Ending balance is revenue credited to this account in the period, minus cash paid from this account
              (purchases, indirect expenses, manual ROI salary lines), minus amounts settled on credited expenses
              (vendor credit paid from this account), minus staff salary settlements dated in the period.
            </p>
            <Row label="Revenue credited to this account" value={detail.revenueIn} valueClass="text-success" prefix="+" />
            {detail.purchasePaid > 0 && (
              <Row label="Purchase & vendors (paid from this account)" value={detail.purchasePaid} valueClass="text-danger" prefix="−" />
            )}
            <ScrollableRegion count={(detail.indirectLines || []).length} innerClassName="px-0">
            {(detail.indirectLines || []).map((row) => (
              <Row key={row.label} label={row.label} value={row.value} valueClass="text-danger" prefix="−" />
            ))}
            </ScrollableRegion>
            {detail.manualSalaryPaid > 0 && (
              <Row label="Salary on ROI entry (manual / not linked to Staff payment)" value={detail.manualSalaryPaid} valueClass="text-danger" prefix="−" />
            )}
            {(detail.salarySettlements || []).length > 0 && (
              <div className="pt-2">
                <p className="text-xs font-medium text-muted uppercase tracking-wide mb-1">Staff salary settlements (from this account)</p>
                <ScrollableRegion count={detail.salarySettlements.length} innerClassName="p-0 rounded-lg border border-border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 z-[1] bg-[rgba(139,92,246,0.12)] backdrop-blur-sm">
                      <tr>
                        {['Staff', 'Date', 'Note', 'Amount'].map((h) => (
                          <th key={h} className={`px-2 py-1.5 text-left font-medium text-muted ${h === 'Amount' ? 'text-right' : ''}`}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {detail.salarySettlements.map((s, i) => (
                        <tr key={`${s.staffName}-${i}`} className="border-t border-border/60">
                          <td className="px-2 py-1.5 text-text">{s.staffName}</td>
                          <td className="px-2 py-1.5 text-muted whitespace-nowrap">{fmtDate(s.date)}</td>
                          <td className="px-2 py-1.5 text-muted truncate max-w-[100px]">{s.note || '—'}</td>
                          <td className="px-2 py-1.5 text-right font-mono text-danger">−{fmt(s.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ScrollableRegion>
                <p className="text-xs text-muted mt-1">
                  Subtotal settlements: −
                  {fmt(detail.salarySettlements.reduce((sum, s) => sum + (Number(s.amount) || 0), 0))}
                </p>
              </div>
            )}
            <div className="flex justify-between pt-3 border-t border-border font-semibold text-text text-sm">
              <span>Ending balance</span>
              <span className={`font-mono ${detail.endingBalance < 0 ? 'text-danger' : 'text-success'}`}>
                {detail.endingBalance < 0 ? `−${fmt(Math.abs(detail.endingBalance))}` : fmt(detail.endingBalance)}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
