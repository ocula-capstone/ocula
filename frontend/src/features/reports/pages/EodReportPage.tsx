import { ClipboardList, Package, Users } from 'lucide-react';
import { outlineButton } from '@/components/common/buttons';
import { ListRow } from '@/components/common/ListRow';
import { PageHeader } from '@/components/common/PageHeader';
import { Panel, PanelEmpty } from '@/components/common/Panel';
import { StatGrid } from '@/components/common/StatGrid';
import { StatusBadge } from '@/components/common/StatusBadge';
import { statusTone } from '@/components/common/statusTone';
import { needsRestock, stockLevel } from '@/features/inventory/stock';
import { useTodayLine } from '@/hooks/useTodayLine';
import { doctorSchedule, jobOrders, jobStages, stock } from '@/mocks/data/samples';

// The day in one page, to read or print. No money totals by decision.
export function EodReportPage() {
  const todayLine = useTodayLine();
  const seen = doctorSchedule.filter((v) => v.status === 'Done').length;
  const open = jobOrders.filter((j) => j.stage !== 'Picked up');
  const ready = open.filter((j) => j.stage === 'Ready').length;
  const restock = needsRestock(stock);

  return (
    <>
      <PageHeader title="End-of-day report" description={todayLine} />
      <StatGrid
        items={[
          {
            label: 'Patients seen',
            value: String(seen),
            note: `of ${doctorSchedule.length} booked today`,
            icon: Users,
          },
          {
            label: 'Job orders open',
            value: String(open.length),
            note: `${ready} ready for pickup`,
            icon: ClipboardList,
          },
          {
            label: 'Items low or out',
            value: String(restock.length),
            note: 'See inventory',
            icon: Package,
          },
        ]}
      />
      <div className="grid items-start gap-4 lg:grid-cols-5">
        <Panel title="Visits today" count={doctorSchedule.length} className="lg:col-span-3">
          {doctorSchedule.length === 0 && <PanelEmpty>No visits today</PanelEmpty>}
          <ol>
            {doctorSchedule.map((v) => (
              <ListRow
                key={v.id}
                name={v.patient}
                detail={v.service}
                time={v.time}
                status={v.status}
              />
            ))}
          </ol>
        </Panel>
        <div className="space-y-4 lg:col-span-2">
          <Panel title="Job orders by stage">
            <dl className="divide-y divide-line">
              {jobStages.map((stage) => (
                <div key={stage} className="flex items-center justify-between py-3">
                  <dt className="text-sm text-ink">{stage}</dt>
                  <dd className="text-sm font-semibold text-ink tabular-nums">
                    {jobOrders.filter((j) => j.stage === stage).length}
                  </dd>
                </div>
              ))}
            </dl>
          </Panel>
          <Panel title="Restock">
            {restock.length === 0 && <PanelEmpty>Nothing to restock</PanelEmpty>}
            <ul className="divide-y divide-line">
              {restock.map((s) => {
                const level = stockLevel(s);
                return (
                  <li key={s.sku} className="flex items-center justify-between gap-3 py-3">
                    <span className="text-sm text-ink">{s.item}</span>
                    <StatusBadge tone={statusTone(level)}>{level}</StatusBadge>
                  </li>
                );
              })}
            </ul>
          </Panel>
        </div>
      </div>
      {/* At the end: read the day, then print it. */}
      <button type="button" onClick={() => window.print()} className={outlineButton}>
        Print report
      </button>
    </>
  );
}
