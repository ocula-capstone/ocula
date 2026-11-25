import type { Reading } from '@/types/clinic';

// One eye's prescription: sphere, cylinder and axis.
export function EyeReading({ label, reading }: { label: string; reading: Reading }) {
  const [sphere, cylinder, axis] = reading;
  return (
    <div className="rounded-xl bg-page p-4">
      <h3 className="text-sm font-semibold text-ink">{label}</h3>
      <dl className="mt-3 grid grid-cols-3 gap-2">
        {[
          ['Sphere', sphere],
          ['Cylinder', cylinder],
          ['Axis', axis],
        ].map(([name, value]) => (
          <div key={name}>
            <dt className="text-sm text-subtle">{name}</dt>
            <dd className="mt-0.5 text-lg font-bold tracking-tight text-ink tabular-nums">
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
