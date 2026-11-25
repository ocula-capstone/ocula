import { KeyRound, LogOut, Settings } from 'lucide-react';
import { Link } from 'react-router';
import { ROLE_LABEL } from '@/app/nav';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ROLE_HOME, useAuth } from '@/features/auth/auth-context';
import { useSignOut } from '@/features/auth/useSignOut';
import { initials } from '@/lib/initials';

const menuItemClass = 'min-h-11 gap-3 px-3 text-sm text-ink';

// The avatar at the top right. For patients on a phone (no sidebar or drawer) it is the only way to reach these.
export function UserMenu() {
  const { user } = useAuth();
  const signOut = useSignOut();
  if (!user) return null;
  const home = ROLE_HOME[user.role];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            aria-label="Account menu"
            className="flex min-h-11 items-center gap-3 rounded-xl px-1 outline-none hover:bg-page focus-visible:ring-2 focus-visible:ring-brand-link lg:border-l lg:border-line lg:pl-4"
          />
        }
      >
        <span
          aria-hidden
          className="grid size-10 shrink-0 place-items-center rounded-full bg-brand text-sm font-semibold text-white"
        >
          {initials(user.fullName)}
        </span>
        <span aria-hidden className="hidden text-left leading-tight lg:block">
          <span className="block text-sm font-semibold text-ink">{user.fullName}</span>
          <span className="block text-xs text-subtle">{ROLE_LABEL[user.role]}</span>
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="px-3 py-2 text-sm text-subtle">
            {user.fullName}
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuItem className={menuItemClass} render={<Link to={`${home}/settings`} />}>
          <Settings aria-hidden /> Settings
        </DropdownMenuItem>
        <DropdownMenuItem
          className={menuItemClass}
          render={<Link to={`${home}/change-password`} />}
        >
          <KeyRound aria-hidden /> Change password
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className={menuItemClass} onClick={signOut}>
          <LogOut aria-hidden /> Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
