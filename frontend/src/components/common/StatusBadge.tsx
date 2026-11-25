import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';

export type StatusTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

// Teal and gold only colour the border (they fail contrast as small text); the text is always dark.
const TONES: Record<StatusTone, string> = {
  neutral: 'border-line bg-slate-100 text-ink',
  info: 'border-teal/50 bg-cyan-50 text-cyan-900',
  success: 'border-green-600/40 bg-green-50 text-green-900',
  warning: 'border-gold/60 bg-amber-50 text-amber-900',
  danger: 'border-error/40 bg-red-50 text-red-900',
};

// A small coloured label for a status such as "pending" or "paid".
export function StatusBadge({ tone, children }: { tone: StatusTone; children: ReactNode }) {
  return (
    <Badge variant="outline" className={TONES[tone]}>
      {children}
    </Badge>
  );
}
