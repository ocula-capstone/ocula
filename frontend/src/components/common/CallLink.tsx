import { outlineButton } from '@/components/common/buttons';

// "Call" that dials the number on a phone. The name is read out so each button is distinct.
export function CallLink({ phone, name }: { phone: string; name: string }) {
  return (
    <a href={`tel:${phone}`} className={outlineButton}>
      Call<span className="sr-only"> {name}</span>
    </a>
  );
}
