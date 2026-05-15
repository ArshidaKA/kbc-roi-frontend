export const fmt = (n) =>
  `₹${Number(n || 0).toLocaleString('en-IN')}`;

export const fmtDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
};

export const fmtDateInput = (d) => {
  if (!d) return '';
  const dt = new Date(d);
  return dt.toISOString().split('T')[0];
};

export const ACCOUNTS = [
  { value: 'cash', label: 'Cash' },
  { value: 'federal', label: 'Federal Bank' },
  { value: 'vibgyor', label: 'Vibgyor Bank' },
  { value: 'asif', label: 'Asif Account' },
];

export const ACCOUNT_LABELS = {
  cash: 'Cash',
  federal: 'Federal Bank',
  vibgyor: 'Vibgyor Bank',
  asif: 'Asif Account',
};

export const FILTERS = [
  { value: 'all', label: 'All time' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
  { value: 'lastmonth', label: 'Last month' },
  { value: 'year', label: 'This year' },
  { value: 'custom', label: 'Custom' },
];

/** Coerce stored amounts (Mongo / JSON may be strings) — avoids wrong totals from string concatenation. */
export const money = (x) => Number(x) || 0;

export const calcEntryTotals = (entry) => {
  const rev = entry?.revenue || {};
  const sumChannels = money(rev.cash) + money(rev.federal) + money(rev.vibgyor) + money(rev.asif);
  /** Prefer sum of channels; if all zero, fall back to legacy `revenue.total` when present. */
  const totalRevenue = sumChannels > 0 ? sumChannels : money(rev.total);

  let purchaseCost = 0, indirect = 0, expCredit = 0;
  (entry?.purchaseCost || []).forEach((p) => {
    const amt = money(p.amount);
    purchaseCost += amt;
    if (p.isCredit) expCredit += amt - money(p.creditSettled);
  });

  const addOp = (op) => {
    if (!op) return;
    const amt = money(op.amount);
    indirect += amt;
    if (op.isCredit) expCredit += amt - money(op.creditSettled);
  };
  const ops = entry?.expenses?.operations || {};
  Object.values(ops).forEach(addOp);
  [entry?.expenses?.gas?.staff, entry?.expenses?.gas?.store].forEach(addOp);
  (entry?.expenses?.royaltyFees || []).forEach(addOp);
  (entry?.expenses?.marketing || []).forEach(addOp);
  (entry?.expenses?.other || []).forEach(addOp);
  (entry?.expenses?.salary || []).forEach(addOp);

  const fw = entry?.expenses?.foodWastage || {};
  [...(fw.cooked || []), ...(fw.raw || [])].forEach((f) => {
    indirect += money(f.amount);
  });

  return {
    totalRevenue,
    purchaseCost,
    indirect,
    totalExpenses: purchaseCost + indirect,
    netProfit: totalRevenue - purchaseCost - indirect,
    expCredit,
  };
};

/** Non-purchase indirect lines for reports (labels aligned with dashboard expense split). */
export const getEntryIndirectBreakdown = (entry) => {
  const lines = [];
  const push = (label, value) => {
    const v = money(value);
    if (v > 0) lines.push({ label, value: v });
  };
  const ops = entry?.expenses?.operations || {};
  push('Food & Refreshment', ops.foodRefreshment?.amount);
  push('Rent', ops.rent?.amount);
  push('Electricity', ops.electricity?.amount);
  push('Travel & Fuel', ops.travelFuel?.amount);
  push('Mobile & Internet', ops.mobileInternet?.amount);
  push('Maintenance', ops.maintenance?.amount);
  push('Incentive', ops.incentive?.amount);
  push('Gas — Staff', entry?.expenses?.gas?.staff?.amount);
  push('Gas — Store', entry?.expenses?.gas?.store?.amount);
  (entry?.expenses?.royaltyFees || []).forEach((r) => push(r.label || 'Royalty / Management', r.amount));
  (entry?.expenses?.marketing || []).forEach((m) => push(m.label || 'Marketing', m.amount));
  const fw = entry?.expenses?.foodWastage || {};
  let fwCooked = 0;
  let fwRaw = 0;
  (fw.cooked || []).forEach((f) => { fwCooked += money(f.amount); });
  (fw.raw || []).forEach((f) => { fwRaw += money(f.amount); });
  push('Food Wastage — cooked', fwCooked);
  push('Food Wastage — raw', fwRaw);
  (entry?.expenses?.other || []).forEach((o) => push(o.label || 'Other', o.amount));
  let sal = 0;
  (entry?.expenses?.salary || []).forEach((s) => { sal += money(s.amount); });
  push('Salary (staff payments)', sal);
  return lines.sort((a, b) => b.value - a.value);
};
