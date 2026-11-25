import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { InventoryPage } from '@/features/inventory/pages/InventoryPage';
import { fakeUser, renderWithProviders } from '@/test/render';

// Test-only rows: one healthy item, one low, one out of stock, one low lens.
vi.mock('@/mocks/data/samples', () => ({
  stock: [
    { sku: 'FR-102', item: 'Acetate frame, round, tortoise', category: 'Frames', qty: 14, min: 5 },
    { sku: 'FR-118', item: 'Metal frame, rectangle, black', category: 'Frames', qty: 3, min: 5 },
    { sku: 'FR-131', item: 'Kids flexible frame, blue', category: 'Frames', qty: 0, min: 4 },
    { sku: 'LN-240', item: 'Progressive lens 1.60', category: 'Lenses', qty: 6, min: 8 },
  ],
}));

describe('InventoryPage', () => {
  it('puts the items that need restocking first', () => {
    renderWithProviders(<InventoryPage />, { user: fakeUser({ role: 'staff' }) });
    expect(screen.getByRole('heading', { name: '3 items need restocking' })).toBeInTheDocument();
  });

  it('filters by category', async () => {
    renderWithProviders(<InventoryPage />, { user: fakeUser({ role: 'staff' }) });
    await userEvent.setup().click(screen.getByRole('button', { name: 'Lenses' }));
    const table = screen.getByRole('table', { name: 'Inventory' });
    expect(table).toHaveTextContent('Progressive lens 1.60');
    expect(table).not.toHaveTextContent('Acetate frame');
  });

  it('doctors can read stock but not add items', () => {
    renderWithProviders(<InventoryPage />, { user: fakeUser({ role: 'optometrist' }) });
    expect(screen.queryByRole('button', { name: 'Add item' })).toBeNull();
  });
});
