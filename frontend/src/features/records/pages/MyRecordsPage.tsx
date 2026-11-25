import { EmptyState } from '@/components/common/EmptyState';
import { EyeReading } from '@/components/common/EyeReading';
import { PageHeader } from '@/components/common/PageHeader';
import { Panel } from '@/components/common/Panel';
import { myExams } from '@/mocks/data/samples';

// The patient's exams, newest first, each with its prescription.
export function MyRecordsPage() {
  return (
    <>
      <PageHeader title="My records" description="Your eye exams and prescriptions, newest first" />
      {myExams.length === 0 && (
        <EmptyState
          title="No records yet"
          description="Your exams will appear here after your first visit."
        />
      )}
      <ol className="space-y-4">
        {myExams.map((exam, index) => (
          <li key={exam.id}>
            <Panel title={exam.date}>
              <p className="text-sm text-subtle">
                {exam.doctor} · {exam.branch}
                {index === 0 && ' · Latest'}
              </p>
              <p className="mt-3 text-sm text-ink">{exam.diagnosis}</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {exam.rx.map(({ eye, reading }) => (
                  <EyeReading key={eye} label={eye} reading={reading} />
                ))}
              </div>
              <p className="mt-3 text-sm text-subtle">Pupillary distance {exam.pd}</p>
            </Panel>
          </li>
        ))}
      </ol>
    </>
  );
}
