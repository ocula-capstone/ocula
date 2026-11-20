import type { ComponentProps, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface IconFieldProps extends ComponentProps<'input'> {
  label: string;
  icon: LucideIcon;
  iconClassName?: string;
  error?: string;
  trailing?: ReactNode; // e.g. a Show/Hide button, inside the box on the right
}

export function IconField({
  label,
  icon: Icon,
  iconClassName,
  error,
  trailing,
  name,
  className,
  ...props
}: IconFieldProps) {
  const errorId = `${name}-error`;

  return (
    <div className="flex flex-col gap-[7px]">
      <Label htmlFor={name} className="text-[13px] font-medium text-[#0F1B45]">
        {label}
      </Label>
      {/* The box owns the border and focus ring; the shadcn Input inside is stripped bare. */}
      <div
        className={cn(
          'flex h-11 items-center gap-3 rounded-xl border bg-white px-3.5 transition-shadow focus-within:ring-[3px]',
          error
            ? 'border-[#DC2626] focus-within:ring-[#DC2626]/15'
            : 'border-[#DDE3EC] focus-within:border-[#2F5BE0] focus-within:ring-[rgba(47,91,224,.15)]',
        )}
      >
        <Icon
          aria-hidden
          strokeWidth={1.7}
          className={cn('size-[18px] shrink-0 text-[#7B8499]', iconClassName)}
        />
        <Input
          id={name}
          name={name}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            'h-full min-w-0 flex-1 rounded-none border-0 bg-transparent p-0 text-sm text-[#0F1B45] shadow-none placeholder:text-[#8A94A6] focus-visible:border-0 focus-visible:ring-0 aria-invalid:border-0 aria-invalid:ring-0 md:text-sm dark:bg-transparent',
            className,
          )}
          {...props}
        />
        {trailing}
      </div>
      {error && (
        <p id={errorId} className="text-xs text-[#DC2626]">
          {error}
        </p>
      )}
    </div>
  );
}
