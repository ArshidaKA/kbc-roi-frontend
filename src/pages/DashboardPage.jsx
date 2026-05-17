import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { dashboardApi } from '@/shared/api/index';
import { fmt, FILTERS } from '@/shared/utils/format';
import AccountBalanceBreakdownModal from '@/shared/ui/AccountBalanceBreakdownModal';
import ScrollableRegion from '@/shared/ui/ScrollableRegion';
import {
  TrendingUp, TrendingDown, DollarSign, CreditCard, Users,
  Package, Plus, AlertCircle, ArrowUpRight, X
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

const PIE_COLORS = ['#10B981','#F59E0B','#8B5CF6','#EF4444','#A78BFA','#06B6D4','#F97316','#EC4899'];

const ICON_COLORS = {
  success: { bg: 'rgba(16,185,129,0.15)',  text: '#10B981' },
  danger:  { bg: 'rgba(239,68,68,0.15)',   text: '#EF4444' },
  warn:    { bg: 'rgba(245,158,11,0.15)',  text: '#F59E0B' },
  primary: { bg: 'rgba(139,92,246,0.15)',  text: '#8B5CF6' },
  muted:   { bg: 'rgba(148,163,184,0.08)', text: '#CBD5E1' },
};

// Loading skeleton shimmer
const Skeleton = ({ className = '', style = {} }) => (
  <div
    className={`rounded-lg ${className}`}
    style={{
      background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.5s infinite',
      ...style
    }}
  />
);

const StatCard = ({ label, value, sub, icon: Icon, color = 'primary', negative, onClick }) => {
  const c = ICON_COLORS[color] || ICON_COLORS.primary;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`stat-card text-left w-full ${onClick ? 'cursor-pointer hover:ring-1 hover:ring-primary/40 transition-shadow' : ''}`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-muted text-xs font-medium uppercase tracking-wide">{label}</span>
        <div style={{ background: c.bg }} className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0">
          <Icon size={15} style={{ color: c.text }} />
        </div>
      </div>
      <p className="text-xl font-bold font-mono" style={{ color: negative ? 'var(--color-danger)' : c.text }}>{value}</p>
      {sub && <p className="text-muted text-xs mt-0.5">{sub}</p>}
      {onClick && <p className="text-[10px] text-primary/80 mt-1">Tap for split-up</p>}
    </button>
  );
};

const StatCardSkeleton = () => (
  <div className="stat-card">
    <div className="flex items-center justify-between mb-2">
      <Skeleton style={{ height: 12, width: 80 }} />
      <Skeleton style={{ height: 32, width: 32, borderRadius: 8 }} />
    </div>
    <Skeleton style={{ height: 28, width: 120, marginBottom: 6 }} />
    <Skeleton style={{ height: 10, width: 100 }} />
  </div>
);

const BreakdownModal = ({ title, onClose, children }) => (
  <div className="modal-overlay z-40" onClick={onClose}>
    <div className="modal-content max-w-md space-y-3 z-50" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between border-b border-border pb-2">
        <h3 className="font-semibold text-text">{title}</h3>
        <button type="button" onClick={onClose} className="p-1 text-muted hover:text-text cursor-pointer"><X size={18} /></button>
      </div>
      {children}
    </div>
  </div>
);

const AccountCard = ({ label, value, onClick }) => {
  const neg = value < 0;
  const inner = (
    <>
      <p className="text-muted text-xs mb-1">{label}</p>
      <p className="font-mono font-bold text-lg" style={{ color: neg ? 'var(--color-danger)' : 'var(--color-success)' }}>
        {neg ? `−${fmt(Math.abs(value))}` : fmt(value)}
      </p>
      <p className="text-muted text-xs mt-0.5">{neg ? 'overdrawn' : 'available'}</p>
      {onClick && <p className="text-[10px] text-primary/80 mt-1">Tap for split</p>}
    </>
  );
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="card text-left w-full cursor-pointer hover:ring-1 hover:ring-primary/40 transition-shadow">
        {inner}
      </button>
    );
  }
  return <div className="card">{inner}</div>;
};

