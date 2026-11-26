import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import type { ReactNode } from 'react';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { filterTrigger } from '@/components/common/buttons';
import { cn } from '@/lib/utils';

export interface MenuOption {
  value: string;
  label: string;
  // A number shown at the right of the option, e.g. how many patients match.
  count?: number;
}

// One look for every option in these menus. No checkbox or radio: the picked row gets a soft blue
// tint, blue semibold text and a check icon at the right (so it is not shown by colour alone).
// The generated item draws its own mark at the right; it is hidden here in favour of ours.
const itemClass =
  'group/opt mb-1 min-h-11 gap-3 rounded-lg px-3 last:mb-0 text-sm font-medium text-ink focus:bg-page focus:text-ink focus:**:text-ink data-checked:bg-brand/10 data-checked:font-semibold data-checked:text-brand-text data-checked:focus:bg-brand/15 data-checked:focus:text-brand-text data-checked:focus:**:text-brand-text lg:min-h-10 [&>[data-slot$=indicator]]:hidden';

function OptionBody({ option }: { option: MenuOption }) {
  return (
    <>
      <span className="mr-auto">{option.label}</span>
      {option.count !== undefined && option.count > 0 && (
        <>
          {' '}
          <span className="text-[13px] font-normal text-subtle tabular-nums group-data-checked/opt:text-brand-text/80">
            {option.count.toLocaleString('en-US')}
          </span>
        </>
      )}
      <Check
        aria-hidden
        strokeWidth={2.5}
        className="size-4 shrink-0 opacity-0 group-data-checked/opt:opacity-100"
      />
    </>
  );
}

// What goes inside a filter button (its look is `filterTrigger` in buttons.ts). `summary` is null until the user has picked something.
export function FilterTriggerFace({
  label,
  summary,
  active,
  icon,
  Chevron = ChevronDown,
}: {
  label: string;
  summary: ReactNode;
  active?: boolean;
  icon?: ReactNode;
  Chevron?: typeof ChevronDown;
}) {
  return (
    <>
      {icon}
      <span className="leading-tight">
        <span className="block text-xs font-semibold tracking-wider text-subtle uppercase">
          {label}
        </span>
        <span
          className={cn('block text-sm font-semibold', active ? 'text-brand-text' : 'text-ink')}
        >
          {summary ?? <span className="font-medium text-subtle">Select</span>}
        </span>
      </span>
      <Chevron aria-hidden className="size-4 shrink-0 text-subtle" />
    </>
  );
}

// A button with a small label above its value ("BRANCH / All branches") that opens a menu.
// multi: tick any number of options (the menu stays open). Otherwise: pick one (the menu closes).
// `selected` holds the picked values; `summary` is the text shown under the label.
export function OptionMenu({
  label,
  summary,
  options,
  selected,
  onChange,
  multi,
  icon,
  active,
  side = 'bottom',
  align = 'start',
  className,
  bare,
}: {
  label: string;
  // The picked value as text; null while nothing is picked (the button then says "Select").
  summary: string | null;
  options: MenuOption[];
  selected: string[];
  onChange: (values: string[]) => void;
  multi?: boolean;
  icon?: ReactNode;
  // Something other than the default is picked: the button turns light blue.
  active?: boolean;
  side?: 'top' | 'bottom';
  align?: 'start' | 'end';
  className?: string;
  // A plain outlined button showing only the picked option (no small label above it).
  bare?: boolean;
}) {
  const Chevron = side === 'top' ? ChevronUp : ChevronDown;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            aria-label={bare ? `${label}: ${summary ?? 'none'}` : undefined}
            className={cn(
              filterTrigger(active),
              bare && 'rounded-xl border border-line bg-surface px-4 hover:bg-page',
              className,
            )}
          />
        }
      >
        {bare ? (
          <>
            <span className="text-sm font-semibold text-ink">{summary ?? label}</span>
            <Chevron aria-hidden className="size-4 shrink-0 text-subtle" />
          </>
        ) : (
          <FilterTriggerFace
            label={label}
            summary={summary}
            active={active}
            icon={icon}
            Chevron={Chevron}
          />
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent side={side} align={align} className="w-auto min-w-56 p-2">
        {multi ? (
          options.map((option) => (
            <DropdownMenuCheckboxItem
              key={option.value}
              className={itemClass}
              checked={selected.includes(option.value)}
              onCheckedChange={(on) =>
                onChange(
                  on ? [...selected, option.value] : selected.filter((v) => v !== option.value),
                )
              }
            >
              <OptionBody option={option} />
            </DropdownMenuCheckboxItem>
          ))
        ) : (
          <DropdownMenuRadioGroup
            value={selected[0] ?? ''}
            onValueChange={(v) => onChange([String(v)])}
          >
            {options.map((option) => (
              <DropdownMenuRadioItem
                key={option.value}
                value={option.value}
                className={itemClass}
                closeOnClick
              >
                <OptionBody option={option} />
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
