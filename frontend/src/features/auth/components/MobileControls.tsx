import type { ComponentProps, ReactNode } from 'react';
import { CircleAlert, Eye, EyeOff, LoaderCircle, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileFieldProps extends ComponentProps<'input'> {
  label: string;
  icon: LucideIcon;
  error?: string;
  helper?: string; // shown in the message line until there is an error
  prefix?: string; // fixed text chip (e.g. "+63") shown in place of the plain icon
  trailing?: ReactNode;
}

// Phone-width field: 54px box, 16px text (no iOS zoom). Same tokens and message line as IconField.
export function MobileField({
  label,
  icon: Icon,
  error,
  helper,
  prefix,
  trailing,
  name,
  ...props
}: MobileFieldProps) {
  const messageId = error ? `${name}-error` : helper ? `${name}-hint` : undefined;

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={name} className="text-sm font-semibold text-ink">
        {label}
      </label>
      <div
        className={cn(
          'flex h-[54px] items-center gap-3 rounded-2xl border-[1.5px] bg-white px-4 text-field-border transition focus-within:ring-4',
          error
            ? 'border-error focus-within:ring-error/15'
            : 'border-field-border focus-within:border-brand-link focus-within:ring-brand-link/15',
        )}
      >
        {prefix ? (
          <span className="-ml-4 flex items-center gap-2 self-stretch rounded-l-[14px] border-r-[1.5px] border-field-border bg-[#EEF2F7] pr-3.5 pl-4 text-sm font-semibold text-ink">
            <Icon size={18} strokeWidth={1.9} className="text-brand" aria-hidden />
            {prefix}
          </span>
        ) : (
          <Icon size={20} strokeWidth={1.8} aria-hidden className="shrink-0" />
        )}
        <input
          id={name}
          name={name}
          aria-invalid={!!error}
          aria-describedby={messageId}
          className="min-w-0 flex-1 bg-transparent text-base font-medium text-ink outline-none"
          {...props}
        />
        {trailing}
      </div>
      {/* One line is always reserved, so an error or hint never changes the form's height. */}
      <p
        id={messageId}
        className={cn(
          '-mt-1 flex min-h-4 items-start gap-1 text-[13px] leading-4',
          error ? 'font-semibold text-error' : 'text-subtle',
        )}
      >
        {error ? (
          <>
            <CircleAlert aria-hidden className="mt-px size-3.5 shrink-0" />
            {error}
          </>
        ) : (
          helper
        )}
      </p>
    </div>
  );
}

export function MobileShowToggle({
  shown,
  noun,
  onToggle,
}: {
  shown: boolean;
  noun: string;
  onToggle: () => void;
}) {
  const Icon = shown ? EyeOff : Eye;
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={`${shown ? 'Hide' : 'Show'} ${noun}`}
      className="-m-2 flex min-h-11 items-center gap-1.5 rounded-lg p-2 text-sm font-semibold text-subtle hover:text-brand-link focus-visible:ring-2 focus-visible:ring-brand-link focus-visible:outline-none"
    >
      <Icon size={18} strokeWidth={1.8} aria-hidden />
      {shown ? 'Hide' : 'Show'}
    </button>
  );
}

export function MobileSubmitButton({
  pending,
  label,
  pendingLabel,
}: {
  pending: boolean;
  label: string;
  pendingLabel: string;
}) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-3 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-brand text-base font-semibold text-white shadow-[0_2px_8px_-2px_rgba(53,96,224,0.35)] transition hover:bg-brand-hover focus-visible:ring-4 focus-visible:ring-brand/30 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending && <LoaderCircle className="size-5 animate-spin" aria-hidden />}
      {pending ? pendingLabel : label}
    </button>
  );
}
