import { MoreHorizontal } from 'lucide-react';
import { useState } from 'react';
import { iconOutlineButton, outlineButton, textLink } from '@/components/common/buttons';
import { ListRow } from '@/components/common/ListRow';
import { Panel, PanelEmpty } from '@/components/common/Panel';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { minutesOf, waitText } from '@/features/appointments/days';
import { cancelVisit, checkIn, markNoShow, startExam } from '@/features/appointments/store';
import { NextStepButton } from '@/features/dashboard/components/TodayQueue';
import { useNow } from '@/hooks/useNow';
import { plural } from '@/lib/format';
import type { Appointment, OpenSlot } from '@/types/clinic';

type Entry = { kind: 'visit'; v: Appointment } | { kind: 'slot'; s: OpenSlot };

// What each visit offers besides its main button.
function RowMenu({ v, onReschedule }: { v: Appointment; onReschedule: (v: Appointment) => void }) {
  if (!['Booked', 'No-show', 'Cancelled'].includes(v.status)) return null;
  const booked = v.status === 'Booked';
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`More actions for ${v.patient}`}
        className={iconOutlineButton}
      >
        <MoreHorizontal aria-hidden className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44 p-1.5">
        <DropdownMenuItem className="min-h-10 px-3" onClick={() => onReschedule(v)}>
          Reschedule
        </DropdownMenuItem>
        {booked && (
          <>
            <DropdownMenuItem className="min-h-10 px-3" onClick={() => markNoShow(v.id)}>
              Mark no-show
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              className="min-h-10 px-3"
              onClick={() => cancelVisit(v.id)}
            >
              Cancel visit
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// One day's visits (and its open slots) as a timeline in time order. `title` makes it a titled
// panel (several days listed); without it it is a plain card (one day). Finished visits fold away
// behind "Show" when `fold` is set so the rows still to do are on top.
export function VisitList({
  title,
  visits,
  slots,
  fold,
  onBook,
  onReschedule,
}: {
  title?: string;
  visits: Appointment[];
  slots: OpenSlot[];
  fold?: boolean;
  onBook: (slot: OpenSlot) => void;
  onReschedule: (v: Appointment) => void;
}) {
  const now = useNow();
  const [showDone, setShowDone] = useState(false);
  const done = fold ? visits.filter((v) => v.status === 'Done').length : 0;
  const entries: Entry[] = [
    ...visits
      .filter((v) => showDone || !fold || v.status !== 'Done')
      .map((v): Entry => ({ kind: 'visit', v })),
    ...slots.map((s): Entry => ({ kind: 'slot', s })),
  ].sort(
    (a, b) =>
      minutesOf(a.kind === 'visit' ? a.v.time : a.s.time) -
      minutesOf(b.kind === 'visit' ? b.v.time : b.s.time),
  );

  const body = (
    <>
      {done > 0 && (
        <div className="mb-1 flex items-center justify-between rounded-xl bg-page px-3 py-2 text-sm text-subtle">
          {plural(done, 'earlier visit')} completed
          <button
            type="button"
            aria-expanded={showDone}
            onClick={() => setShowDone((s) => !s)}
            className={textLink}
          >
            {showDone ? 'Hide' : 'Show'}
          </button>
        </div>
      )}
      {entries.length === 0 && <PanelEmpty>No visits booked</PanelEmpty>}
      <ul>
        {entries.map((e) =>
          e.kind === 'visit' ? (
            <ListRow
              key={e.v.id}
              name={e.v.patient}
              detail={[e.v.service, e.v.doctor, e.v.note].filter(Boolean).join(' · ')}
              meta={e.v.status === 'Waiting' && e.v.waitingSince && waitText(e.v.waitingSince, now)}
              time={e.v.time}
              status={e.v.status}
              current={e.v.status === 'In exam'}
              avatarTone="brand"
              action={
                <>
                  <NextStepButton
                    status={e.v.status}
                    patient={e.v.patient}
                    // Only the status changes; records open from the "Open records" button.
                    onClick={() => (e.v.status === 'Booked' ? checkIn(e.v.id) : startExam(e.v.id))}
                  />
                  <RowMenu v={e.v} onReschedule={onReschedule} />
                </>
              }
            />
          ) : (
            <li
              key={e.s.id}
              className="flex items-center gap-x-3 border-b border-line px-2 py-2.5 last:border-0"
            >
              <span className="hidden w-[4.5rem] shrink-0 text-[13px] font-semibold text-ink tabular-nums sm:block">
                {e.s.time}
              </span>
              <p className="flex-1 rounded-lg border border-dashed border-brand/50 px-3 py-3 text-sm text-subtle">
                <span className="sm:hidden">{e.s.time} · </span>
                Open slot · {e.s.minutes} min
              </p>
              <button type="button" className={outlineButton} onClick={() => onBook(e.s)}>
                Book <span className="sr-only">{e.s.time}</span>
              </button>
            </li>
          ),
        )}
      </ul>
    </>
  );

  return title ? (
    <Panel title={title} count={visits.length}>
      {body}
    </Panel>
  ) : (
    <section className="rounded-2xl border border-line bg-surface p-3 lg:p-4">{body}</section>
  );
}
