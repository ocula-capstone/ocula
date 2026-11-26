import { ChevronDown, Plus } from 'lucide-react';
import { Link } from 'react-router';
import { primaryButton } from '@/components/common/buttons';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

// shortcut: each choice opens the screen where that thing is created; the create forms
// themselves arrive with each feature's button round.
const CHOICES = [
  { label: 'New patient', to: '/staff/patients' },
  { label: 'Book a visit', to: '/staff/appointments' },
  { label: 'New bill', to: '/staff/billing' },
  { label: 'New job order', to: '/staff/job-orders' },
  { label: 'New scan', to: '/staff/auto-refractor' },
];

// The "+ New" button in the dashboard header.
export function NewMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<button type="button" className={cn(primaryButton, 'gap-2 lg:min-h-10')} />}
      >
        <Plus aria-hidden className="size-4" strokeWidth={2} />
        New
        <ChevronDown aria-hidden className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        {CHOICES.map(({ label, to }) => (
          <DropdownMenuItem
            key={to}
            className="min-h-11 px-3 text-sm text-ink"
            render={<Link to={to} />}
          >
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
