import { useState } from 'react';
import { Link } from 'react-router';
import { ROLE_LABEL } from '@/app/nav';
import { outlineButton } from '@/components/common/buttons';
import { PageHeader } from '@/components/common/PageHeader';
import { Panel } from '@/components/common/Panel';
import { ROLE_HOME, useAuth } from '@/features/auth/auth-context';
import { useBranch } from '@/features/branches/branch-context';
import { cn } from '@/lib/utils';
import type { Role } from '@/types/auth';

const ALERTS: Record<Role, { id: string; label: string; hint: string }[]> = {
  staff: [
    { id: 'recall', label: 'Recall alerts', hint: 'When a recall becomes overdue.' },
    { id: 'stock', label: 'Low stock alerts', hint: 'When an item drops to its minimum.' },
    { id: 'job', label: 'Job order ready', hint: 'When glasses come back from the lab.' },
  ],
  optometrist: [
    {
      id: 'schedule',
      label: 'Schedule changes',
      hint: 'When a visit is booked, moved or cancelled.',
    },
    { id: 'scan', label: 'Scans to review', hint: 'When an auto-refractor scan needs your check.' },
  ],
  admin: [{ id: 'stock', label: 'Low stock alerts', hint: 'When an item drops to its minimum.' }],
  patient: [
    { id: 'appointment', label: 'Appointment reminders', hint: 'The day before your visit.' },
    { id: 'follow-up', label: 'Follow-up reminders', hint: 'When it is time to come back.' },
  ],
};

// Who you are, your password, and what we notify you about.
export function SettingsPage() {
  const { user } = useAuth();
  const { branches } = useBranch();
  // shortcut: kept for this visit only; saved once the notification-settings API exists.
  const [mutedAlerts, setMutedAlerts] = useState<string[]>([]);
  if (!user) return null;

  const rows: [string, string][] = [
    ['Full name', user.fullName],
    ['Phone', user.phone ?? 'Not set'],
    ['Email', user.email ?? 'Not set'],
    ['Role', ROLE_LABEL[user.role]],
  ];
  if (user.role !== 'patient') {
    rows.push(['Branches', branches.map((b) => b.name).join(', ') || 'None yet']);
  }

  return (
    <>
      <PageHeader title="Settings" description="Your account and preferences" />
      <div className="grid items-start gap-4 lg:grid-cols-5">
        <Panel title="Profile" className="lg:col-span-3">
          <dl className="divide-y divide-line">
            {rows.map(([label, value]) => (
              <div
                key={label}
                className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-3"
              >
                <dt className="text-sm text-subtle">{label}</dt>
                <dd className="text-sm font-medium break-all text-ink">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-2 text-sm text-subtle">
            To change your name or phone number, ask the clinic admin.
          </p>
        </Panel>
        <div className="space-y-4 lg:col-span-2">
          <Panel title="Password">
            <p className="text-sm text-subtle">
              Choose a new password. You stay signed in on this device.
            </p>
            <Link
              to={`${ROLE_HOME[user.role]}/change-password`}
              className={cn(outlineButton, 'mt-3 w-full sm:w-auto')}
            >
              Change password
            </Link>
          </Panel>
          <Panel title="Notifications">
            <ul className="divide-y divide-line">
              {ALERTS[user.role].map((alert) => (
                <li key={alert.id}>
                  <label className="flex min-h-11 cursor-pointer items-start gap-3 py-3">
                    <input
                      type="checkbox"
                      checked={!mutedAlerts.includes(alert.id)}
                      onChange={(e) =>
                        setMutedAlerts(
                          e.target.checked
                            ? mutedAlerts.filter((id) => id !== alert.id)
                            : [...mutedAlerts, alert.id],
                        )
                      }
                      className="mt-0.5 size-5 shrink-0 accent-brand"
                    />
                    <span>
                      <span className="block text-sm font-medium text-ink">{alert.label}</span>
                      <span className="block text-[13px] text-subtle">{alert.hint}</span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </>
  );
}
