import { CalendarDays, Eye, Hash } from 'lucide-react';
import { Link } from 'react-router';
import { lightButton, primaryButton, textLink } from '@/components/common/buttons';
import { EyeReading } from '@/components/common/EyeReading';
import { ListRow } from '@/components/common/ListRow';
import { PageHeader } from '@/components/common/PageHeader';
import { Panel, PanelEmpty } from '@/components/common/Panel';
import { StatGrid } from '@/components/common/StatGrid';
import { useAuth } from '@/features/auth/auth-context';
import { greetingName } from '@/features/dashboard/greeting';
import { cn } from '@/lib/utils';
import { myExams, myNextVisit, myPatientNumber } from '@/mocks/data/samples';

// The patient's home: their next visit first, then their latest prescription.
export function PatientDashboard() {
  const { user } = useAuth();
  const latest = myExams.at(0); // undefined until their first exam

  return (
    <>
      <PageHeader
        title={`Hello, ${greetingName(user?.fullName ?? '')}`}
        description="Here's a summary of your eye health and records."
      />
      {myNextVisit ? (
        <section className="flex flex-wrap items-center gap-5 rounded-2xl bg-navy-900 p-5 text-white lg:p-6">
          <div
            aria-hidden
            className="grid size-16 shrink-0 place-items-center rounded-2xl bg-white/10 text-center"
          >
            <div>
              <p className="text-xs tracking-widest text-navy-muted uppercase">
                {myNextVisit.month}
              </p>
              <p className="text-2xl leading-none font-bold">{myNextVisit.day}</p>
            </div>
          </div>
          <div className="min-w-0 flex-1 basis-56">
            <p className="text-sm text-navy-muted">Next visit</p>
            <h2 className="text-lg font-semibold">{myNextVisit.title}</h2>
            <p className="text-navy-muted">
              {myNextVisit.when} · {myNextVisit.branch}
            </p>
          </div>
          <button type="button" className={cn(lightButton, 'w-full sm:w-auto')}>
            Confirm appointment
          </button>
        </section>
      ) : (
        <Panel title="Next visit">
          <PanelEmpty>No visit booked</PanelEmpty>
        </Panel>
      )}
      <StatGrid
        items={[
          {
            label: 'Total visits',
            value: String(myExams.length),
            note: 'Eye exams on record',
            icon: CalendarDays,
          },
          {
            label: 'Last examination',
            value: latest ? latest.date.replace(/, \d{4}$/, '') : '—',
            note: latest?.branch ?? 'Not examined yet',
            icon: Eye,
          },
          {
            label: 'Patient ID',
            value: myPatientNumber ?? '—',
            note: myPatientNumber ? 'Active patient' : 'Given at your first visit',
            icon: Hash,
          },
        ]}
      />
      <div className="grid items-start gap-4 lg:grid-cols-5">
        <Panel title="Latest prescription" className="lg:col-span-3">
          {latest ? (
            <>
              <p className="text-sm text-subtle">
                {latest.date} · {latest.doctor}
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {latest.rx.map(({ eye, reading }) => (
                  <EyeReading key={eye} label={eye} reading={reading} />
                ))}
              </div>
              <p className="mt-3 text-sm text-subtle">Pupillary distance {latest.pd}</p>
            </>
          ) : (
            <PanelEmpty>No prescription yet</PanelEmpty>
          )}
        </Panel>
        <div className="space-y-4 lg:col-span-2">
          <Panel
            title="Visit history"
            action={
              <Link to="/me/records" className={textLink}>
                Full history
              </Link>
            }
          >
            {myExams.length === 0 && <PanelEmpty>No visits yet</PanelEmpty>}
            <ul>
              {myExams.map((e) => (
                <ListRow
                  key={e.id}
                  avatar={false}
                  name={e.date}
                  detail={`Eye exam · ${e.doctor}`}
                />
              ))}
            </ul>
          </Panel>
          <Panel title="Find frames that suit you">
            <p className="text-sm text-subtle">
              Upload a photo and see matching styles from our catalog.
            </p>
            <Link to="/me/frame-finder" className={cn(primaryButton, 'mt-3 w-full sm:w-auto')}>
              Find my frames
            </Link>
          </Panel>
        </div>
      </div>
    </>
  );
}
