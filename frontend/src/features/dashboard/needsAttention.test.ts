import { describe, expect, it } from 'vitest';
import { needsAttention } from '@/features/dashboard/needsAttention';
import type { JobOrder, Receipt, StockItem } from '@/types/clinic';

const job = (over: Partial<JobOrder>): JobOrder => ({
  id: 'JO-1042',
  patient: 'Carlo Lim',
  item: 'Lenses',
  stage: 'In lab',
  due: 'today',
  ...over,
});
const stockItem = (over: Partial<StockItem>): StockItem => ({
  sku: 'LN-1',
  item: '1.56 blue-cut lenses',
  category: 'Lenses',
  qty: 4,
  min: 8,
  ...over,
});
const receipt = (over: Partial<Receipt>): Receipt => ({
  id: 'OR-1',
  patient: 'Grace Tan',
  items: 'Frames',
  amount: 3200,
  status: 'Unpaid',
  ageDays: 5,
  ...over,
});

describe('needsAttention', () => {
  it('lists late work first, then low stock, then the oldest unpaid balances', () => {
    const items = needsAttention({
      jobOrders: [job({ delayed: true })],
      stock: [stockItem({})],
      receipts: [
        receipt({ id: 'OR-2', patient: 'Newer Payer', ageDays: 2 }),
        receipt({ id: 'OR-3', patient: 'Grace Tan', ageDays: 5 }),
      ],
    });
    expect(items.map((i) => [i.tone, i.title, i.detail])).toEqual([
      ['danger', 'Job order #1042 delayed at lab', 'Promised to Carlo Lim today'],
      ['warning', 'Low stock: 1.56 blue-cut lenses', '4 left'],
      ['warning', 'Unpaid balance · Grace Tan', '₱3,200 · 5 days'],
      ['warning', 'Unpaid balance · Newer Payer', '₱3,200 · 2 days'],
    ]);
  });

  it('says out of stock when none is left, and skips healthy stock', () => {
    const items = needsAttention({
      jobOrders: [],
      stock: [stockItem({ qty: 0 }), stockItem({ sku: 'X', item: 'Fine item', qty: 50 })],
      receipts: [],
    });
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe('Out of stock: 1.56 blue-cut lenses');
    expect(items[0].detail).toBe('None left');
  });

  it('counts partly paid receipts as unpaid and ignores paid ones and on-time jobs', () => {
    const items = needsAttention({
      jobOrders: [job({})],
      stock: [],
      receipts: [receipt({ status: 'Partial' }), receipt({ id: 'OR-9', status: 'Paid' })],
    });
    expect(items.map((i) => i.title)).toEqual(['Unpaid balance · Grace Tan']);
  });

  it('shows one day as "1 day" and caps the list', () => {
    const many = Array.from({ length: 8 }, (_, i) =>
      receipt({ id: `OR-${i}`, patient: `P${i}`, ageDays: i === 0 ? 1 : 10 + i }),
    );
    const items = needsAttention({ jobOrders: [], stock: [], receipts: many });
    expect(items).toHaveLength(5);
    expect(needsAttention({ jobOrders: [], stock: [], receipts: [many[0]] })[0].detail).toBe(
      '₱3,200 · 1 day',
    );
  });

  it('is empty when nothing needs attention', () => {
    expect(needsAttention({ jobOrders: [], stock: [], receipts: [] })).toEqual([]);
  });
});
