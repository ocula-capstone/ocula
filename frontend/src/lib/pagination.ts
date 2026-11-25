// The page buttons to show under a list: always the first and last page and the page you are on
// with one either side, with "…" for the pages in between (1 2 3 … 25).
// A gap of exactly one page shows that page instead of an ellipsis.
export function pageItems(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  // Three in a row around the current page, kept inside 1..total.
  const start = Math.max(1, Math.min(current - 1, total - 2));
  const wanted = [...new Set([1, start, start + 1, start + 2, total])];

  const items: (number | '…')[] = [];
  wanted.forEach((page, i) => {
    const gap = i === 0 ? 0 : page - wanted[i - 1] - 1;
    if (gap === 1) items.push(page - 1);
    else if (gap > 1) items.push('…');
    items.push(page);
  });
  return items;
}
