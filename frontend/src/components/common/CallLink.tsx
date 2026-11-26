import { Phone } from 'lucide-react';
import { iconOutlineButton, outlineButton } from '@/components/common/buttons';

// Dials the number on a phone. The text button says "Call"; the icon button is a square with a
// phone, for tight rows. Either way the person's name is part of the accessible name.
export function CallLink({ phone, name, icon }: { phone: string; name: string; icon?: boolean }) {
  if (icon) {
    return (
      <a href={`tel:${phone}`} aria-label={`Call ${name}`} className={iconOutlineButton}>
        <Phone aria-hidden className="size-[18px]" strokeWidth={1.8} />
      </a>
    );
  }
  return (
    <a href={`tel:${phone}`} className={outlineButton}>
      Call<span className="sr-only"> {name}</span>
    </a>
  );
}
