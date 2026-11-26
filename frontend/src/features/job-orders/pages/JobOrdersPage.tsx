import { outlineButton } from '@/components/common/buttons';
import { PageHeader } from '@/components/common/PageHeader';
import { PrimaryAction } from '@/components/common/PrimaryAction';
import { cn } from '@/lib/utils';
import { jobOrders, jobStages } from '@/mocks/data/samples';

// A board, because glasses move left to right: ordered, in the lab, ready, picked up.
// Four columns on wide screens, two on tablets, stacked on phones.
export function JobOrdersPage() {
  const ready = jobOrders.filter((j) => j.stage === 'Ready').length;

  return (
    <>
      <PageHeader
        title="Job orders"
        description="Glasses being made, from order to pickup"
        actions={<PrimaryAction label="New job order" />}
      />
      <div className="flex flex-wrap items-center gap-3">
        <p role="status" className="text-sm text-subtle">
          {jobOrders.length} {jobOrders.length === 1 ? 'order' : 'orders'} · {ready} ready for
          pickup
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {jobStages.map((stage) => {
          const orders = jobOrders.filter((j) => j.stage === stage);
          const headingId = `stage-${stage.replace(/\s+/g, '-').toLowerCase()}`;
          return (
            <section
              key={stage}
              aria-labelledby={headingId}
              className="rounded-2xl bg-surface/60 p-3 ring-1 ring-line"
            >
              <h2 id={headingId} className="px-1 pb-3 text-base font-semibold text-ink">
                {stage} <span className="font-normal text-subtle">{orders.length}</span>
              </h2>
              <ul className="space-y-3">
                {orders.map((j) => (
                  <li key={j.id} className="rounded-xl border border-line bg-surface p-4">
                    <p className="text-sm font-semibold text-ink">{j.patient}</p>
                    <p className="text-[13px] text-subtle">{j.item}</p>
                    <p className="mt-2 text-[13px] text-subtle">
                      {j.id} · Due {j.due}
                    </p>
                    {stage === 'Ready' && (
                      <button type="button" className={cn(outlineButton, 'mt-3 w-full')}>
                        Mark picked up<span className="sr-only"> for {j.patient}</span>
                      </button>
                    )}
                  </li>
                ))}
                {orders.length === 0 && <li className="px-1 text-sm text-subtle">Nothing here.</li>}
              </ul>
            </section>
          );
        })}
      </div>
    </>
  );
}
