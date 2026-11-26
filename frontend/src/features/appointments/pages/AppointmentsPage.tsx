import { Funnel } from 'lucide-react';
import { useState } from 'react';
import { EmptyState } from '@/components/common/EmptyState';
import { FilterTabs } from '@/components/common/FilterTabs';
import { OptionMenu } from '@/components/common/OptionMenu';
import { PageHeader } from '@/components/common/PageHeader';
import { PrimaryAction } from '@/components/common/PrimaryAction';
import { BookingModal, type BookingStart } from '@/features/appointments/components/BookingModal';
import { DateRangePicker } from '@/features/appointments/components/DateRangePicker';
import { VisitList } from '@/features/appointments/components/VisitList';
import {
  addDays,
  daysIn,
  formatDay,
  rangeFor,
  type Range,
  type Tab,
} from '@/features/appointments/days';
import { useAppointments } from '@/features/appointments/store';
import { useBranch } from '@/features/branches/branch-context';
import { manilaToday } from '@/lib/dates';
import { plural } from '@/lib/format';
import { doctors as knownDoctors } from '@/mocks/data/samples';
import type { VisitStatus } from '@/types/clinic';

const TABS: Tab[] = ['Day', 'Week', 'Month'];
const STATUSES: VisitStatus[] = ['Booked', 'Waiting', 'In exam', 'Done', 'No-show', 'Cancelled'];
const divider = <span aria-hidden className="hidden h-8 w-px bg-line lg:block" />;

// "Dr. Ana" or "2 doctors" for a button that shows several picks; null while nothing is picked.
const summaryOf = (picked: string[], noun: string) =>
  picked.length === 0 ? null : picked.length <= 2 ? picked.join(', ') : `${picked.length} ${noun}`;

// The desk's schedule. It opens as a list of the next 7 days; Day, Week and Month are quick
// ranges with arrows, and the Date calendar takes any range. Doctor and Status narrow the list
// (Cancelled visits stay hidden until Cancelled is ticked in Status).
export function AppointmentsPage() {
  const { current } = useBranch();
  const { visits, slots } = useAppointments();
  const today = manilaToday();
  const [tab, setTab] = useState<Tab | null>(null);
  const [range, setRange] = useState<Range>({ from: today, to: addDays(today, 6) });
  const [doctor, setDoctor] = useState<string[]>([]);
  const [status, setStatus] = useState<string[]>([]);
  const [booking, setBooking] = useState<BookingStart | null>(null);

  const doctorNames = [...new Set([...knownDoctors, ...visits.flatMap((v) => v.doctor ?? [])])];
  const inRange = visits.filter((v) => v.day >= range.from && v.day <= range.to);
  const byDoctor = inRange.filter((v) => !doctor.length || (v.doctor && doctor.includes(v.doctor)));
  const shown = byDoctor.filter((v) =>
    status.length ? status.includes(v.status) : v.status !== 'Cancelled',
  );
  const days = range.from === range.to ? [range.from] : daysIn(range);
  const single = range.from === range.to;
  const filtering = doctor.length > 0 || status.length > 0;

  const pickTab = (t: string) => {
    if (t === tab) {
      setTab(null);
      setRange({ from: today, to: addDays(today, 6) });
    } else {
      setTab(t as Tab);
      setRange(rangeFor(t as Tab, range.from < today && !tab ? today : range.from));
    }
  };

  return (
    <>
      <PageHeader
        title="Appointments"
        description={current ? `Booked visits at ${current.name}` : 'Booked visits'}
        actions={<PrimaryAction label="Book a visit" onClick={() => setBooking({ day: today })} />}
      />
      <div className="flex flex-wrap items-center gap-x-1 gap-y-1 rounded-xl border border-line bg-surface p-1.5 lg:flex-nowrap">
        <span className="flex items-center gap-2 px-3 text-sm font-medium text-ink">
          <Funnel aria-hidden className="size-4 text-subtle" />
          Filters
        </span>
        {divider}
        <DateRangePicker
          range={range}
          today={today}
          onPick={(r, t) => {
            setRange(r);
            setTab(t);
          }}
        />
        <OptionMenu
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
        <OptionMenu
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
        {filtering && (
          <button
            type="button"
            onClick={() => {
              setDoctor([]);
              setStatus([]);
            }}
            className="min-h-11 rounded-lg px-3 text-sm font-medium text-brand-link underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-brand-link"
          >
            Clear all
          </button>
        )}
        <div className="ml-auto">
          <FilterTabs soft label="Range" options={TABS} value={tab ?? ''} onChange={pickTab} />
        </div>
      </div>
      <p className="text-sm text-subtle" aria-live="polite">
        {plural(shown.length, 'visit')}
        {filtering && ` of ${inRange.length}`}
      </p>

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
            <VisitList
              key={d}
              title={single ? undefined : formatDay(d) + (d === today ? ' · Today' : '')}
              fold={single}
              visits={dayVisits}
              // Open slots only make sense when one day is on screen.
              slots={single && !filtering ? slots.filter((s) => s.day === d) : []}
              onBook={(s) => setBooking({ day: s.day, time: s.time })}
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
