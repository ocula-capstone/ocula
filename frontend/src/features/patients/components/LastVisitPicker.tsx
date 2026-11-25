import { Popover } from '@base-ui/react/popover';
import { Check, CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { DayPicker, type DateRange } from 'react-day-picker';
import { filterTrigger } from '@/components/common/buttons';
import { FilterTriggerFace } from '@/components/common/OptionMenu';
import { dateToDay, dayToDate } from '@/lib/dates';
import { cn } from '@/lib/utils';

const isSameMonth = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
const MIN_YEAR = 2015;
const monthNames = (style: 'long' | 'short') =>
  Array.from({ length: 12 }, (_, i) =>
    new Date(2000, i, 1).toLocaleString('en-US', { month: style }),
  );
const MONTHS_LONG = monthNames('long');
const MONTHS_SHORT = monthNames('short');

const arrow =
  'grid size-10 place-items-center rounded-lg text-subtle outline-none hover:bg-page hover:text-ink focus-visible:ring-2 focus-visible:ring-brand-link disabled:pointer-events-none disabled:opacity-40 lg:size-8';

// Every part of the calendar, styled here (the library's own stylesheet is not used). Cells are
// 40px on phones for touch and 28px on desktop. Range ends are solid, the days between are a tint.
const cell = 'size-10 lg:size-8';
const calendarClasses = {
  root: 'w-fit',
  months: '',
  month: 'flex flex-col gap-2',
  // The month title and arrows are our own (see below), so the library's caption is hidden.
  month_caption: 'hidden',
  month_grid: 'w-full border-collapse',
  weekday: 'h-8 text-center text-xs font-medium text-subtle',
  day: 'p-0 text-center text-sm',
  day_button: `${cell} mx-auto grid place-items-center rounded-full font-medium text-ink outline-none hover:bg-page focus-visible:ring-2 focus-visible:ring-brand-link`,
  today: '[&>button]:font-bold [&>button]:text-brand-text',
  outside: 'opacity-40',
  disabled: 'opacity-35 [&>button]:pointer-events-none',
  hidden: 'invisible',
  range_start:
    'rounded-l-full bg-brand/10 [&>button]:bg-brand [&>button]:text-white! [&>button]:hover:bg-brand',
  range_end:
    'rounded-r-full bg-brand/10 [&>button]:bg-brand [&>button]:text-white! [&>button]:hover:bg-brand',
  range_middle: 'bg-brand/10 [&>button]:rounded-none [&>button]:hover:bg-brand/20',
};

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
}) {
  const [open, setOpen] = useState(false);
  // The month on show, and whether the days or the month-and-year panel is open.
  const [month, setMonth] = useState(() => dayToDate(from || today));
  const [panel, setPanel] = useState(false);
  const [year, setYear] = useState(month.getFullYear());
  const selected: DateRange | undefined = from
    ? { from: dayToDate(from), to: to ? dayToDate(to) : undefined }
    : undefined;
  const todayDate = dayToDate(today);

  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        if (next) {
          // Each time it opens, start on the picked range's month (or this one) with the days showing.
          const start = dayToDate(from || today);
          setMonth(start);
          setYear(start.getFullYear());
          setPanel(false);
        }
        setOpen(next);
      }}
    >
      <Popover.Trigger className={filterTrigger(active)}>
        <FilterTriggerFace
          label="Last visit"
          summary={summary}
          active={active}
          icon={<CalendarDays aria-hidden className="size-4 text-subtle" />}
        />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner side="bottom" align="start" sideOffset={6} className="isolate z-50">
          <Popover.Popup
            aria-label="Pick last visit dates"
            className="max-w-[calc(100vw-1rem)] rounded-xl border border-line bg-surface p-3 shadow-lg outline-none"
          >
            <div className="flex flex-col gap-3 lg:flex-row lg:gap-4">
              <div
                role="group"
                aria-label="Quick choices"
                className="flex flex-wrap gap-1.5 lg:w-40 lg:shrink-0 lg:flex-col lg:gap-0.5 lg:border-r lg:border-line lg:pr-3"
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
              <div className="flex w-fit flex-col gap-2">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    aria-label={panel ? 'Previous year' : 'Previous month'}
                    disabled={panel ? year <= MIN_YEAR : isSameMonth(month, new Date(MIN_YEAR, 0))}
                    onClick={() =>
                      panel
                        ? setYear(year - 1)
                        : setMonth(new Date(month.getFullYear(), month.getMonth() - 1))
                    }
                    className={arrow}
                  >
                    <ChevronLeft aria-hidden className="size-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Choose month and year"
                    aria-expanded={panel}
                    onClick={() => {
                      setYear(month.getFullYear());
                      setPanel(!panel);
                    }}
                    className="flex min-h-10 items-center gap-1 rounded-lg px-2 text-sm font-semibold text-ink outline-none hover:bg-page focus-visible:ring-2 focus-visible:ring-brand-link lg:min-h-8"
                  >
                    {panel ? year : `${MONTHS_LONG[month.getMonth()]} ${month.getFullYear()}`}
                    <ChevronDown
                      aria-hidden
                      className={cn(
                        'size-3.5 text-subtle transition-transform motion-reduce:transition-none',
                        panel && 'rotate-180',
                      )}
                    />
                  </button>
                  <button
                    type="button"
                    aria-label={panel ? 'Next year' : 'Next month'}
                    disabled={
                      panel ? year >= todayDate.getFullYear() : isSameMonth(month, todayDate)
                    }
                    onClick={() =>
                      panel
                        ? setYear(year + 1)
                        : setMonth(new Date(month.getFullYear(), month.getMonth() + 1))
                    }
                    className={arrow}
                  >
                    <ChevronRight aria-hidden className="size-4" />
                  </button>
                </div>
                {panel ? (
                  <div className="grid flex-1 grid-cols-3 content-start gap-1.5 pt-1">
                    {Array.from({ length: 12 }, (_, i) => {
                      const later = new Date(year, i) > todayDate;
                      const current = year === month.getFullYear() && i === month.getMonth();
                      return (
                        <button
                          key={i}
                          type="button"
                          aria-label={MONTHS_LONG[i]}
                          aria-pressed={current}
                          disabled={later}
                          onClick={() => {
                            setMonth(new Date(year, i));
                            setPanel(false);
                          }}
                          className={cn(
                            'min-h-11 rounded-lg px-2 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-brand-link disabled:pointer-events-none disabled:opacity-35 lg:min-h-11',
                            current ? 'bg-brand text-white' : 'text-ink hover:bg-page',
                          )}
                        >
                          {MONTHS_SHORT[i]}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <DayPicker
                    mode="range"
                    selected={selected}
                    onSelect={(range) => onRange(dateToDay(range?.from), dateToDay(range?.to))}
                    month={month}
                    onMonthChange={setMonth}
                    hideNavigation
                    today={todayDate}
                    disabled={{ after: todayDate }}
                    startMonth={new Date(MIN_YEAR, 0)}
                    endMonth={todayDate}
                    classNames={calendarClasses}
                  />
                )}
              </div>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
