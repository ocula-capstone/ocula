import { Search, X } from 'lucide-react';
import { useState } from 'react';
import { EmptyState } from '@/components/common/EmptyState';
import { FilterField } from '@/components/common/FilterField';
import { FilterTabs } from '@/components/common/FilterTabs';
import { OptionMenu } from '@/components/common/OptionMenu';
import { PageHeader } from '@/components/common/PageHeader';
import { PrimaryAction } from '@/components/common/PrimaryAction';
import { BookingModal, type BookingStart } from '@/features/appointments/components/BookingModal';
import {
  DateRangePicker,
  type DateChoice,
} from '@/features/appointments/components/DateRangePicker';
import { VisitTable } from '@/features/appointments/components/VisitTable';
import {
  DEFAULT_PICKS,
  datePresets,
  daysInAll,
  formatDay,
  formatRange,
  rangeFor,
  type Tab,
} from '@/features/appointments/days';
import { useAppointments } from '@/features/appointments/store';
import { useBranch } from '@/features/branches/branch-context';
import { manilaToday } from '@/lib/dates';
import { plural } from '@/lib/format';
import { matchesSearch } from '@/lib/search';
import { doctors as knownDoctors } from '@/mocks/data/samples';
import type { VisitStatus } from '@/types/clinic';

const TABS: Tab[] = ['Day', 'Week', 'Month'];
// Nothing picked in the Date filter: its button says "Select", and the list shows the next 7 days.
const NO_DATE: DateChoice = { picks: [], custom: null, tab: null };
const STATUSES: VisitStatus[] = ['Booked', 'Waiting', 'In exam', 'Done', 'No-show', 'Cancelled'];
// "Dr. Ana" or "2 doctors" for a button that shows several picks; null while nothing is picked.
const summaryOf = (picked: string[], noun: string) =>
  picked.length === 0 ? null : picked.length <= 2 ? picked.join(', ') : `${picked.length} ${noun}`;

