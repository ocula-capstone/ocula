import type { StockItem } from '@/types/clinic';

export type StockLevel = 'In stock' | 'Low' | 'Out of stock';

export function stockLevel(item: StockItem): StockLevel {
  if (item.qty === 0) return 'Out of stock';
  return item.qty <= item.min ? 'Low' : 'In stock';
}

// Items at or below their minimum, which the clinic should reorder.
export const needsRestock = (items: StockItem[]): StockItem[] =>
  items.filter((item) => stockLevel(item) !== 'In stock');
