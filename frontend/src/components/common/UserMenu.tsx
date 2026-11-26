import { ChevronDown, LogOut, Moon, Settings } from 'lucide-react';
import { Link } from 'react-router';
import { Avatar } from '@/components/common/Avatar';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ROLE_HOME, useAuth } from '@/features/auth/auth-context';
import { useSignOut } from '@/features/auth/useSignOut';
import { useTheme } from '@/lib/theme';

const menuItemClass =
  'min-h-12 gap-3 rounded-lg px-4 text-sm font-medium focus:bg-page lg:min-h-11';

// The account button at the top right. Its menu says who is signed in, then Settings and Sign out.
// Changing the password lives on Settings.
export function UserMenu() {
  const { user } = useAuth();
  const signOut = useSignOut();
  const [theme, setTheme] = useTheme();
  if (!user) return null;
  const home = ROLE_HOME[user.role];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            aria-label="Account menu"
            className="group flex items-center gap-3 rounded-full border border-transparent p-1.5 outline-none hover:bg-page focus-visible:ring-2 focus-visible:ring-brand-link aria-expanded:border-brand lg:border-line lg:py-2 lg:pr-5 lg:pl-2.5"
          />
        }
      >
        <Avatar name={user.fullName} tone="solid" className="size-10 text-sm" />
        <span aria-hidden className="hidden text-sm font-semibold text-ink lg:block">
          {user.fullName}
        </span>
        <ChevronDown
          aria-hidden
          className="hidden size-4 text-subtle transition-transform group-aria-expanded:rotate-180 motion-reduce:transition-none lg:block"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center gap-4 rounded-t-lg bg-page/60 p-5">
          <Avatar name={user.fullName} tone="solid" className="size-14 text-lg" />
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-ink">{user.fullName}</p>
            {user.email && <p className="truncate text-sm text-subtle">{user.email}</p>}
          </div>
        </div>
        <DropdownMenuSeparator className="m-0" />
        <div className="flex flex-col gap-1 p-2">
          <DropdownMenuItem
            className={`${menuItemClass} text-ink`}
            render={<Link to={`${home}/settings`} />}
          >
            <Settings aria-hidden /> Settings
          </DropdownMenuItem>
          {/* A switch row: the menu stays open so the change can be seen. */}
          <DropdownMenuCheckboxItem
            className={`${menuItemClass} group/switch text-ink [&>[data-slot$=indicator]]:hidden`}
            checked={theme === 'dark'}
            onCheckedChange={(on) => setTheme(on ? 'dark' : 'light')}
          >
            <Moon aria-hidden /> Dark mode
            <span
              aria-hidden
              className="ml-auto flex h-6 w-10 shrink-0 items-center rounded-full bg-field-border p-0.5 transition-colors group-data-checked/switch:bg-brand motion-reduce:transition-none"
            >
              <span className="size-5 rounded-full bg-white shadow-sm transition-transform group-data-checked/switch:translate-x-4 motion-reduce:transition-none" />
            </span>
          </DropdownMenuCheckboxItem>
        </div>
        <DropdownMenuSeparator className="m-0" />
        <div className="p-2">
          <DropdownMenuItem
            className={`${menuItemClass} text-error focus:text-error`}
            onClick={signOut}
          >
            <LogOut aria-hidden /> Sign out
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
