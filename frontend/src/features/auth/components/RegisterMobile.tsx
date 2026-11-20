import { useState, type ComponentProps, type ReactNode } from 'react';
import { Check, Eye, Lock, Mail, Phone, User } from 'lucide-react';
import { Link } from 'react-router';
import type { RegisterForm } from '@/features/auth/useRegisterForm';
import { cn } from '@/lib/utils';

// The Ocula logo: the same image as the browser-tab icon.
const LOGO_SRC = '/favicon.png';

const iconProps = { size: 20, strokeWidth: 1.8, 'aria-hidden': true } as const;

const fieldBase =
  'flex h-[54px] items-center gap-3 rounded-2xl border-[1.5px] px-4 text-slate-500 transition focus-within:border-[#3563E9] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#3563E9]/[.14]';
const fieldOk = 'border-slate-200 bg-slate-50 hover:border-slate-300';
const fieldErr =
  'border-rose-600 bg-[#FFF8F9] focus-within:border-rose-600! focus-within:ring-rose-600/15!';
const inputCls =
  'min-w-0 flex-1 bg-transparent text-base font-medium text-slate-900 outline-none placeholder:text-slate-500';
const labelCls = 'text-sm font-bold text-slate-800';
const errCls = 'text-[13px] font-semibold text-rose-700';

interface FieldProps extends ComponentProps<'input'> {
  label: string;
  error?: string;
  leading: ReactNode;
  trailing?: ReactNode;
  errorBesideLabel?: boolean;
}

function Field({ label, error, leading, trailing, errorBesideLabel, name, ...props }: FieldProps) {
  const errorId = `${name}-err`;
  const errorEl = error ? (
    <p id={errorId} role={errorBesideLabel ? 'alert' : undefined} className={errCls}>
      {error}
    </p>
  ) : null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={name} className={labelCls}>
          {label}
        </label>
        {errorBesideLabel && errorEl}
      </div>
      <div className={cn(fieldBase, error ? fieldErr : fieldOk)}>
        {leading}
        <input
          id={name}
          name={name}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          className={inputCls}
          {...props}
        />
        {trailing}
      </div>
      {!errorBesideLabel && errorEl}
    </div>
  );
}

function ShowToggle({
  shown,
  noun,
  onToggle,
}: {
  shown: boolean;
  noun: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={`${shown ? 'Hide' : 'Show'} ${noun}`}
      className="-m-2 flex min-h-11 items-center gap-1.5 rounded-lg p-2 text-sm font-semibold text-slate-500 hover:text-[#3563E9] focus-visible:ring-2 focus-visible:ring-[#3563E9] focus-visible:outline-none"
    >
      <Eye size={18} strokeWidth={1.8} aria-hidden />
      {shown ? 'Hide' : 'Show'}
    </button>
  );
}

