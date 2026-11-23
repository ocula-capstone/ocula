import type { ComponentProps, ReactNode } from 'react';
import { CircleAlert, type LucideIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface IconFieldProps extends ComponentProps<'input'> {
  label: string;
  icon: LucideIcon;
  iconClassName?: string;
  error?: string;
  helper?: string; // shown in the message line until there is an error
  prefix?: string; // fixed text chip (e.g. "+63") shown in place of the plain icon
  trailing?: ReactNode; // e.g. a Show/Hide button, inside the box on the right
}

export function IconField({
  label,
  icon: Icon,
  iconClassName,
  error,
  helper,
  prefix,
  trailing,
  name,
  className,
  ...props
}: IconFieldProps) {
  const messageId = error ? `${name}-error` : helper ? `${name}-hint` : undefined;

  return (
    <div className="flex min-w-0 flex-col gap-[7px]">
      <Label htmlFor={name} className="text-[13px] font-medium text-ink">
        {label}
      </Label>
      {/* The box owns the border and focus ring; the shadcn Input inside is stripped bare. */}
      <div
        className={cn(
          'flex h-11 items-center gap-3 rounded-xl border bg-white px-3.5 transition-shadow focus-within:ring-[3px]',
          error
            ? 'border-error focus-within:ring-error/15'
            : 'border-field-border focus-within:border-brand-link focus-within:ring-brand-link/15',
        )}
      >
        {prefix ? (
          <span className="-ml-3.5 flex items-center gap-1.5 self-stretch rounded-l-[11px] border-r border-field-border bg-[#EEF2F7] pr-3 pl-3.5 text-[13px] font-semibold text-ink">
            <Icon aria-hidden strokeWidth={1.8} className="size-4 text-brand" />
            {prefix}
          </span>
        ) : (
          <Icon
            aria-hidden
            strokeWidth={1.7}
            className={cn('size-[18px] shrink-0 text-field-border', iconClassName)}
          />
        )}
        <Input
          id={name}
          name={name}
          aria-invalid={!!error}
          aria-describedby={messageId}
          className={cn(
            'h-full min-w-0 flex-1 rounded-none border-0 bg-transparent p-0 text-sm text-ink shadow-none placeholder:text-placeholder focus-visible:border-0 focus-visible:ring-0 aria-invalid:border-0 aria-invalid:ring-0 md:text-sm dark:bg-transparent',
            className,
          )}
          {...props}
        />
        {trailing}
      </div>
      {/* One line is always reserved, so an error or hint never changes the form's height. */}
      <p
        id={messageId}
        className={cn(
          '-mt-1 flex min-h-4 items-start gap-1 text-xs leading-4',
          error ? 'text-error' : 'text-subtle',
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
