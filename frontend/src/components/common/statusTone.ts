import type { StatusTone } from '@/components/common/StatusBadge';

// Which colour each status word gets, in one place for every screen. Unknown words are neutral.
const TONES: Record<string, StatusTone> = {
  Arrived: 'success',
  Done: 'success',
  Paid: 'success',
  Verified: 'success',
  'In stock': 'success',
  'In progress': 'warning',
  'Due today': 'warning',
  Unpaid: 'warning',
  'Needs review': 'warning',
  Low: 'warning',
  'In exam': 'info',
  Booked: 'neutral',
  Partial: 'info',
  Overdue: 'danger',
  'Out of stock': 'danger',
};

export const statusTone = (status: string): StatusTone => TONES[status] ?? 'neutral';