// The desk's schedule. It opens as a list of the next 7 days. The Date filter takes any number of
// quick choices and a calendar range at once (a visit shows if its day is in any of them); Day,
// Week and Month are one-tap shortcuts. Doctor and Status narrow the list. Cancelled and missed
// visits are listed too, in their own group under the others.
export function AppointmentsPage() {
  const { current } = useBranch();
  const { visits, slots } = useAppointments();
  const today = manilaToday();
  const [date, setDate] = useState<DateChoice>(NO_DATE);
  const [doctor, setDoctor] = useState<string[]>([]);
  const [status, setStatus] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [booking, setBooking] = useState<BookingStart | null>(null);

  const presets = datePresets(today);
  const ticked = presets.filter((p) => date.picks.includes(p.id));
  // Nothing picked falls back to what the screen opens with.
  const ranges = [...ticked.map((p) => p.range), ...(date.custom ? [date.custom] : [])];
  const effective = ranges.length
    ? ranges
    : presets.filter((p) => DEFAULT_PICKS.includes(p.id)).map((p) => p.range);
  const days = daysInAll(effective);
  const single = days.length === 1;
  const inDates = (day: string) => effective.some((r) => day >= r.from && day <= r.to);
  const dateParts = [
    ...ticked.map((p) => p.label),
    ...(date.custom ? [formatRange(date.custom)] : []),
  ];
  const dateSummary =
    dateParts.length === 0
      ? null
      : dateParts.length <= 2
        ? dateParts.join(', ')
        : `${dateParts.length} selected`;
  const dateChanged = date.tab !== null || date.custom !== null || date.picks.length > 0;

  const doctorNames = [...new Set([...knownDoctors, ...visits.flatMap((v) => v.doctor ?? [])])];
  const inRange = visits.filter((v) => inDates(v.day));
  const byDoctor = inRange.filter((v) => !doctor.length || (v.doctor && doctor.includes(v.doctor)));
  const shown = byDoctor
    .filter((v) => !status.length || status.includes(v.status))
    .filter((v) => matchesSearch(query, v.patient, v.service, v.doctor ?? ''));
  // A search, Doctor or Status narrows what is listed; a date only chooses which days.
  const narrowed = doctor.length > 0 || status.length > 0 || query !== '';
  const filtering = narrowed || dateChanged;

  // Day, Week and Month replace the Date filter with that one range, around the first day shown.
  const pickTab = (t: string) => {
    if (t === date.tab) {
      setDate(NO_DATE);
    } else {
      const first = days[0];
      setDate({
        picks: [],
        custom: rangeFor(t as Tab, first && first >= today ? first : today),
        tab: t as Tab,
      });
    }
  };

  return (
    <>
      <PageHeader
        title="Appointments"
        description={current ? `Booked visits at ${current.name}` : 'Booked visits'}
        actions={<PrimaryAction label="Book a visit" onClick={() => setBooking({ day: today })} />}
      />
      <section
        aria-label="Find appointments"
        className="rounded-2xl border border-line bg-surface p-4 lg:p-5"
      >
        <div className="flex flex-wrap items-center gap-x-3 gap-y-4 lg:gap-x-4">
          <div className="relative min-w-0 basis-full lg:basis-[26rem]">
            <Search
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2 text-icon"
            />
            <input
              type="search"
              aria-label="Search appointments"
              placeholder="Search appointments…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-12 w-full rounded-xl border border-line bg-page pr-12 pl-11 text-base text-ink outline-none placeholder:text-placeholder focus-visible:border-brand-link focus-visible:ring-2 focus-visible:ring-brand-link [&::-webkit-search-cancel-button]:hidden"
            />
            {query && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setQuery('')}
                className="absolute top-1/2 right-1.5 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-subtle outline-none hover:bg-line/60 hover:text-ink focus-visible:ring-2 focus-visible:ring-brand-link"
              >
                <X aria-hidden className="size-4" />
              </button>
            )}
          </div>
          <div className="flex basis-full flex-wrap items-center gap-x-3 gap-y-2 lg:basis-auto lg:flex-nowrap">
            <FilterTabs
              fill
              label="Range"
              options={TABS}
              value={date.tab ?? ''}
              onChange={pickTab}
            />
            {filtering && (
              <button
                type="button"
                onClick={() => {
                  setDoctor([]);
                  setStatus([]);
                  setDate(NO_DATE);
                  setQuery('');
                }}
                className="min-h-11 rounded-lg px-3 text-sm font-medium text-brand-link underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-brand-link lg:min-h-9"
              >
                Clear all
              </button>
            )}
          </div>

          <div className="order-3 grid basis-full grid-cols-2 gap-x-3 gap-y-4 lg:grid-cols-3 lg:gap-x-4">
            <div className="col-span-2 lg:col-span-1">
              <FilterField label="Date">
                <DateRangePicker
                  field
                  choice={date}
                  summary={dateSummary}
                  today={today}
                  onChange={setDate}
                />
              </FilterField>
            </div>
            <FilterField label="Doctor">
              <OptionMenu
                field
                multi
                label="Doctor"
                summary={summaryOf(doctor, 'doctors')}
                active={doctor.length > 0}
                selected={doctor}
                onChange={setDoctor}
                options={doctorNames.map((d) => ({
                  value: d,
                  label: d,
                  count: inRange.filter((v) => v.doctor === d).length,
                }))}
              />
            </FilterField>
            <FilterField label="Status">
              <OptionMenu
                field
                multi
                label="Status"
                summary={summaryOf(status, 'statuses')}
                active={status.length > 0}
                selected={status}
                onChange={setStatus}
                options={STATUSES.map((s) => ({
                  value: s,
                  label: s,
                  count: byDoctor.filter((v) => v.status === s).length,
                }))}
              />
            </FilterField>
          </div>

          <div className="order-last flex basis-full items-center justify-between gap-3 border-t border-line pt-3 lg:order-2 lg:ml-auto lg:basis-auto lg:justify-end lg:border-0 lg:pt-0">
            <p className="text-[13px] text-subtle" aria-live="polite">
              {'Showing '}
              <b className="font-semibold text-ink">{shown.length}</b>
              {` of ${plural(visits.length, 'visit')}`}
              {!dateChanged && ' (next 7 days)'}
            </p>
          </div>
        </div>
      </section>

      {!single && shown.length === 0 && (
        <EmptyState
          title="No visits in this range"
          description={
            filtering ? 'Try clearing the filters.' : 'Pick other dates, or book a visit.'
          }
        />
      )}
      <div className="flex flex-col gap-4">
        {days.map((d) => {
          const dayVisits = shown.filter((v) => v.day === d);
          if (!single && dayVisits.length === 0) return null;
          return (
            <VisitTable
              key={d}
              day={d}
              today={today}
              title={single ? undefined : formatDay(d) + (d === today ? ' · Today' : '')}
              visits={dayVisits}
              filtering={narrowed}
              // Free times only make sense when one day is on screen, and not while a search or
              // filter narrows the list.
              slots={single && !narrowed ? slots.filter((s) => s.day === d) : []}
              onBook={(s) => setBooking({ day: s.day, time: s.time })}
              onBookNew={() => setBooking({ day: today })}
              onRebook={(v) =>
                setBooking({
                  day: today,
                  patient: v.patient,
                  patientId: v.patientId,
                  service: v.service,
                  doctor: v.doctor,
                })
              }
              onReschedule={(v) =>
                setBooking({
                  day: v.day,
                  time: v.time,
                  patient: v.patient,
                  patientId: v.patientId,
                  service: v.service,
                  doctor: v.doctor,
                  rescheduleId: v.id,
                })
              }
            />
          );
        })}
      </div>
      {booking && (
        <BookingModal
          start={booking}
          today={today}
          doctors={doctorNames}
          visits={visits}
          onClose={() => setBooking(null)}
        />
      )}
    </>
  );
}
