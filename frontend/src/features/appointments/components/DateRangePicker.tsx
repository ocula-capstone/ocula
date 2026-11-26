import { Popover } from '@base-ui/react/popover';
import { CalendarDays, Check } from 'lucide-react';
import { useState } from 'react';
import { fieldTrigger, filterTrigger, textLink } from '@/components/common/buttons';
import { CalendarPanel } from '@/components/common/CalendarPanel';
import { FieldTriggerFace, FilterTriggerFace } from '@/components/common/OptionMenu';
import { datePresets, type Range, type Tab } from '@/features/appointments/days';
import { useIsDesktop } from '@/hooks/useIsDesktop';
import { cn } from '@/lib/utils';

export interface DateChoice {
  // The quick choices ticked now, by id (see datePresets).
  picks: string[];
  // The calendar range, if one was picked.
  custom: Range | null;
  // Day, Week or Month when the choice came from those tabs; null for everything picked here.
  tab: Tab | null;
}

// The Date filter, built like Last visit on Patients: tick any number of quick choices and/or pick
// a range on the calendar, and the list shows the days of all of them. Picks apply at once;
// Escape or a click outside closes it. `summary` is the button's text, null while nothing is picked.
export function DateRangePicker({
  choice,
  summary,
  today,
  onChange,
  field,
}: {
  choice: DateChoice;
  summary: string | null;
  today: string;
  onChange: (next: DateChoice) => void;
  // A soft grey field with just the value in it; the caller writes the name above (FilterField).
  field?: boolean;
}) {
  const isDesktop = useIsDesktop();
  const [open, setOpen] = useState(false);
  const presets = datePresets(today);
  const active = choice.picks.length > 0 || choice.custom !== null;

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        aria-label={field ? `Date ${summary ?? 'Select'}` : undefined}
        className={field ? fieldTrigger(active) : filterTrigger(active)}
      >
        {field ? (
          <FieldTriggerFace summary={summary} active={active} />
        ) : (
          <FilterTriggerFace
            label="Date"
            summary={summary}
            active={active}
            icon={<CalendarDays aria-hidden className="size-4 text-subtle" />}
          />
        )}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner
          side="bottom"
          // On a phone its button spans the bar, so centring under it is centring on the screen.
          align={isDesktop ? 'start' : 'center'}
          collisionPadding={16}
          sideOffset={6}
          className="isolate z-50"
        >
          <Popover.Popup
            aria-label="Pick dates"
            className="max-w-[calc(100vw-2rem)] rounded-xl border border-line bg-surface p-3 shadow-lg outline-none max-h-(--available-height) overflow-y-auto max-lg:w-[min(calc(100vw-2rem),26rem)]"
          >
            <div className="flex flex-col gap-3 lg:flex-row lg:gap-4">
              <div
                role="group"
                aria-label="Quick choices"
                className="grid grid-cols-2 gap-1.5 max-lg:border-b max-lg:border-line max-lg:pb-3 max-lg:[&>button:last-child:nth-child(odd)]:col-span-2 lg:flex lg:w-40 lg:shrink-0 lg:flex-col lg:gap-0.5 lg:border-r lg:border-line lg:pr-3"
              >
                {presets.map((p) => {
                  const on = choice.picks.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() =>
                        onChange({
                          ...choice,
                          tab: null,
                          picks: on
                            ? choice.picks.filter((id) => id !== p.id)
                            : [...choice.picks, p.id],
                        })
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
              <div className="max-lg:w-full">
                <CalendarPanel
                  mode="range"
                  future
                  today={today}
                  focus={choice.custom?.from ?? today}
                  from={choice.custom?.from ?? ''}
                  to={choice.custom?.to ?? ''}
                  // Applies at once: one click is one day, a second click ends the range, and
                  // clicking the picked day again takes the range off.
                  onRange={(from, to) =>
                    onChange({
                      ...choice,
                      tab: null,
                      custom: from ? { from, to: to || from } : null,
                    })
                  }
                />
                <p className="mt-2 border-t border-line pt-1 max-lg:hidden">
                  <button
                    type="button"
                    className={textLink}
                    onClick={() => {
                      onChange({ picks: ['today'], custom: null, tab: null });
                      setOpen(false);
                    }}
                  >
                    Go to today
                  </button>
                </p>
              </div>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
