import { useState } from 'react';
import { Avatar } from '@/components/common/Avatar';
import { actionButton } from '@/components/common/buttons';
import { CancelVisitDialog } from '@/features/appointments/components/CancelVisitDialog';
import { MainAction, MoreMenu } from '@/features/appointments/components/VisitActions';
import { VisitStatusPill } from '@/features/appointments/components/VisitStatusPill';
import { minutesOf, waitText } from '@/features/appointments/days';
import {
  cancelNote,
  countNoShows,
  countThatDidNot,
  countThatHappened,
  dayWords,
  groupVisits,
  summaryLine,
  type VisitGroup,
} from '@/features/appointments/groups';
import { useAppointments } from '@/features/appointments/store';
import { useNow } from '@/hooks/useNow';
import { cn } from '@/lib/utils';
import type { Appointment, OpenSlot } from '@/types/clinic';

// Every row is one grid: time | patient | doctor | status | action | menu. On a phone the same cells
// wrap into a small card instead (time and status on the first line, then patient, doctor, action).
const GRID =
  'md:grid md:grid-cols-[96px_minmax(0,2.4fr)_minmax(0,1.4fr)_180px_140px_44px] md:items-center md:gap-4 md:px-6';
const ROW = `flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-slate-100 px-4 py-3 md:min-h-[68px] md:py-2.5 dark:border-white/5 ${GRID}`;
const BAR =
  'flex items-center justify-between border-y border-line bg-slate-50 px-4 py-2.5 text-xs font-semibold tracking-[0.04em] text-slate-600 uppercase md:px-6 dark:bg-white/5 dark:text-slate-300';

type Entry = { kind: 'visit'; v: Appointment } | { kind: 'slot'; s: OpenSlot };