// Phone-width view: a navy header and a white sheet with rounded top corners.
// Under 640px it fills the screen; from 640px up it is a centered 475px card.
export function RegisterMobile({ form }: { form: RegisterForm }) {
  const {
    register,
    formState: { errors, isSubmitting },
    formError,
    onSubmit,
  } = form;
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <div className="flex min-h-dvh items-stretch justify-center bg-[#0C1530] font-jakarta sm:items-center sm:bg-[#E9EEF6] sm:px-6 sm:py-12">
      <div className="relative flex w-full flex-col overflow-hidden bg-[#0C1530] sm:max-w-[475px] sm:rounded-[32px] sm:shadow-[0_32px_70px_-28px_rgba(12,21,48,0.5)]">
        {/* decorative circles */}
        <div
          aria-hidden
          className="absolute -top-[190px] -right-[170px] size-[400px] rounded-full bg-[#111D45]"
        />
        <div
          aria-hidden
          className="absolute -top-[210px] -right-[200px] size-[360px] rounded-full bg-[#13224F]"
        />

        {/* navy header */}
        <header className="relative flex flex-col gap-5 px-6 pt-6 pb-5 sm:px-9">
          <div className="flex items-center gap-[13px]">
            <img src={LOGO_SRC} alt="" className="size-[40px] object-contain" />
            <div className="flex flex-col gap-[5px]">
              <span className="font-poppins text-[18px] leading-none font-bold tracking-[-0.01em] text-white">
                Ocula
              </span>
              <span className="text-[8.5px] font-medium tracking-[0.18em] text-[#A9B4C8] uppercase">
                Optical Clinic Management
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {/* a <p>, not a heading: the page's single <h1> is the title in the white sheet */}
            <p className="font-poppins text-[26px] leading-[1.15] font-bold tracking-[-0.01em] text-white">
              Your vision, <span className="text-[#4A7BFF]">our priority.</span>
            </p>
            <p className="text-sm leading-relaxed text-[#A9B4C8]">
              Create an account to access prescriptions &amp; book visits.
            </p>
          </div>
        </header>

        {/* white sheet */}
        <main className="relative flex flex-1 flex-col gap-7 rounded-t-[32px] bg-white px-6 pt-10 pb-9 sm:px-9">
          <div className="flex flex-col gap-1.5">
            <h1 className="font-poppins text-[28px] leading-[1.15] font-bold tracking-[-0.01em] text-[#0E1733]">
              Create Patient Account
            </h1>
            <p className="text-[15px] leading-normal text-slate-500">
              Join MRB Optical Clinic's patient portal.
            </p>
          </div>

          {formError && (
            <div
              role="alert"
              className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700"
            >
              {formError}
            </div>
          )}

          <form onSubmit={onSubmit} noValidate className="flex flex-col gap-[18px]">
            <Field
              label="Full Name"
              leading={<User {...iconProps} />}
              autoComplete="name"
              placeholder="e.g. Maria Santos"
              error={errors.fullName?.message}
              {...register('fullName')}
            />
            <Field
              label="Email Address"
              leading={<Mail {...iconProps} />}
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              error={errors.email?.message}
              {...register('email')}
            />
            <Field
              label="Contact Number"
              leading={
                <span className="-ml-4 flex items-center gap-2 self-stretch rounded-l-[14px] border-r-[1.5px] border-slate-200 bg-[#EEF2F7] pr-3.5 pl-4 text-sm font-bold text-slate-800">
                  <Phone size={18} strokeWidth={1.9} className="text-[#3563E9]" aria-hidden />
                  +63
                </span>
              }
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              placeholder="9XX XXX XXXX"
              error={errors.phone?.message}
              {...register('phone')}
            />
            <Field
              label="Password"
              leading={<Lock {...iconProps} />}
              type={showPw ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="At least 8 characters"
              error={errors.password?.message}
              trailing={
                <ShowToggle shown={showPw} noun="password" onToggle={() => setShowPw((s) => !s)} />
              }
              // re-check the confirm field whenever the password changes
              {...register('password', { deps: ['confirmPassword'] })}
            />
            <Field
              label="Confirm Password"
              errorBesideLabel
              leading={<Check {...iconProps} />}
              type={showConfirm ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Re-enter your password"
              error={errors.confirmPassword?.message}
              trailing={
                <ShowToggle
                  shown={showConfirm}
                  noun="confirm password"
                  onToggle={() => setShowConfirm((s) => !s)}
                />
              }
              {...register('confirmPassword')}
            />

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-1.5 h-14 w-full rounded-2xl bg-[#3563E9] font-poppins text-base font-semibold tracking-[0.01em] text-white shadow-[0_12px_26px_-10px_rgba(53,99,233,0.6)] transition hover:-translate-y-px hover:bg-[#2A55D6] focus-visible:ring-4 focus-visible:ring-[#3563E9]/30 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
            >
              {isSubmitting ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-[15px] text-slate-500">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-bold text-[#3563E9] hover:text-[#2449C7] hover:underline"
            >
              Log In
            </Link>
          </p>
        </main>
      </div>
    </div>
  );
}
