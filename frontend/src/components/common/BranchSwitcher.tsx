import { useBranch } from '@/features/branches/branch-context';
import { cn } from '@/lib/utils';

// A picker for people who work at several branches; nothing when there is no choice to make.
// `dark` is the version that sits on the navy drawer.
export function BranchSwitcher({ dark }: { dark?: boolean }) {
  const { branches, current, setCurrent } = useBranch();
  if (!current || branches.length < 2) return null;

  return (
    <label className="block">
      <span className="sr-only">Branch</span>
      <select
        value={current.id}
        onChange={(e) => setCurrent(e.target.value)}
        // 16px on phones so iOS does not zoom the page when the picker is tapped.
        className={cn(
          'min-h-11 w-full truncate rounded-xl border px-3 text-base font-medium outline-none focus-visible:ring-2 lg:text-sm',
          dark
            ? 'border-white/15 bg-white/5 text-white focus-visible:ring-brand-on-dark [&>option]:text-ink'
            : 'border-line bg-white text-ink focus-visible:ring-brand-link',
        )}
      >
        {branches.map((branch) => (
          <option key={branch.id} value={branch.id}>
            {branch.name}
          </option>
        ))}
      </select>
    </label>
  );
}