// One day's visits as a table in four groups. `title` puts the day above it when several days are
// listed. `slots` are the free times, shown among "later" so a gap can be booked from its place.
export function VisitTable({
  day,
  today,
  title,
  visits,
  slots,
  filtering,
  onBook,
  onBookNew,
  onReschedule,
  onRebook,
}: {
  day: string;
  today: string;
  title?: string;
  visits: Appointment[];
  slots: OpenSlot[];
  // Narrowed by a search or filter: an empty day then says "no match", not "no visits".
  filtering?: boolean;
  onBook: (slot: OpenSlot) => void;
  onBookNew: () => void;
  onReschedule: (v: Appointment) => void;
  onRebook: (v: Appointment) => void;
}) {
  const { visits: all } = useAppointments();
  const now = useNow();
  const [showDone, setShowDone] = useState(false);
  const [cancelling, setCancelling] = useState<Appointment | null>(null);
  const groups = groupVisits(visits, day, today);
  const empty = visits.length === 0 && slots.length === 0;
  const when = dayWords(day, today);

  const entries = (g: VisitGroup): Entry[] =>
    [
      ...g.visits.map((v): Entry => ({ kind: 'visit', v })),
      ...(g.key === 'later' ? slots.map((s): Entry => ({ kind: 'slot', s })) : []),
    ].sort(
      (a, b) =>
        minutesOf(a.kind === 'visit' ? a.v.time : a.s.time) -
        minutesOf(b.kind === 'visit' ? b.v.time : b.s.time),
    );

  return (
    <section aria-label={title ?? 'Appointments'} className="flex flex-col gap-3">
      {title && <h2 className="px-1 text-base font-semibold text-ink">{title}</h2>}
      <div className="overflow-hidden rounded-[14px] border border-line bg-surface">
        <div className="overflow-x-auto">
          <div role="table" aria-label={title ?? 'Appointments'} className="md:min-w-[900px]">
            <div role="rowgroup">
              <div
                role="row"
                className={cn(
                  'hidden border-b border-line py-3 text-xs font-semibold tracking-[0.04em] text-slate-600 uppercase dark:text-slate-300',
                  GRID,
                )}
              >
                <div role="columnheader">Time</div>
                <div role="columnheader">Patient</div>
                <div role="columnheader">Doctor</div>
                <div role="columnheader">Status</div>
                <div role="columnheader" className="sr-only">
                  Main action
                </div>
                <div role="columnheader" className="sr-only">
                  More actions
                </div>
              </div>
            </div>

            {empty && (
              <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
                <p className="text-base font-semibold text-ink">
                  {filtering ? 'No visits match' : `No visits ${when}`}
                </p>
                {!filtering && (
                  <button type="button" onClick={onBookNew} className={cn(actionButton, 'h-11')}>
                    Book a visit
                  </button>
                )}
              </div>
            )}

            {groups.map((g) => {
              const open = g.key !== 'done' || showDone;
              return (
                <div role="rowgroup" key={g.key} aria-label={g.title}>
                  <div role="row" className={BAR}>
                    <div role="cell">{`${g.title} · ${entries(g).length}`}</div>
                    {g.key === 'done' && (
                      <button
                        type="button"
                        aria-expanded={showDone}
                        onClick={() => setShowDone((s) => !s)}
                        className="min-h-11 rounded-md px-1 text-[13px] font-semibold tracking-normal text-brand-link normal-case underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
                      >
                        {showDone ? 'Hide' : 'Show'}
                      </button>
                    )}
                  </div>
                  {open &&
                    entries(g).map((e) =>
                      e.kind === 'slot' ? (
                        <div key={e.s.id} role="row" className={ROW}>
                          <div role="cell" className="text-sm font-semibold text-ink tabular-nums">
                            {e.s.time}
                          </div>
                          <div
                            role="cell"
                            className="min-w-0 flex-1 basis-full rounded-[10px] border border-dashed border-brand/50 px-4 py-2 text-[13px] text-subtle md:col-span-2 md:basis-auto"
                          >
                            Open slot · {e.s.minutes} min
                          </div>
                          <div role="cell" aria-hidden className="hidden md:block" />
                          <div role="cell" className="md:w-full">
                            <button
                              type="button"
                              onClick={() => onBook(e.s)}
                              className="inline-flex h-11 w-full min-w-28 items-center justify-center rounded-[10px] border border-brand bg-surface px-4 text-sm font-semibold text-brand-text outline-none hover:bg-brand/5 focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
                            >
                              Book <span className="sr-only">{e.s.time}</span>
                            </button>
                          </div>
                          <div role="cell" aria-hidden className="hidden md:block" />
                        </div>
                      ) : (
                        <Row
                          key={e.v.id}
                          v={e.v}
                          now={now}
                          noShows={countNoShows(all, e.v)}
                          onReschedule={onReschedule}
                          onRebook={onRebook}
                          onCancel={setCancelling}
                        />
                      ),
                    )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {!empty && (
        <p className="px-1 text-[13px] text-subtle">
          {summaryLine(countThatHappened(visits), countThatDidNot(visits), when)}
        </p>
      )}
      {cancelling && <CancelVisitDialog visit={cancelling} onClose={() => setCancelling(null)} />}
    </section>
  );
}

function Row({
  v,
  now,
  noShows,
  onReschedule,
  onRebook,
  onCancel,
}: {
  v: Appointment;
  now: number;
  noShows: number;
  onReschedule: (v: Appointment) => void;
  onRebook: (v: Appointment) => void;
  onCancel: (v: Appointment) => void;
}) {
  const away = v.status === 'Cancelled' || v.status === 'No-show';
  // Under the name: the service, the job order for a pickup, who cancelled, how long they have waited.
  const detail = [
    v.service,
    v.note,
    v.status === 'Cancelled' && cancelNote(v),
    v.status === 'Waiting' && v.waitingSince && waitText(v.waitingSince, now),
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <div role="row" className={cn(ROW, away && 'bg-slate-50/70 dark:bg-white/[0.02]')}>
      <div
        role="cell"
        className="order-1 flex-1 text-sm font-semibold text-ink tabular-nums md:order-none md:flex-none"
      >
        {v.time}
      </div>
      <div
        role="cell"
        className="order-3 flex min-w-0 basis-full items-center gap-3 md:order-none md:basis-auto"
      >
        <Avatar
          name={v.patient}
          className={cn(
            'size-[38px] shrink-0 bg-brand/10 text-brand',
            away && 'bg-slate-200 text-slate-600 dark:bg-white/10 dark:text-slate-300',
          )}
        />
        <div className="min-w-0">
          <p className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold text-ink">{v.patient}</span>
            {noShows >= 2 && (
              <span className="inline-flex h-6 shrink-0 items-center rounded-full border border-amber-400 px-2.5 text-xs font-semibold whitespace-nowrap text-amber-800 dark:text-amber-200">
                {noShows} no-shows
              </span>
            )}
          </p>
          <p className="truncate text-[13px] text-subtle">{detail}</p>
        </div>
      </div>
      <div
        role="cell"
        className="order-4 basis-full text-sm text-subtle md:order-none md:basis-auto"
      >
        {v.doctor ?? '—'}
      </div>
      <div role="cell" className="order-2 md:order-none">
        <VisitStatusPill status={v.status} />
      </div>
      <div role="cell" className="order-5 flex-1 md:order-none md:flex-none">
        <MainAction visit={v} onRebook={onRebook} />
      </div>
      <div role="cell" className="order-6 md:order-none">
        <MoreMenu visit={v} now={now} onReschedule={onReschedule} onCancel={onCancel} />
      </div>
    </div>
  );
}
