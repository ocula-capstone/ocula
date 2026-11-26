import { Bell, LogOut, Menu, X } from 'lucide-react';
import { Fragment, useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import { NAV, pageTitle } from '@/app/nav';
import { BranchSwitcher } from '@/components/common/BranchSwitcher';
import { EmptyState } from '@/components/common/EmptyState';
import { UndoToastHost } from '@/components/common/UndoToast';
import { UserMenu } from '@/components/common/UserMenu';
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ROLE_HOME, useAuth } from '@/features/auth/auth-context';
import { useIsDesktop } from '@/hooks/useIsDesktop';
import { useSlideTo } from '@/hooks/useSlideTo';
import { useSignOut } from '@/features/auth/useSignOut';
import { useBranch } from '@/features/branches/branch-context';
import { branchCardText } from '@/lib/branchName';
import { useApplyTheme } from '@/lib/theme';
import { cn } from '@/lib/utils';
import { recalls, unreadNotifications } from '@/mocks/data/samples';
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
  badges = {},
}: {
  role: Role;
  inDrawer?: boolean;
  onNavigate?: () => void;
  // A count shown on a menu item, by its address, e.g. overdue recalls.
  badges?: Record<string, number>;
}) {
  const { branches, current } = useBranch();
  const signOut = useSignOut();
  const isStaff = role === 'staff';
  const navRef = useRef<HTMLElement>(null);
  const { pathname } = useLocation();
  const slide = useSlideTo(navRef, '[aria-current="page"]', [pathname, role]);

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

      <nav
        ref={navRef}
        aria-label="Main"
        className="relative flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4"
      >
        {/* The current page's highlight: one block that slides to the item you pick. */}
        <span
          aria-hidden
          style={slide.style}
          className={cn(
            'pointer-events-none absolute top-0 left-0 rounded-xl bg-navy-700',
            slide.animate &&
              'transition-[transform,width,height,opacity] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none',
          )}
        />
        {NAV[role].map(({ to, label, icon: Icon, end, bottom, group }, index) => (
          <Fragment key={to}>
            {/* The group name appears once, above the first item of the group. */}
            {group && group !== NAV[role][index - 1]?.group && (
              <p className="px-3 pt-4 pb-1 text-xs font-semibold tracking-wider text-navy-dim uppercase">
                {group}
              </p>
            )}
            <NavLink
              to={to}
              end={end}
              onClick={onNavigate}
              // The count is part of the name, so screen readers say "Recalls (3 overdue)".
              aria-label={badges[to] > 0 ? `${label} (${badges[to]} overdue)` : undefined}
              className={({ isActive }) =>
                cn(
                  'relative flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-brand-on-dark lg:min-h-10',
                  bottom && 'mt-auto',
                  isActive
                    ? 'font-semibold text-white [&>svg]:text-brand-on-dark'
                    : 'text-navy-muted hover:bg-white/5 hover:text-white',
                )
              }
            >
              {Icon && <Icon aria-hidden className="size-5" strokeWidth={1.7} />}
              {label}
              {badges[to] > 0 && (
                <span
                  aria-hidden
                  className="ml-auto grid min-w-5 place-items-center rounded-full bg-amber-700 px-1.5 text-xs font-bold text-white"
                >
                  {badges[to]}
                </span>
              )}
            </NavLink>
          </Fragment>
        ))}
      </nav>

      <div className="border-t border-white/10 px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {/* The top bar hides the branch picker on phones, so the drawer carries it. */}
        {inDrawer && branches.length > 1 && (
          <div className="mb-3">
            <BranchSwitcher dark />
          </div>
        )}
        {isStaff ? (
          // Staff: the branch they are working in. Settings and Sign Out are in the account menu.
          current && <BranchCard name={current.name} />
        ) : (
          <button
            type="button"
            onClick={signOut}
            className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium text-navy-muted outline-none hover:bg-white/5 hover:text-white focus-visible:ring-2 focus-visible:ring-brand-on-dark"
          >
            <LogOut aria-hidden className="size-5" strokeWidth={1.7} />
            Sign Out
          </button>
        )}
      </div>
    </div>
  );
}

// The staff sidebar's last block: the clinic and branch being worked in, e.g. "MRB Optical Clinic".
function BranchCard({ name }: { name: string }) {
  const { mark, title, sub } = branchCardText(name);
  return (
    <div className="flex items-center gap-3 px-1 py-1">
      <span
        aria-hidden
        className="grid size-9 shrink-0 place-items-center rounded-lg bg-navy-700 text-[13px] font-semibold text-white"
      >
        {mark}
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-white">{title}</p>
        {sub && <p className="text-[13px] text-navy-muted">{sub}</p>}
      </div>
    </div>
  );
}

