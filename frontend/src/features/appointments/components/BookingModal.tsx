import { useState, type ReactNode } from 'react';
import { primaryButton } from '@/components/common/buttons';
import { CalendarPanel, type DayNote } from '@/components/common/CalendarPanel';
import { Modal } from '@/components/common/Modal';
import { OptionMenu } from '@/components/common/OptionMenu';
import {
  PatientPicker,
  type PatientChoice,
} from '@/features/appointments/components/PatientPicker';
import { TimeGrid } from '@/features/appointments/components/TimeGrid';
import { formatDay, from24, to24 } from '@/features/appointments/days';
import { freeCount, slotTimes } from '@/features/appointments/slots';
import { findConflict, saveBooking, VISIT_MINUTES } from '@/features/appointments/store';
import { useBranch } from '@/features/branches/branch-context';
import { manilaMinutes } from '@/lib/dates';
import { cn } from '@/lib/utils';
import type { Appointment } from '@/types/clinic';

const SERVICES = [
  'Eye exam',
  'Annual eye exam',
  'Contact lens fitting',
  'Contact lens follow-up',
  'Frame fitting',
  'Glasses pickup',
];

export interface BookingStart {
  patient?: string;
  patientId?: string;
  service?: string;
  doctor?: string | null;
  day: string;
  time?: string;
  // Set when an existing visit is being moved.
  rescheduleId?: string;
}

