import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { fmt, fmtDate, calcEntryTotals, ACCOUNT_LABELS } from '@/shared/utils/format';

const rupee = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

const accountRows = (accounts) => {
  const a = accounts || {};
  return ['cash', 'federal', 'vibgyor', 'asif'].map((k) => [
    ACCOUNT_LABELS[k] || k,
    rupee(a[k]),
  ]);
};

/** Estimated cash per bank account for the selected period (same logic as dashboard). */
export function downloadAccountBalancesPdf(accounts, periodLabel = '') {
  const doc = new jsPDF({ orientation: 'portrait' });
  doc.setFontSize(14);
  doc.text(`Account balances${periodLabel ? ` — ${periodLabel}` : ''}`, 14, 16);
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text('Revenue credited to each account in this period, minus expenses and salary settlements paid from that account.', 14, 22, { maxWidth: 180 });
  doc.setTextColor(0, 0, 0);
  const body = accountRows(accounts);
  const sum = ['cash', 'federal', 'vibgyor', 'asif'].reduce((s, k) => s + (Number(accounts?.[k]) || 0), 0);
  autoTable(doc, {
    startY: 30,
    head: [['Account', 'Balance']],
    body,
    foot: [['Combined total', rupee(sum)]],
    showFoot: 'lastPage',
    styles: { fontSize: 10 },
    headStyles: { fillColor: [16, 185, 129] },
    footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
  });
  doc.save(`account-balances-${new Date().toISOString().slice(0, 10)}.pdf`);
}

/** One PDF: entries summary (landscape) + account balances (portrait page 2). */
export function downloadEntriesAndAccountsCombinedPdf(entries, accounts, periodLabel = '') {
  const doc = new jsPDF({ orientation: 'landscape' });
  doc.setFontSize(14);
  doc.text(`ROI report — entries & accounts${periodLabel ? ` — ${periodLabel}` : ''}`, 14, 16);
  const body = (entries || []).map((e) => {
    const { totalRevenue, purchaseCost, indirect, netProfit, expCredit } = calcEntryTotals(e);
    return [
      fmtDate(e.date),
      rupee(totalRevenue),
      rupee(purchaseCost),
      rupee(indirect),
      rupee(netProfit),
      expCredit > 0 ? rupee(expCredit) : '—',
    ];
  });
  autoTable(doc, {
    startY: 22,
    head: [['Date', 'Revenue', 'Purchase', 'Indirect', 'Net profit', 'Exp. credit']],
    body,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [99, 102, 241] },
  });
  doc.addPage('a4', 'p');
  doc.setFontSize(14);
  doc.text(`Account balances${periodLabel ? ` — ${periodLabel}` : ''}`, 14, 20);
  doc.setFontSize(9);
  doc.setTextColor(90, 90, 90);
  doc.text('Salary paid from Staff → Settle is counted once (no double deduction with ROI salary lines).', 14, 28, { maxWidth: 180 });
  doc.setTextColor(0, 0, 0);
  const ab = accountRows(accounts);
  const sum = ['cash', 'federal', 'vibgyor', 'asif'].reduce((s, k) => s + (Number(accounts?.[k]) || 0), 0);
  autoTable(doc, {
    startY: 36,
    head: [['Account', 'Balance']],
    body: ab,
    foot: [['Combined total', rupee(sum)]],
    showFoot: 'lastPage',
    styles: { fontSize: 10 },
    headStyles: { fillColor: [16, 185, 129] },
    footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
  });
  doc.save(`roi-entries-and-accounts-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function downloadEntriesPdf(entries, periodLabel = '') {
  const doc = new jsPDF({ orientation: 'landscape' });
  doc.setFontSize(14);
  doc.text(`ROI entries report${periodLabel ? ` — ${periodLabel}` : ''}`, 14, 16);
  const body = (entries || []).map((e) => {
    const { totalRevenue, purchaseCost, indirect, netProfit, expCredit } = calcEntryTotals(e);
    return [
      fmtDate(e.date),
      rupee(totalRevenue),
      rupee(purchaseCost),
      rupee(indirect),
      rupee(netProfit),
      expCredit > 0 ? rupee(expCredit) : '—',
    ];
  });
  autoTable(doc, {
    startY: 22,
    head: [['Date', 'Revenue', 'Purchase', 'Indirect', 'Net profit', 'Exp. credit']],
    body,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [99, 102, 241] },
  });
  doc.save(`entries-report-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function downloadFoodWastagePdf(entries, periodLabel = '') {
  const doc = new jsPDF({ orientation: 'portrait' });
  doc.setFontSize(14);
  doc.text(`Food wastage report${periodLabel ? ` — ${periodLabel}` : ''}`, 14, 16);
  const body = [];
  (entries || []).forEach((e) => {
    const fw = e.expenses?.foodWastage || {};
    const date = fmtDate(e.date);
    const v = (e.ventureName || '—').slice(0, 20);
    (fw.cooked || []).forEach((r) => {
      if ((r.amount || 0) > 0 || (r.qty || 0) > 0 || (r.item || '').trim()) {
        body.push([date, v, 'Cooked', (r.item || '—').slice(0, 32), String(r.qty ?? 0), rupee(r.amount)]);
      }
    });
    (fw.raw || []).forEach((r) => {
      if ((r.amount || 0) > 0 || (r.qty || 0) > 0 || (r.item || '').trim()) {
        body.push([date, v, 'Raw', (r.item || '—').slice(0, 32), String(r.qty ?? 0), rupee(r.amount)]);
      }
    });
  });
  let totalAmt = 0;
  (entries || []).forEach((e) => {
    const fw = e.expenses?.foodWastage || {};
    [...(fw.cooked || []), ...(fw.raw || [])].forEach((r) => { totalAmt += Number(r.amount) || 0; });
  });
  if (body.length === 0) {
    doc.setFontSize(10);
    doc.text('No food wastage lines in this list.', 14, 28);
  } else {
    autoTable(doc, {
      startY: 22,
      head: [['Date', 'Venture', 'Type', 'Item', 'Qty', 'Amount']],
      body,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [217, 119, 6] },
    });
    const y = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 10 : 40;
    doc.setFontSize(10);
    doc.text(`Total wastage amount: ${fmt(totalAmt)}`, 14, y);
  }
  doc.save(`food-wastage-report-${new Date().toISOString().slice(0, 10)}.pdf`);
}