const ACCT_LABELS = { cash: 'Cash', federal: 'Federal Bank', vibgyor: 'Vibgyor Bank', asif: 'Asif Account' };

export default function DashboardPage() {
  const [data, setData]   = useState(null);
  const [filter, setFilter] = useState('this_month'); // ← default to this month
  const [custom, setCustom] = useState({ start: '', end: '' });
  const [loading, setLoading] = useState(true);
  const [accountsData, setAccountsData] = useState(null); // ← separate state for accounts (no filter)
  const [breakdown, setBreakdown] = useState(null);
  const [accountModalKey, setAccountModalKey] = useState(null);

  const tooltipStyle = {
    background: 'var(--tooltip-bg)',
    border: '1px solid var(--tooltip-border)',
    borderRadius: 8,
    fontSize: 12,
    color: 'var(--tooltip-color)',
  };

  // Load filtered data (revenue, expenses, charts, etc.)
  const load = async () => {
    setLoading(true);
    try {
      const params = { filter };
      if (filter === 'custom') { params.start = custom.start; params.end = custom.end; }
      const res = await dashboardApi.getSummary(params);
      setData(res.data);
      // Only set accounts on first load (all-time), not on filter changes
      if (!accountsData && res.data?.accounts) {
        setAccountsData(res.data.accounts);
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  // Load accounts once with 'all' filter so balances are always total
  const loadAccounts = async () => {
    try {
      const res = await dashboardApi.getSummary({ filter: 'all' });
      if (res.data?.accounts) setAccountsData(res.data.accounts);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { loadAccounts(); }, []); // run once on mount
  useEffect(() => { load(); }, [filter, custom]);
  useEffect(() => { setBreakdown(null); setAccountModalKey(null); }, [filter, custom]);

  const d = data || {};
  const totalCredit = d.totalCredit || 0;
  const periodHint =
    filter === 'custom' && custom.start && custom.end
      ? `${custom.start} → ${custom.end}`
      : FILTERS.find((f) => f.value === filter)?.label || filter;

  return (
    <div className="space-y-6">
      {/* Shimmer keyframe */}
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-text">ROI Dashboard</h2>
          {!loading && totalCredit > 0 && (
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-warn)' }}>
              Total credit outstanding: {fmt(totalCredit)}
            </p>
          )}
        </div>
        <Link to="/entries/new" className="btn-primary text-sm">
          <Plus size={16} /> Add entry
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map(f => {
          const isActive = filter === f.value;
          const isDefault = f.value === 'this_month';
          return (
            <button key={f.value} onClick={() => setFilter(f.value)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer relative"
              style={isActive
                ? { background: 'var(--color-primary)', color: '#fff', boxShadow: '0 2px 8px rgba(139,92,246,0.4)' }
                : isDefault
                  ? { background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.4)', color: 'var(--color-accent)' }
                  : { background: 'rgba(255,255,255,0.05)', border: '1px solid var(--color-border)', color: 'var(--color-muted-light)' }
              }>
              {f.label}
              {isDefault && !isActive && (
                <span style={{
                  position: 'absolute', top: -4, right: -4,
                  width: 8, height: 8, borderRadius: '50%',
                  background: 'var(--color-primary)',
                  border: '1.5px solid var(--color-surface)'
                }} />
              )}
            </button>
          );
        })}
        {filter === 'custom' && (
          <div className="flex gap-2 items-center">
            <input type="date" className="input text-xs py-1.5 w-36" value={custom.start} onChange={e => setCustom(p => ({ ...p, start: e.target.value }))} />
            <span className="text-muted text-xs">to</span>
            <input type="date" className="input text-xs py-1.5 w-36" value={custom.end} onChange={e => setCustom(p => ({ ...p, end: e.target.value }))} />
          </div>
        )}
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          Array(4).fill(0).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard label="Total Revenue"  value={fmt(d.totalRevenue)}  sub={`${d.recentEntries?.length || 0} entries in trend window`} icon={TrendingUp}  color="success" onClick={() => setBreakdown('revenue')} />
            <StatCard label="Total Expenses" value={fmt(d.totalExpenses)} sub={`PC ${fmt(d.totalPC)} · Ind ${fmt(d.totalIndirect)}`}          icon={TrendingDown} color="danger" onClick={() => setBreakdown('expenses')} />
            <StatCard label="Net Profit"     value={fmt(d.netProfit)}     sub={`${d.margin}% margin`} negative={d.netProfit < 0}              icon={DollarSign}   color={d.netProfit >= 0 ? 'success' : 'danger'} onClick={() => setBreakdown('net')} />
            <StatCard label="Total Credit"   value={fmt(totalCredit)}     sub={`Exp ${fmt(d.expCredit)} · Sal ${fmt(d.salaryOutstanding)}`}   icon={CreditCard}   color="warn" onClick={() => setBreakdown('credit')} />
          </>
        )}
      </div>

      {/* Breakdown modal */}
      {breakdown && d.cardDetails && (
        <BreakdownModal title={
          breakdown === 'revenue' ? 'Total revenue — split' :
          breakdown === 'expenses' ? 'Total expenses — split' :
          breakdown === 'net' ? 'Net profit — how it is calculated' :
          'Total credit — split'
        } onClose={() => setBreakdown(null)}>
          {breakdown === 'revenue' && (
            <div className="space-y-2 text-sm">
              {(d.cardDetails.revenue?.lines || []).length === 0 && (
                <p className="text-muted text-xs py-2">No revenue by channel in this period.</p>
              )}
              {(d.cardDetails.revenue?.lines || []).map((row) => (
                <div key={row.label} className="flex justify-between border-b border-border/50 py-1.5">
                  <span className="text-muted">{row.label}</span>
                  <span className="font-mono text-success">{fmt(row.value)}</span>
                </div>
              ))}
              <div className="flex justify-between pt-2 font-semibold text-text">
                <span>Total</span>
                <span className="font-mono">{fmt(d.cardDetails.revenue?.total)}</span>
              </div>
            </div>
          )}
          {breakdown === 'expenses' && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between border-b border-border/50 py-1.5">
                <span className="text-muted">Purchase cost</span>
                <span className="font-mono text-text">{fmt(d.cardDetails.expenses?.purchaseCost)}</span>
              </div>
              <p className="text-xs text-muted uppercase tracking-wide pt-2">Indirect (by category)</p>
              <ScrollableRegion count={(d.cardDetails.expenses?.indirectLines || []).length} innerClassName="px-0">
                {(d.cardDetails.expenses?.indirectLines || []).map((row) => (
                  <div key={row.label} className="flex justify-between border-b border-border/40 py-1.5 pl-2">
                    <span className="text-muted-light text-xs">{row.label}</span>
                    <span className="font-mono text-sm" style={{ color: 'var(--color-danger)' }}>{fmt(row.value)}</span>
                  </div>
                ))}
              </ScrollableRegion>
              <div className="flex justify-between pt-2 font-semibold text-text">
                <span>Total expenses</span>
                <span className="font-mono">{fmt(d.cardDetails.expenses?.total)}</span>
              </div>
            </div>
          )}
          {breakdown === 'net' && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between border-b border-border/50 py-1.5">
                <span className="text-muted">Total revenue</span>
                <span className="font-mono text-success">{fmt(d.cardDetails.netProfit?.totalRevenue)}</span>
              </div>
              <div className="flex justify-between border-b border-border/50 py-1.5">
                <span className="text-muted">Less purchase cost</span>
                <span className="font-mono text-danger">−{fmt(d.cardDetails.netProfit?.purchaseCost)}</span>
              </div>
              <div className="flex justify-between border-b border-border/50 py-1.5">
                <span className="text-muted">Less indirect expenses</span>
                <span className="font-mono text-danger">−{fmt(d.cardDetails.netProfit?.indirect)}</span>
              </div>
              <div className="flex justify-between pt-2 font-semibold text-text">
                <span>Net profit</span>
                <span className={`font-mono ${d.cardDetails.netProfit?.total >= 0 ? 'text-success' : 'text-danger'}`}>{fmt(d.cardDetails.netProfit?.total)}</span>
              </div>
            </div>
          )}
          {breakdown === 'credit' && (
            <div className="space-y-2 text-sm">
              {[
                ['Expense credit outstanding', d.cardDetails.credit?.expenseCredit],
                ['Salary outstanding (billed − settled)', d.cardDetails.credit?.salaryOutstanding],
              ].map(([label, val]) => (
                <div key={label} className="flex justify-between border-b border-border/50 py-1.5">
                  <span className="text-muted text-xs pr-2">{label}</span>
                  <span className="font-mono text-warn shrink-0">{fmt(val)}</span>
                </div>
              ))}
              <p className="text-xs text-muted pt-2">Reference: expense credits settled {fmt(d.cardDetails.credit?.expenseCreditSettled)} · salary payments recorded {fmt(d.cardDetails.credit?.totalSalarySettled)}</p>
              <div className="flex justify-between pt-2 font-semibold text-text">
                <span>Combined credit</span>
                <span className="font-mono text-warn">{fmt(d.cardDetails.credit?.total)}</span>
              </div>
            </div>
          )}
        </BreakdownModal>
      )}

      {/* Credit detail */}
      {!loading && totalCredit > 0 && (
        <div className="card" style={{ borderColor: 'rgba(217,119,6,0.3)', background: 'rgba(217,119,6,0.05)' }}>
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle size={16} style={{ color: 'var(--color-warn)' }} />
            <span className="font-medium text-sm" style={{ color: 'var(--color-warn)' }}>
              Credit Outstanding — {fmt(totalCredit)}
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            {[
              ['Exp Credit',      fmt(d.expCredit)],
              ['Salary Due',      fmt(d.salaryOutstanding)],
              ['Exp Settled',     fmt(d.expCreditSettled)],
              ['Salary Settled',  fmt(d.totalSalarySettled)],
            ].map(([label, val]) => (
              <div key={label}>
                <p className="text-muted">{label}</p>
                <p className="text-text font-mono font-medium mt-0.5">{val}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Account Balances — always shows all-time totals, no filter applied */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">Account Balances</h3>
          <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(139,92,246,0.12)', color: 'var(--color-primary)' }}>
            All-time
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {accountsData
            ? Object.entries(accountsData).map(([k, v]) => (
                <AccountCard
                  key={k}
                  label={ACCT_LABELS[k] || k}
                  value={v}
                  onClick={() => setAccountModalKey(k)}
                />
              ))
            : Array(4).fill(0).map((_, i) => (
                <div key={i} className="card">
                  <Skeleton style={{ height: 12, width: 70, marginBottom: 8 }} />
                  <Skeleton style={{ height: 24, width: 100, marginBottom: 6 }} />
                  <Skeleton style={{ height: 10, width: 60 }} />
                </div>
              ))
          }
        </div>
        {accountsData && (
          <p className="text-xs text-muted mt-3">
            Combined balance (all accounts):
            <span className="font-mono font-medium text-text ml-2">
              {fmt(Object.values(accountsData).reduce((sum, v) => sum + (Number(v) || 0), 0))}
            </span>
          </p>
        )}
      </div>

      <AccountBalanceBreakdownModal
        open={Boolean(accountModalKey)}
        accountKey={accountModalKey}
        detail={accountModalKey ? d.cardDetails?.accountBreakdown?.[accountModalKey] : null}
        periodHint={periodHint}
        onClose={() => setAccountModalKey(null)}
      />

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card lg:col-span-2">
          <h3 className="text-sm font-semibold text-text mb-4">Performance Trend</h3>
          {loading ? (
            <Skeleton style={{ height: 200 }} />
          ) : d.trend?.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={d.trend}>
                <XAxis dataKey="date" tick={{ fill: 'var(--color-muted)', fontSize: 11 }} tickFormatter={v => v.slice(5)} />
                <YAxis tick={{ fill: 'var(--color-muted)', fontSize: 11 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                <Tooltip contentStyle={tooltipStyle} formatter={v => [fmt(v)]} labelFormatter={l => `Date: ${l}`} />
                <Line type="monotone" dataKey="revenue"  stroke="#10B981" strokeWidth={2} dot={false} name="Revenue" />
                <Line type="monotone" dataKey="expenses" stroke="#EF4444" strokeWidth={2} dot={false} name="Expenses" />
                <Line type="monotone" dataKey="profit"   stroke="#8B5CF6" strokeWidth={2} dot={false} name="Profit" />
              </LineChart>
            </ResponsiveContainer>
          ) : <div className="flex items-center justify-center h-40 text-muted text-sm">No data for this period</div>}
        </div>

        <div className="card">
          <h3 className="text-sm font-semibold text-text mb-4">Expense Split</h3>
          {loading ? (
            <Skeleton style={{ height: 200 }} />
          ) : d.expenseSplit?.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={d.expenseSplit} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={false}>
                  {d.expenseSplit.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={v => [fmt(v)]} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 11, color: 'var(--color-muted-light)' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="flex items-center justify-center h-40 text-muted text-sm">No expenses</div>}
        </div>
      </div>

      {/* Stock + Staff */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-text flex items-center gap-2"><Package size={15} /> Today's Stock</h3>
            <Link to="/stock" className="text-xs hover:underline flex items-center gap-1" style={{ color: 'var(--color-primary)' }}>Manage <ArrowUpRight size={12} /></Link>
          </div>
          {loading ? (
            <div className="grid grid-cols-2 gap-2">
              {Array(4).fill(0).map((_, i) => (
                <div key={i} className="rounded-lg p-3" style={{ background: 'var(--color-bg)' }}>
                  <Skeleton style={{ height: 10, width: 60, marginBottom: 8 }} />
                  <Skeleton style={{ height: 20, width: 80 }} />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 text-sm">
              {[
                { label: 'Opening', val: d.stock?.todayOpening, pending: true },
                { label: 'Closing', val: d.stock?.todayClosing, pending: true },
                { label: 'Mo. Opening', val: d.stock?.monthOpening },
                { label: 'Mo. Closing', val: d.stock?.monthClosing },
              ].map(({ label, val, pending }) => (
                <div key={label} className="rounded-lg p-3" style={{ background: 'var(--color-bg)' }}>
                  <p className="text-muted text-xs">{label}</p>
                  <p className="font-mono font-bold mt-0.5" style={{ color: (pending && val === null) ? 'var(--color-muted)' : 'var(--color-text)' }}>
                    {(pending && (val === null || val === undefined)) ? 'Pending' : fmt(val)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-text flex items-center gap-2"><Users size={15} /> Staff</h3>
            <Link to="/staff" className="text-xs hover:underline flex items-center gap-1" style={{ color: 'var(--color-primary)' }}>View <ArrowUpRight size={12} /></Link>
          </div>
          {loading ? (
            <div className="space-y-1">
              {Array(3).fill(0).map((_, i) => (
                <div key={i} className="flex justify-between py-1.5 border-b border-border">
                  <Skeleton style={{ height: 14, width: 80 }} />
                  <Skeleton style={{ height: 14, width: 60 }} />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-1 text-sm">
              {[
                { label: 'Monthly Bill',  val: fmt(d.staff?.totalBill),    color: 'var(--color-text)' },
                { label: 'Settled',       val: fmt(d.staff?.totalSettled), color: 'var(--color-success)' },
                { label: 'Outstanding',   val: fmt(d.staff?.outstanding),  color: 'var(--color-warn)' },
              ].map(({ label, val, color }) => (
                <div key={label} className="flex justify-between py-1.5 border-b border-border last:border-0">
                  <span className="text-muted">{label}</span>
                  <span className="font-mono font-medium" style={{ color }}>{val}</span>
                </div>
              ))}
            </div>
          )}
          <div className="mt-3 flex gap-2">
            <Link to="/staff" className="btn-ghost text-xs flex-1 justify-center py-1.5">Salary Settlements</Link>
            <Link to="/staff/manage" className="btn-ghost text-xs flex-1 justify-center py-1.5">Add Staff</Link>
          </div>
        </div>
      </div>

    </div>
  );
}