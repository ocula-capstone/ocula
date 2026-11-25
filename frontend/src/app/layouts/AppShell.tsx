import { Bell, LogOut, Menu, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import { NAV, pageTitle } from '@/app/nav';
import { BranchSwitcher } from '@/components/common/BranchSwitcher';
import { EmptyState } from '@/components/common/EmptyState';
import { UserMenu } from '@/components/common/UserMenu';
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ROLE_HOME, useAuth } from '@/features/auth/auth-context';
import { useIsDesktop } from '@/hooks/useIsDesktop';
import { useSignOut } from '@/features/auth/useSignOut';
import { useBranch } from '@/features/branches/branch-context';
import { cn } from '@/lib/utils';
import type { Role } from '@/types/auth';

// 44px square button for the top bar.
const iconButton =
  'grid size-11 shrink-0 place-items-center rounded-xl text-ink outline-none hover:bg-page focus-visible:ring-2 focus-visible:ring-brand-link';

// The navy column: logo, menu, Settings at the bottom, then Sign Out.
// Used as the fixed sidebar on desktop and inside the drawer on phones.
function SidebarBody({
  role,
  inDrawer,
  onNavigate,
}: {
  role: Role;
  inDrawer?: boolean;
  onNavigate?: () => void;
}) {
  const { branches } = useBranch();
  const signOut = useSignOut();

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-white/10 px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-5">
        <img src="/favicon.png" alt="" className="size-10 object-contain" />
        <div>
          <p className="text-xl leading-none font-bold text-white">Ocula</p>
          <p className="mt-1 text-[9px] tracking-[0.22em] text-navy-muted uppercase">
            Optical Clinic Management
          </p>
        </div>
      </div>

      <nav aria-label="Main" className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
        {NAV[role].map(({ to, label, icon: Icon, end, bottom }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-brand-on-dark',
                bottom && 'mt-auto',
                isActive
                  ? 'bg-navy-700 font-semibold text-white [&>svg]:text-brand-on-dark'
                  : 'text-navy-muted hover:bg-white/5 hover:text-white',
              )
            }
          >
            <Icon aria-hidden className="size-5" strokeWidth={1.7} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-white/10 px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {/* The top bar hides the branch picker on phones, so the drawer carries it. */}
        {inDrawer && branches.length > 1 && (
          <div className="mb-3">
            <BranchSwitcher dark />
          </div>
        )}
        <button
          type="button"
          onClick={signOut}
          className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium text-navy-muted outline-none hover:bg-white/5 hover:text-white focus-visible:ring-2 focus-visible:ring-brand-on-dark"
        >
          <LogOut aria-hidden className="size-5" strokeWidth={1.7} />
          Sign Out
        </button>
      </div>
    </div>
  );
}

// Patients mostly use phones: their menu sits at the bottom, within thumb reach.
function PatientBottomBar() {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-20 flex border-t border-line bg-white pb-[env(safe-area-inset-bottom)]"
    >
      {NAV.patient.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            cn(
              'flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-brand-link focus-visible:ring-inset',
              isActive
                ? 'font-semibold text-brand shadow-[inset_0_3px_0_var(--color-brand)]'
                : 'text-subtle',
            )
          }
        >
          <Icon aria-hidden className="size-5" strokeWidth={1.7} />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

// The frame around every signed-in page, for all four roles.
export function AppShell() {
  const { user } = useAuth();
  const { branches, current } = useBranch();
  const { pathname } = useLocation();
  const isDesktop = useIsDesktop();
  const [menuOpen, setMenuOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const lastPath = useRef(pathname);

  // After moving to another page, put keyboard and screen-reader focus on it (not on first load).
  useEffect(() => {
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;
    mainRef.current?.focus();
  }, [pathname]);

  if (!user) return null; // RequireRole only renders this for a signed-in user.
  const { role } = user;
  const title = pageTitle(role, pathname);
  // Staff and doctors work inside a branch; with none they can only change their password.
  const blocked =
    (role === 'staff' || role === 'optometrist') &&
    !current &&
    !pathname.endsWith('/change-password');
  const isPatientPhone = role === 'patient' && !isDesktop;

  return (
    <div className="min-h-dvh bg-page lg:pl-60">
      {isDesktop && (
        <aside className="fixed inset-y-0 left-0 w-60 bg-navy-900">
          <SidebarBody role={role} />
        </aside>
      )}

      <header className="sticky top-0 z-20 flex min-h-16 items-center gap-2 border-b border-line bg-white px-3 pt-[env(safe-area-inset-top)] lg:px-8">
        {!isDesktop && role !== 'patient' && (
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger
              render={<button type="button" aria-label="Open menu" className={iconButton} />}
            >
              <Menu aria-hidden className="size-6" />
            </SheetTrigger>
            <SheetContent
              side="left"
              showCloseButton={false}
              className="gap-0 border-navy-800 bg-navy-900 p-0 text-white data-[side=left]:w-72"
            >
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <SidebarBody role={role} inDrawer onNavigate={() => setMenuOpen(false)} />
              <SheetClose
                render={
                  <button
                    type="button"
                    aria-label="Close menu"
                    className="absolute top-[max(0.5rem,env(safe-area-inset-top))] right-2 grid size-11 place-items-center rounded-xl text-navy-muted outline-none hover:text-white focus-visible:ring-2 focus-visible:ring-brand-on-dark"
                  />
                }
              >
                <X aria-hidden className="size-5" />
              </SheetClose>
            </SheetContent>
          </Sheet>
        )}

        {isDesktop ? (
          <p className="text-sm">
            <span className="text-subtle">MRB OCULA</span>
            <span aria-hidden className="mx-2 text-subtle">
              /
            </span>
            <span className="font-semibold text-ink">{title}</span>
          </p>
        ) : (
          <p className={cn('truncate font-semibold text-ink', role === 'patient' && 'pl-1')}>
            {title}
          </p>
        )}

        <div className="ml-auto flex items-center gap-2">
          {isDesktop && branches.length > 1 && (
            <div className="w-60">
              <BranchSwitcher />
            </div>
          )}
          <Link
            to={`${ROLE_HOME[role]}/notifications`}
            aria-label="Notifications"
            className={iconButton}
          >
            <Bell aria-hidden className="size-5" strokeWidth={1.7} />
          </Link>
          <UserMenu />
        </div>
      </header>

      <main
        ref={mainRef}
        tabIndex={-1}
        className={cn(
          // Phones: room at the bottom for the floating action button or the patient bar.
          'mx-auto max-w-7xl space-y-6 p-4 pb-24 outline-none lg:p-8',
          isPatientPhone && 'pb-28',
        )}
      >
        {blocked ? (
          <EmptyState
            title="No branch assigned"
            description="Ask the clinic admin to add you to MRB Pasay or Taguig. You can still change your password from the account menu."
          />
        ) : (
          <Outlet />
        )}
      </main>

      {isPatientPhone && <PatientBottomBar />}
    </div>
  );
}
