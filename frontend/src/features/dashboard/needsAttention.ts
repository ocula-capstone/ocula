import { plural } from '@/lib/format';
import { formatPesoShort } from '@/lib/money';
import type { JobOrder, Receipt, StockItem } from '@/types/clinic';
import { stockLevel } from '@/features/inventory/stock';

export interface AttentionItem {
  id: string;
  // danger: late work. warning: something to deal with soon.
  tone: 'danger' | 'warning';
  title: string;
  detail: string;
}

const jobNumber = (id: string) => id.replace(/^JO-0*/, '#');

// What the front desk should look at today, most urgent first: late lab work, then stock that is
// low or gone, then the oldest balances still owed. Capped so the card stays short.
export function needsAttention(
  data: { jobOrders: JobOrder[]; stock: StockItem[]; receipts: Receipt[] },
  limit = 5,
): AttentionItem[] {
  const late = data.jobOrders
    .filter((j) => j.delayed)
    .map<AttentionItem>((j) => ({
      id: `job-${j.id}`,
      tone: 'danger',
      title: `Job order ${jobNumber(j.id)} delayed at lab`,
      detail: `Promised to ${j.patient} ${j.due}`,
    }));

  const lowStock = data.stock
    .filter((s) => stockLevel(s) !== 'In stock')
    .map<AttentionItem>((s) => ({
      id: `stock-${s.sku}`,
      tone: 'warning',
      title: `${s.qty === 0 ? 'Out of stock' : 'Low stock'}: ${s.item}`,
      detail: s.qty === 0 ? 'None left' : `${s.qty} left`,
    }));

  const unpaid = data.receipts
    .filter((r) => r.status !== 'Paid')
    .sort((a, b) => b.ageDays - a.ageDays)
    .map<AttentionItem>((r) => ({
      id: `receipt-${r.id}`,
      tone: 'warning',
      title: `Unpaid balance · ${r.patient}`,
      detail: `${formatPesoShort(r.amount)} · ${plural(r.ageDays, 'day')}`,
    }));

  return [...late, ...lowStock, ...unpaid].slice(0, limit);
}
