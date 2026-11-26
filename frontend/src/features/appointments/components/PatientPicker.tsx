import { Plus, Search } from 'lucide-react';
import { useState } from 'react';
import { Avatar } from '@/components/common/Avatar';
import { outlineButton, textLink } from '@/components/common/buttons';
import { matchesSearch } from '@/lib/search';
import { patients } from '@/mocks/data/samples';

// Who the visit is for: a saved patient record, or a new one typed in on the spot.
export interface PatientChoice {
  // The record's id ("P-001284"); missing for a patient added here, which gets one when saved.
  id?: string;
  name: string;
  phone?: string;
}

const field =
  'min-h-12 w-full rounded-xl border border-field-border bg-surface px-3.5 text-sm text-ink outline-none placeholder:text-placeholder focus-visible:ring-2 focus-visible:ring-brand-link';

// The patient step of booking. Search finds records by name, phone or P-number; the picked one
// becomes a card with "Change". "New patient" makes a record only (no portal login). A visit
// being moved keeps its patient (`locked`).
export function PatientPicker({
  value,
  onChange,
  locked,
}: {
  value: PatientChoice | null;
  onChange: (value: PatientChoice | null) => void;
  locked?: boolean;
}) {
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState(false);
  const [phone, setPhone] = useState('');
  // Picking someone clears the search, so "Change" starts from an empty box.
  const pick = (choice: PatientChoice) => {
    setQuery('');
    setPhone('');
    onChange(choice);
  };
  const matches = query.trim()
    ? patients.filter((p) => matchesSearch(query, p.name, p.phone, p.id)).slice(0, 5)
    : [];

  if (value) {
    return (
      <div className="flex min-h-[104px] items-center gap-3 rounded-xl border border-line p-4">
        <Avatar name={value.name} className="size-10" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">{value.name}</p>
          {(value.id ?? !locked) && (
            <p className="text-[13px] whitespace-nowrap text-subtle">{value.id ?? 'New patient'}</p>
          )}
          {value.phone && (
            <p className="text-[13px] whitespace-nowrap text-subtle">{value.phone}</p>
          )}
        </div>
        {!locked && (
          <button type="button" className={textLink} onClick={() => onChange(null)}>
            Change
          </button>
        )}
      </div>
    );
  }

  if (adding) {
    return (
      <div className="flex flex-col gap-4 rounded-xl border border-line p-4">
        <label className="flex flex-col gap-2 text-sm font-semibold text-ink">
          Full name
          <input
            className={field}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </label>
        <label className="flex flex-col gap-2 text-sm font-semibold text-ink">
          <span>
            Mobile number <span className="font-normal text-subtle">(optional)</span>
          </span>
          <input
            className={field}
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </label>
        <div className="flex flex-col items-start gap-1">
          <button
            type="button"
            className={`${outlineButton} w-full whitespace-nowrap disabled:opacity-50`}
            disabled={!query.trim()}
            onClick={() => pick({ name: query.trim(), phone: phone.trim() || undefined })}
          >
            Use this patient
          </button>
          <button type="button" className={textLink} onClick={() => setAdding(false)}>
            Back to search
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[104px] flex-col gap-3">
      <span className="relative block">
        <Search
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-subtle"
        />
        <input
          className={`${field} pl-10`}
          aria-label="Search patients"
          placeholder="Name, phone or P-number"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
        />
        {query.trim() && (
          // Floats over what is below, so the fields under the patient never move.
          <div className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-line bg-surface shadow-lg">
            {matches.length > 0 ? (
              <ul className="divide-y divide-line">
                {matches.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => pick({ id: p.id, name: p.name, phone: p.phone })}
                      className="flex min-h-14 w-full items-center gap-3 px-4 py-2.5 text-left outline-none hover:bg-page focus-visible:bg-page"
                    >
                      <Avatar name={p.name} />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-ink">
                          {p.name}
                        </span>
                        <span className="block text-[13px] whitespace-nowrap text-subtle">
                          {p.id}
                        </span>
                        <span className="block text-[13px] whitespace-nowrap text-subtle">
                          {p.phone}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-4 py-3 text-sm text-subtle">No patient found.</p>
            )}
          </div>
        )}
      </span>
      <button
        type="button"
        className={`${textLink} self-start gap-1.5`}
        onClick={() => setAdding(true)}
      >
        <Plus aria-hidden className="size-4" />
        New patient
      </button>
    </div>
  );
}