// One column of the modal: a title, a line of context, then its content. Every column has the same
// padding so the titles and edges line up across the box.
function Column({
  title,
  hint,
  className,
  children,
}: {
  title: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section aria-label={title} className={cn('flex min-w-0 flex-col gap-6 p-6', className)}>
      <div>
        <h3 className="text-base font-semibold text-ink">{title}</h3>
        {hint && <p className="mt-1 text-[13px] text-subtle">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function Label({ children }: { children: ReactNode }) {
  return <span className="text-sm font-semibold text-ink">{children}</span>;
}

// Books a visit, or moves one (`start.rescheduleId`), in three steps side by side: who and what,
// which day (with how full each day is), which time (taken times are shown). Mount it only while
// open so each opening starts fresh.
export function BookingModal({
  start,
  today,
  doctors,
  visits,
  self,
  onClose,
}: {
  start: BookingStart;
  today: string;
  doctors: string[];
  // Every visit, so a taken time can be shown and refused before saving.
  visits: Appointment[];
  // A patient booking for themselves: their name is fixed, and times that have passed today
  // cannot be picked.
  self?: boolean;
  onClose: () => void;
}) {
  const moving = Boolean(start.rescheduleId);
  const [patient, setPatient] = useState<PatientChoice | null>(
    start.patient ? { id: start.patientId, name: start.patient } : null,
  );
  const [service, setService] = useState(start.service ?? SERVICES[0]);
  const [doctor, setDoctor] = useState(start.doctor ?? '');
  const [day, setDay] = useState(start.day);
  const [time, setTime] = useState(start.time ? to24(start.time) : '');
  const [error, setError] = useState('');
  const { current } = useBranch();

  const others = visits.filter((v) => v.id !== start.rescheduleId);
  const who = doctor || null;
  // A patient booking online cannot pick today's times that have passed.
  const nowMin = self ? manilaMinutes() : 0;
  const earliestOn = (d: string) => (d === today ? nowMin : 0);
  const open = freeCount(others, day, who, earliestOn(day));
  const booked = slotTimes().filter((t) => findConflict(others, day, t, who)).length;
  const conflict = time ? findConflict(others, day, from24(time), who) : undefined;
  const ready = Boolean(patient && time && !conflict);

  // Under each day: "Full", or "N left" when it is nearly full. Anything longer would not fit the cell.
  const dayNote = (d: string): DayNote | null => {
    if (d < today) return null;
    const n = freeCount(others, d, who, earliestOn(d));
    if (n === 0) return { text: 'Full', tone: 'muted' };
    return n <= 3 ? { text: `${n} left`, tone: 'warn' } : null;
  };

  function submit(e: React.SyntheticEvent) {
    e.preventDefault();
    if (!patient || !time || conflict) return;
    const saved = saveBooking(
      {
        patient: patient.name,
        patientId: patient.id,
        service,
        doctor: who,
        day,
        time: from24(time),
      },
      start.rescheduleId,
    );
    if (!saved) return setError('That time is already booked. Pick another.');
    onClose();
  }

  return (
    <Modal
      flush
      open
      onOpenChange={(next) => !next && onClose()}
      title={moving ? 'Reschedule visit' : 'Book a visit'}
      description={self ? 'Your visit is confirmed as soon as you book.' : current?.name}
      className="max-w-[70rem]"
    >
      <form
        onSubmit={submit}
        noValidate
        className="grid divide-y divide-line md:grid-cols-[20rem_22.5rem_minmax(0,1fr)] md:divide-x md:divide-y-0"
      >
        <Column title="Patient">
          <PatientPicker value={patient} onChange={setPatient} locked={moving || self} />
          <div className="flex flex-col gap-2">
            <Label>Doctor</Label>
            <OptionMenu
              bare
              label="Doctor"
              summary={doctor || 'Any doctor'}
              options={[
                { value: '', label: 'Any doctor' },
                ...doctors.map((d) => ({ value: d, label: d })),
              ]}
              selected={[doctor]}
              onChange={([d]) => setDoctor(d)}
              className="min-h-11 w-full justify-between rounded-xl border-field-border lg:min-h-11"
            />
          </div>
          <div role="group" aria-label="Service" className="flex flex-col gap-2">
            <Label>Service</Label>
            <div className="grid grid-cols-2 gap-2">
              {SERVICES.map((sv) => (
                <button
                  key={sv}
                  type="button"
                  aria-pressed={sv === service}
                  onClick={() => setService(sv)}
                  className={cn(
                    'min-h-11 rounded-xl border px-2.5 py-2 text-center text-[13px] leading-tight outline-none focus-visible:ring-2 focus-visible:ring-brand-link lg:min-h-10',
                    sv === service
                      ? 'border-brand bg-brand/10 font-semibold text-brand-text'
                      : 'border-line font-medium text-ink hover:bg-page',
                  )}
                >
                  {sv}
                </button>
              ))}
            </div>
          </div>
        </Column>
        <Column title="Date" hint="Nearly full and full days are marked.">
          <CalendarPanel
            mode="day"
            future
            today={today}
            focus={day}
            day={day}
            onDay={(d) => {
              setDay(d);
              setError('');
            }}
            dayNote={dayNote}
            isDisabled={(d) => d < today || freeCount(others, d, who, earliestOn(d)) === 0}
          />
        </Column>
        <Column title="Time" hint={`${formatDay(day)} · ${open} open · ${booked} booked`}>
          <TimeGrid
            day={day}
            doctor={who}
            visits={others}
            value={time}
            onChange={setTime}
            earliest={self && day === today ? nowMin : undefined}
          />
          {conflict && (
            <p
              role="alert"
              className="rounded-xl border border-gold/60 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900 dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-200"
            >
              {from24(time)} overlaps {conflict.patient}’s {conflict.time} visit. Visits take{' '}
              {VISIT_MINUTES} minutes; pick another time{who ? ' or doctor' : ''}.
            </p>
          )}
          {error && (
            <p role="alert" className="text-sm font-medium text-error">
              {error}
            </p>
          )}
          <div className="mt-auto flex flex-col gap-2 pt-1">
            <button
              type="submit"
              disabled={!ready}
              className={cn(
                primaryButton,
                'w-full disabled:pointer-events-none disabled:opacity-50',
              )}
            >
              {time
                ? `${moving ? 'Save new time' : 'Book visit'} · ${formatDay(day)} · ${from24(time)}`
                : 'Pick a time'}
            </button>
            {!patient && time && (
              <p className="text-center text-[13px] text-subtle">Choose a patient to continue.</p>
            )}
          </div>
        </Column>
      </form>
    </Modal>
  );
}
