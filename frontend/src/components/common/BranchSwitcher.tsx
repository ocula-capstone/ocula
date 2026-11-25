import { useBranch } from '@/features/branches/branch-context';
import { shortBranchName } from '@/lib/branchName';
import { cn } from '@/lib/utils';

// A picker for people who work at several branches. With one branch there is no choice to make,
// so nothing is shown, unless `pill` asks for the branch name as a plain badge (the staff top bar).
// `dark` is the version that sits on the navy drawer.
export function BranchSwitcher({ dark, pill }: { dark?: boolean; pill?: boolean }) {
  const { branches, current, setCurrent } = useBranch();
  if (!current) return null;

  if (branches.length < 2) {
    return pill ? (
      <p className="flex min-h-10 items-center rounded-xl border border-line bg-surface px-3 text-sm font-medium whitespace-nowrap text-ink">
        {shortBranchName(current.name)}
      </p>
    ) : null;
  }

  return (
    <label className="block">
      <span className="sr-only">Branch</span>
      <select
        value={current.id}
        onChange={(e) => setCurrent(e.target.value)}
        // 16px on phones so iOS does not zoom the page when the picker is tapped.
        className={cn(
          'min-h-11 w-full truncate rounded-xl border px-3 text-base font-medium outline-none focus-visible:ring-2 lg:text-sm',
          pill && 'lg:min-h-10',
          dark
            ? 'border-white/15 bg-white/5 text-white focus-visible:ring-brand-on-dark [&>option]:text-ink'
            : 'border-line bg-surface text-ink focus-visible:ring-brand-link',
        )}
      >
        {branches.map((branch) => (
          <option key={branch.id} value={branch.id}>
            {pill ? shortBranchName(branch.name) : branch.name}
          </option>
        ))}
      </select>
    </label>
  );
}
