import { useState } from 'react';
import { EmptyState } from '@/components/common/EmptyState';
import { ListRow } from '@/components/common/ListRow';
import { PageHeader } from '@/components/common/PageHeader';
import { Panel } from '@/components/common/Panel';
import { PrimaryAction } from '@/components/common/PrimaryAction';
import { rowAction, rowGhost } from '@/components/common/buttons';
import { BookingModal, type BookingStart } from '@/features/appointments/components/BookingModal';
import { formatDay } from '@/features/appointments/days';
import {
  cancelVisit,
  MAX_UPCOMING,
  upcomingFor,
  useAppointments,
} from '@/features/appointments/store';
import { useAuth } from '@/features/auth/auth-context';
import { manilaToday } from '@/lib/dates';
import { doctors } from '@/mocks/data/samples';
import type { Appointment } from '@/types/clinic';

// The patient's own visits, and where they book online. A visit is confirmed the moment it is
// booked. To limit what a fake account can tie up, a patient holds at most MAX_UPCOMING upcoming
// visits at a time; at the limit the Book button explains why instead of opening.
export function MyAppointmentsPage() {
  const { user } = useAuth();
  const { visits } = useAppointments();
  const today = manilaToday();
  const [booking, setBooking] = useState<BookingStart | null>(null);
  const name = user?.fullName ?? '';

  const mine = visits.filter((v) => v.patient === name && v.status !== 'Cancelled');
  const upcoming = upcomingFor(visits, name, today).sort((a, b) =>
    (a.day + a.time).localeCompare(b.day + b.time),
  );
  const past = mine.filter((v) => !upcoming.includes(v)).sort((a, b) => b.day.localeCompare(a.day));
  const full = upcoming.length >= MAX_UPCOMING;

  const row = (v: Appointment, actions: boolean) => (
    <ListRow
      key={v.id}
      avatar={false}
      name={v.service}
      detail={`${formatDay(v.day)} · ${v.time} · ${v.doctor ?? 'Any doctor'}`}
      status={v.status === 'Booked' ? 'Confirmed' : v.status}
      action={
        actions &&
        v.status === 'Booked' && (
          <>
            <button
              type="button"
              className={rowAction}
              onClick={() =>
                setBooking({
                  day: v.day,
                  time: v.time,
                  patient: name,
                  service: v.service,
                  doctor: v.doctor,
                  rescheduleId: v.id,
                })
              }
            >
              Reschedule <span className="sr-only">{v.service}</span>
            </button>
            <button type="button" className={rowGhost} onClick={() => cancelVisit(v.id, 'patient')}>
              Cancel <span className="sr-only">{v.service}</span>
            </button>
          </>
        )
      }
    />
  );

  return (
    <>
      <PageHeader
        title="My appointments"
        description="Your booked visits at MRB Optical Clinic"
        actions={
          <PrimaryAction
            label="Book a visit"
            onClick={() => !full && setBooking({ patient: name, day: today })}
          />
        }
      />
      {full && (
        <p
          role="status"
          className="rounded-xl border border-gold/60 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900 dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-200"
        >
          You have {MAX_UPCOMING} upcoming visits, the most you can hold at once. Cancel one, or
          come to your visit, to book another.
        </p>
      )}
      {mine.length === 0 && (
        <EmptyState
          title="No visits yet"
          description="Book a visit and pick a day and time. It is confirmed right away."
        />
      )}
      {upcoming.length > 0 && (
        <Panel title="Upcoming" count={upcoming.length}>
          <ul>{upcoming.map((v) => row(v, true))}</ul>
        </Panel>
      )}
      {past.length > 0 && (
        <Panel title="Past" count={past.length}>
          <ul>{past.map((v) => row(v, false))}</ul>
        </Panel>
      )}
      {booking && (
        <BookingModal
          self
          start={booking}
          today={today}
          doctors={doctors}
          visits={visits}
          onClose={() => setBooking(null)}
        />
      )}
    </>
  );
}
