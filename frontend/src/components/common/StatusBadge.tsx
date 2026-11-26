import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';

export type StatusTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

// Teal and gold only colour the border (they fail contrast as small text); the text is always dark (light on the dark theme).
const TONES: Record<StatusTone, string> = {
  neutral: 'border-line bg-slate-100 text-ink dark:bg-white/10',
  info: 'border-teal/50 bg-cyan-50 text-cyan-900 dark:bg-cyan-400/10 dark:text-cyan-200',
  success:
    'border-green-600/40 bg-green-50 text-green-900 dark:border-green-400/40 dark:bg-green-400/10 dark:text-green-200',
  warning:
    'border-gold/60 bg-amber-50 text-amber-900 dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-200',
  danger:
    'border-error/40 bg-red-50 text-red-900 dark:border-red-400/40 dark:bg-red-400/10 dark:text-red-200',
};

// A small coloured label for a status such as "pending" or "paid".
export function StatusBadge({ tone, children }: { tone: StatusTone; children: ReactNode }) {
  return (
    <Badge variant="outline" className={TONES[tone]}>
      {children}
    </Badge>
  );
}
