import { Panel, PanelEmpty } from '@/components/common/Panel';
import { needsAttention } from '@/features/dashboard/needsAttention';
import { cn } from '@/lib/utils';

// Late lab work, low stock and old unpaid balances, most urgent first. The dot only adds colour:
// every line says in words what is wrong.
export function NeedsAttention({ data }: { data: Parameters<typeof needsAttention>[0] }) {
  const items = needsAttention(data);
  return (
    <Panel title="Needs attention">
      {items.length === 0 && <PanelEmpty>Nothing needs attention</PanelEmpty>}
      <ul className="space-y-3 pt-1">
        {items.map((item) => (
          <li key={item.id} className="flex items-start gap-3 px-2">
            <span
              aria-hidden
              className={cn(
                'mt-1.5 size-2 shrink-0 rounded-full',
                item.tone === 'danger' ? 'bg-error' : 'bg-amber-600',
              )}
            />
            <div>
              <p className="text-sm font-medium text-ink">{item.title}</p>
              <p className="text-[13px] text-subtle">{item.detail}</p>
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