// Patients mostly use phones: their menu sits at the bottom, within thumb reach.
function PatientBottomBar() {
  const ref = useRef<HTMLElement>(null);
  const { pathname } = useLocation();
  const slide = useSlideTo(ref, '[aria-current="page"]', [pathname]);
  return (
    <nav
      ref={ref}
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-20 flex border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]"
    >
      {/* The current page's bar: one line that slides along the top to the item you pick. */}
      <span
        aria-hidden
        style={{ ...slide.style, height: 3 }}
        className={cn(
          'pointer-events-none absolute top-0 left-0 rounded-b-full bg-brand',
          slide.animate &&
            'transition-[transform,width,opacity] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none',
        )}
      />
      {NAV.patient.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            cn(
              'flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-brand-link focus-visible:ring-inset',
              'transition-colors duration-200',
              isActive ? 'font-semibold text-brand-text' : 'text-subtle',
            )
          }
        >
          {Icon && <Icon aria-hidden className="size-5" strokeWidth={1.7} />}
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

// The frame around every signed-in page, for all four roles.
export function AppShell() {
  useApplyTheme();
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

  const role = user?.role;
  const title = role ? pageTitle(role, pathname) : '';

  // The browser tab, history and screen readers say which page this is: "Patients · OCULA".
  useEffect(() => {
    if (!title) return;
    document.title = `${title} · OCULA`;
    return () => {
      document.title = 'OCULA';
    };
  }, [title]);

  if (!user || !role) return null; // RequireRole only renders this for a signed-in user.
  // Staff and doctors work inside a branch; with none they can only change their password.
  const blocked =
    (role === 'staff' || role === 'optometrist') &&
    !current &&
    !pathname.endsWith('/change-password');
  const isPatientPhone = role === 'patient' && !isDesktop;
  const isStaff = role === 'staff';
  // Staff see how many recalls are overdue right on the menu.
  const overdue = recalls.filter((r) => r.status === 'Overdue').length;
  const badges: Record<string, number> = isStaff ? { '/staff/recalls': overdue } : {};

  return (
    <div className="min-h-dvh bg-page lg:pl-60">
      {isDesktop && (
        <aside className="fixed inset-y-0 left-0 w-60 bg-navy-900">
          <SidebarBody role={role} badges={badges} />
        </aside>
      )}

      <header className="sticky top-0 z-20 border-b border-line bg-surface pt-[env(safe-area-inset-top)]">
        {/* Same column and side gutter as <main>, so the bar lines up with the page below it. */}
        <div className="mx-auto flex min-h-16 max-w-[1600px] items-center gap-3 px-4 lg:min-h-[4.5rem] lg:gap-4 lg:px-6 xl:px-8">
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
                <SidebarBody
                  role={role}
                  inDrawer
                  badges={badges}
                  onNavigate={() => setMenuOpen(false)}
                />
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

          {isStaff && isDesktop ? (
            // Staff on a laptop: the branch they are working in. Searching patients is on the
            // Patient records page, so there is no search box up here.
            <div className="shrink-0">
              <BranchSwitcher pill />
            </div>
          ) : isDesktop ? (
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

          <div className="ml-auto flex items-center gap-2 lg:gap-3">
            {isDesktop && !isStaff && branches.length > 1 && (
              <div className="w-60">
                <BranchSwitcher />
              </div>
            )}
            <Link
              to={`${ROLE_HOME[role]}/notifications`}
              aria-label={
                unreadNotifications > 0
                  ? `Notifications, ${unreadNotifications} unread`
                  : 'Notifications'
              }
              className={cn(iconButton, 'relative')}
            >
              <Bell aria-hidden className="size-5" strokeWidth={1.7} />
              {unreadNotifications > 0 && (
                <span
                  aria-hidden
                  className="absolute top-2.5 right-2.5 size-2 rounded-full bg-error ring-2 ring-surface"
                />
              )}
            </Link>
            <UserMenu />
          </div>
        </div>
      </header>

      <main
        ref={mainRef}
        tabIndex={-1}
        className={cn(
          // Phones: room at the bottom for the patient bar.
          'mx-auto max-w-[1600px] space-y-6 p-4 outline-none lg:p-6 xl:p-8',
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
      <UndoToastHost />
    </div>
  );
}
