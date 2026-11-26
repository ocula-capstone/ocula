import { Popover } from '@base-ui/react/popover';
import { Check, CalendarDays } from 'lucide-react';
import { useRef, useState } from 'react';
import { fieldTrigger, filterTrigger } from '@/components/common/buttons';
import { CalendarPanel } from '@/components/common/CalendarPanel';
import { FieldTriggerFace, FilterTriggerFace } from '@/components/common/OptionMenu';
import { useIsDesktop } from '@/hooks/useIsDesktop';
import { cn } from '@/lib/utils';

// The Last visit filter: a button that opens a calendar right under it. Like Branch and Status it
// takes several picks: tick any of the quick choices (beside the calendar) and/or pick a range of
// days (first click starts it, second ends it). A patient matches if their last visit fits any
// pick. Picks apply at once; Escape or a click outside closes it.
export function LastVisitPicker({
  summary,
  active,
  presets,
  picks,
  from,
  to,
  today,
  onPicks,
  onRange,
  field,
}: {
  // The picked choices as text; null while nothing is picked (the button then says "Select").
  summary: string | null;
  active: boolean;
  presets: { value: string; label: string }[];
  // The quick choices ticked now, and the calendar range ("YYYY-MM-DD"; "" when an end is open).
  picks: string[];
  from: string;
  to: string;
  // Today as "YYYY-MM-DD": the calendar opens on this month and blocks days after it.
  today: string;
  onPicks: (next: string[]) => void;
  onRange: (from: string, to: string) => void;
  // A soft grey field with just the value in it; the caller writes the name above (FilterField).
  field?: boolean;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const isDesktop = useIsDesktop();
  // On a phone the popup is centred under the whole filter bar (not under its own button), so it
  // has the same margin on both sides; from laptop width it opens under its button.
  const underBar = () => triggerRef.current?.closest('[data-filter-bar]') ?? triggerRef.current;
  const [open, setOpen] = useState(false);
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        ref={triggerRef}
        aria-label={field ? `Last visit ${summary ?? 'Select'}` : undefined}
        className={field ? fieldTrigger(active) : filterTrigger(active)}
      >
        {field ? (
          <FieldTriggerFace summary={summary} active={active} />
        ) : (
          <FilterTriggerFace
            label="Last visit"
            summary={summary}
            active={active}
            icon={<CalendarDays aria-hidden className="size-4 text-subtle" />}
          />
        )}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner
          side="bottom"
          align={isDesktop ? 'start' : 'center'}
          anchor={isDesktop ? undefined : underBar}
          collisionPadding={16}
          sideOffset={6}
          className="isolate z-50"
        >
          <Popover.Popup
            aria-label="Pick last visit dates"
            className="max-w-[calc(100vw-2rem)] rounded-xl border border-line bg-surface p-3 shadow-lg outline-none max-h-(--available-height) overflow-y-auto max-lg:w-[min(calc(100vw-2rem),26rem)]"
          >
            <div className="flex flex-col gap-3 lg:flex-row lg:gap-4">
              <div
                role="group"
                aria-label="Quick choices"
                className="grid grid-cols-2 gap-1.5 max-lg:border-b max-lg:border-line max-lg:pb-3 max-lg:[&>button:last-child:nth-child(odd)]:col-span-2 lg:flex lg:w-40 lg:shrink-0 lg:flex-col lg:gap-0.5 lg:border-r lg:border-line lg:pr-3"
              >
                {presets.map((p) => {
                  const on = picks.includes(p.value);
                  return (
                    <button
                      key={p.value}
                      type="button"
                      aria-pressed={on}
                      onClick={() =>
                        onPicks(on ? picks.filter((v) => v !== p.value) : [...picks, p.value])
                      }
                      className={cn(
                        'flex min-h-11 items-center gap-2 rounded-lg px-3 text-left text-sm font-medium whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-brand-link max-lg:border lg:mb-0.5 lg:min-h-9',
                        on
                          ? 'bg-brand/10 font-semibold text-brand-text max-lg:border-brand'
                          : 'text-ink hover:bg-page max-lg:border-line',
                      )}
                    >
                      <span className="mr-auto">{p.label}</span>
                      <Check
                        aria-hidden
                        strokeWidth={2.5}
                        className={cn('size-4 shrink-0', !on && 'opacity-0')}
                      />
                    </button>
                  );
                })}
              </div>
              <CalendarPanel
                mode="range"
                today={today}
                focus={from || today}
                from={from}
                to={to}
                onRange={onRange}
              />
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
