import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { createContext, useContext, useRef, useEffect, useState } from 'react';
import { DayPicker, type DateRange, type DayButtonProps } from 'react-day-picker';
import { dateToDay, dayToDate } from '@/lib/dates';
import { cn } from '@/lib/utils';

const isSameMonth = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
const MIN_YEAR = 2015;
// Schedules look ahead; "future" calendars stop this many years after today.
const YEARS_AHEAD = 2;
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
// Days are 36px on the smallest phones (a 320px screen has no room for more), 40px from 360px and
// 44px from 380px, a comfortable tap. 32px on desktop.
const cell = 'size-9 min-[360px]:size-10 min-[380px]:size-11 lg:size-8';
const rangeStart =
  'rounded-l-full bg-brand/10 [&>button]:bg-brand [&>button]:text-white! [&>button]:hover:bg-brand';
const rangeEnd =
  'rounded-r-full bg-brand/10 [&>button]:bg-brand [&>button]:text-white! [&>button]:hover:bg-brand';
const rangeMiddle = 'bg-brand/10 [&>button]:rounded-none [&>button]:hover:bg-brand/20';
// One picked day (not a range) is a solid circle.
const singleSelected = '[&>button]:bg-brand [&>button]:text-white! [&>button]:hover:bg-brand';
const calendarClasses = {
  // On phones the popup has a set width and the days spread across it; from laptop width the
  // calendar keeps its own width.
  root: 'w-full lg:w-fit',
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
  range_start: rangeStart,
  range_end: rangeEnd,
  range_middle: rangeMiddle,
};

// A short line under a day's number, e.g. "2 left" or "Full".
export interface DayNote {
  text: string;
  tone: 'warn' | 'muted';
}
const DayNoteContext = createContext<((day: string) => DayNote | null) | undefined>(undefined);

// The day button when notes are shown: the number with its note under it.
function NoteDayButton({ day, modifiers, ...props }: DayButtonProps) {
  const note = useContext(DayNoteContext)?.(dateToDay(day.date));
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (modifiers.focused) ref.current?.focus();
  }, [modifiers.focused]);
  return (
    <button ref={ref} {...props}>
      <span className="leading-none">{day.date.getDate()}</span>
      {note && (
        <span
          className={cn(
            'text-xs leading-none font-medium',
            note.tone === 'warn' ? 'text-amber-700 dark:text-amber-300' : 'text-subtle',
            modifiers.selected && 'text-white/85',
          )}
        >
          {note.text}
        </span>
      )}
    </button>
  );
}

type Pick =
  | { mode: 'range'; from: string; to: string; onRange: (from: string, to: string) => void }
  // One day; `week` also tints the whole week around it (week: [first day, last day]).
  | { mode: 'day'; day: string; onDay: (day: string) => void; week?: [string, string] };

// The one calendar of the app: a month title with arrows, a month-and-year panel behind the title,
// and the days. `today` ("YYYY-MM-DD") is marked; `future` allows days after it (schedules) instead
// of blocking them (history filters). Opens on `focus`'s month; mount it fresh each time it opens.
export function CalendarPanel({
  today,
  future,
  focus,
  dayNote,
  isDisabled,
  ...pick
}: {
  today: string;
  future?: boolean;
  focus: string;
  // Optional extras for a booking calendar: a note under each day, and days that cannot be picked.
  dayNote?: (day: string) => DayNote | null;
  isDisabled?: (day: string) => boolean;
} & Pick) {
  const todayDate = dayToDate(today);
  const [month, setMonth] = useState(() => dayToDate(focus));
  const [panel, setPanel] = useState(false);
  const [year, setYear] = useState(month.getFullYear());
  const lastYear = todayDate.getFullYear() + (future ? YEARS_AHEAD : 0);
  const end = future ? new Date(lastYear, 11) : todayDate;

  return (
    // Seven day cells wide, so the month-and-year panel fills the same box as the days (no empty strip
    // beside it, no jump when switching). Cells: 44px with notes, else 40px on phones and 32px on desktop.
    // The booking calendar (with notes) takes the full width on phones, where its box is one column.
    <div
      className={cn(
        'mx-auto flex flex-col gap-2',
        dayNote ? 'mx-auto w-full max-w-[22rem] md:w-[19.25rem]' : 'w-full lg:w-[14rem]',
      )}
    >
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
          disabled={panel ? year >= lastYear : isSameMonth(month, end)}
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
        <div
          className={cn(
            'grid flex-1 auto-rows-fr grid-cols-3 gap-1.5 pt-1',
            dayNote && 'min-h-[16rem]',
          )}
        >
          {Array.from({ length: 12 }, (_, i) => {
            const later = !future && new Date(year, i) > todayDate;
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
                  'min-h-11 rounded-lg px-2 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-brand-link disabled:pointer-events-none disabled:opacity-35',
                  current ? 'bg-brand text-white' : 'text-ink hover:bg-page',
                )}
              >
                {MONTHS_SHORT[i]}
              </button>
            );
          })}
        </div>
      ) : (
        <DayNoteContext.Provider value={dayNote}>
          <DayPicker
            {...(pick.mode === 'range'
              ? {
                  mode: 'range' as const,
                  selected: pick.from
                    ? ({
                        from: dayToDate(pick.from),
                        to: pick.to ? dayToDate(pick.to) : undefined,
                      } satisfies DateRange)
                    : undefined,
                  onSelect: (r: DateRange | undefined) =>
                    pick.onRange(dateToDay(r?.from), dateToDay(r?.to)),
                }
              : {
                  mode: 'single' as const,
                  selected: pick.week ? undefined : dayToDate(pick.day),
                  onSelect: (d: Date | undefined) => d && pick.onDay(dateToDay(d)),
                  // A week is shown as a band: solid ends, tint between (the range look).
                  modifiers: pick.week && {
                    range_start: dayToDate(pick.week[0]),
                    range_end: dayToDate(pick.week[1]),
                    range_middle: {
                      after: dayToDate(pick.week[0]),
                      before: dayToDate(pick.week[1]),
                    },
                  },
                  modifiersClassNames: {
                    range_start: rangeStart,
                    range_end: rangeEnd,
                    range_middle: rangeMiddle,
                  },
                })}
            month={month}
            onMonthChange={setMonth}
            hideNavigation
            today={todayDate}
            disabled={[
              ...(future ? [] : [{ after: todayDate }]),
              ...(isDisabled ? [(d: Date) => isDisabled(dateToDay(d))] : []),
            ]}
            components={dayNote ? { DayButton: NoteDayButton } : undefined}
            startMonth={new Date(MIN_YEAR, 0)}
            endMonth={end}
            classNames={{
              ...calendarClasses,
              ...(pick.mode === 'day' ? { selected: singleSelected } : {}),
              // With notes the button is a rounded block: number over note.
              ...(dayNote
                ? {
                    // The library's own root is w-fit; here the grid fills the box so the days spread evenly.
                    root: 'w-full',
                    day_button: `${calendarClasses.day_button} h-12! w-full! max-w-11! flex-col gap-1 rounded-xl!`,
                  }
                : {}),
            }}
          />
        </DayNoteContext.Provider>
      )}
    </div>
  );
}
