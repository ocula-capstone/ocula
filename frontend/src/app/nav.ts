import {
  BarChart3,
  Building2,
  CalendarDays,
  Camera,
  ClipboardCheck,
  ClipboardList,
  Eye,
  Glasses,
  LayoutDashboard,
  Package,
  Receipt,
  ScrollText,
  Settings,
  UserCog,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { Role } from '@/types/auth';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  // Only marked current on its exact address (the dashboard), not on pages below it.
  end?: boolean;
  // Pinned to the bottom of the sidebar (Settings).
  bottom?: boolean;
}

// Each role's menu, in order. Settings is last and marked `bottom`: the sidebar pins it there.
// Notifications has no item: the bell in the top bar opens it.
export const NAV: Record<Role, NavItem[]> = {
  staff: [
    { to: '/staff', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/staff/patients', label: 'Patient Records', icon: Users },
    { to: '/staff/appointments', label: 'Appointments', icon: CalendarDays },
    { to: '/staff/billing', label: 'Billing', icon: Receipt },
    { to: '/staff/job-orders', label: 'Job Orders', icon: ClipboardList },
    { to: '/staff/auto-refractor', label: 'Auto-Refractor', icon: Camera },
    { to: '/staff/recalls', label: 'Recalls & Follow-up', icon: ClipboardCheck },
    { to: '/staff/inventory', label: 'Inventory', icon: Package },
    { to: '/staff/settings', label: 'Settings', icon: Settings, bottom: true },
  ],
  optometrist: [
    { to: '/doctor', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/doctor/patients', label: 'Patient Records', icon: Users },
    { to: '/doctor/auto-refractor', label: 'Auto-Refractor', icon: Camera },
    { to: '/doctor/inventory', label: 'Inventory', icon: Package },
    { to: '/doctor/reports', label: 'EOD Report', icon: BarChart3 },
    { to: '/doctor/settings', label: 'Settings', icon: Settings, bottom: true },
  ],
  admin: [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/admin/users', label: 'Users', icon: UserCog },
    { to: '/admin/branches', label: 'Branches', icon: Building2 },
    { to: '/admin/inventory', label: 'Inventory', icon: Package },
    { to: '/admin/reports', label: 'Reports', icon: BarChart3 },
    { to: '/admin/audit-log', label: 'Audit Log', icon: ScrollText },
    { to: '/admin/settings', label: 'Settings', icon: Settings, bottom: true },
  ],
  patient: [
    { to: '/me', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/me/records', label: 'My Records', icon: Eye },
    { to: '/me/frame-finder', label: 'Frame Finder', icon: Glasses },
    { to: '/me/settings', label: 'Settings', icon: Settings, bottom: true },
  ],
};

export const ROLE_LABEL: Record<Role, string> = {
  admin: 'Administrator',
  staff: 'Clinic Staff',
  optometrist: 'Optometrist',
  patient: 'Patient',
};

// Pages that live in every area but are not in the menu.
const EXTRA_PAGES: Record<string, string> = {
  notifications: 'Notifications',
  'change-password': 'Change password',
  // Patient pages linked from their dashboard, not from the menu.
  appointments: 'My appointments',
  prescriptions: 'My prescriptions',
};

// The page name for the top bar: the most specific menu item that matches, else an extra page.
export function pageTitle(role: Role, pathname: string): string {
  const path = pathname.replace(/\/+$/, '') || '/';
  const match = NAV[role]
    .filter((item) => path === item.to || (!item.end && path.startsWith(`${item.to}/`)))
    .sort((a, b) => b.to.length - a.to.length)[0];
  return match?.label ?? EXTRA_PAGES[path.split('/').pop() ?? ''] ?? NAV[role][0].label;
}
