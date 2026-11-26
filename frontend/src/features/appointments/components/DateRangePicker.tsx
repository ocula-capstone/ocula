import { Popover } from '@base-ui/react/popover';
import { CalendarDays } from 'lucide-react';
import { useState } from 'react';
import { filterTrigger, textLink } from '@/components/common/buttons';
import { CalendarPanel } from '@/components/common/CalendarPanel';
import { FilterTriggerFace } from '@/components/common/OptionMenu';
import { addDays, formatRange, rangeFor, type Range, type Tab } from '@/features/appointments/days';
import { cn } from '@/lib/utils';

// Quick ranges beside the calendar. A day, week or month also turns that tab on (so its arrows
// work); "Next 7 days" and a hand-picked range turn the tabs off.
const presets = (today: string): { label: string; range: Range; tab: Tab | null }[] => [
  { label: 'Today', range: rangeFor('Day', today), tab: 'Day' },
  { label: 'Tomorrow', range: rangeFor('Day', addDays(today, 1)), tab: 'Day' },
  { label: 'This week', range: rangeFor('Week', today), tab: 'Week' },
  { label: 'Next 7 days', range: { from: today, to: addDays(today, 6) }, tab: null },
  { label: 'This month', range: rangeFor('Month', today), tab: 'Month' },
];

// The Date filter: a button showing the range, and a calendar under it. Pick a quick range, or click
// a first and a last day. Future days are open; this is a schedule.
export function DateRangePicker({
  range,
  today,
  onPick,
}: {
  range: Range;
  today: string;
  onPick: (range: Range, tab: Tab | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const text =
    formatRange(range) + (range.from === range.to && range.from === today ? ' · Today' : '');

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger className={filterTrigger(false)}>
        <FilterTriggerFace
          label="Date"
          summary={text}
          icon={<CalendarDays aria-hidden className="size-4 text-subtle" />}
        />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner side="bottom" align="start" sideOffset={6} className="isolate z-50">
          <Popover.Popup
            aria-label="Pick dates"
            className="max-w-[calc(100vw-1rem)] rounded-xl border border-line bg-surface p-3 shadow-lg outline-none"
          >
            <div className="flex flex-col gap-3 lg:flex-row lg:gap-4">
              <div
                role="group"
                aria-label="Quick ranges"
                className="flex flex-wrap gap-1.5 lg:w-40 lg:shrink-0 lg:flex-col lg:gap-0.5 lg:border-r lg:border-line lg:pr-3"
              >
                {presets(today).map((p) => {
                  const on = p.range.from === range.from && p.range.to === range.to;
                  return (
                    <button
                      key={p.label}
                      type="button"
                      aria-pressed={on}
                      onClick={() => {
                        onPick(p.range, p.tab);
                        setOpen(false);
                      }}
                      className={cn(
                        'min-h-11 rounded-lg px-3 text-left text-sm font-medium whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-brand-link max-lg:border lg:mb-0.5 lg:min-h-9',
                        on
                          ? 'bg-brand/10 font-semibold text-brand-text max-lg:border-brand'
                          : 'text-ink hover:bg-page max-lg:border-line',
                      )}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
              <div>
                <CalendarPanel
                  mode="range"
                  future
                  today={today}
                  focus={range.from}
                  from={range.from}
                  to={range.to}
                  // Applies at once, like the Patients calendar: one click is one day, a second
                  // click ends the range. Escape or a click outside closes it.
                  onRange={(from, to) => from && onPick({ from, to: to || from }, null)}
                />
                <p className="mt-2 border-t border-line pt-1">
                  <button
                    type="button"
                    className={textLink}
                    onClick={() => {
                      onPick(rangeFor('Day', today), 'Day');
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
