import { initials } from '@/lib/initials';
import { cn } from '@/lib/utils';

// A circle with a person's initials. Soft blue is for patients and visitors on the staff screens,
// grey for the quieter lists, solid blue for the signed-in user. Decorative: the name is always written next to it.
const TONES = {
  brand: 'bg-brand/10 text-brand-text',
  neutral: 'bg-page text-ink',
  solid: 'bg-brand text-white',
};

export function Avatar({
  name,
  tone = 'brand',
  className,
}: {
  name: string;
  tone?: 'brand' | 'neutral' | 'solid';
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        'grid size-9 shrink-0 place-items-center rounded-full text-[13px] font-semibold',
        TONES[tone],
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
