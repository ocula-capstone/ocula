import { useState } from 'react';
import { CalendarDays, Check, LoaderCircle, Lock, Mail, Phone, User } from 'lucide-react';
import { useWatch } from 'react-hook-form';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { BrandPanel } from '@/features/auth/components/BrandPanel';
import { IconField } from '@/features/auth/components/IconField';
import { ShowToggle } from '@/features/auth/components/ShowToggle';
import type { RegisterForm } from '@/features/auth/useRegisterForm';

// Web view (1024px and wider): dark brand panel on the left, the form on the right.
// From 1280px the form pairs Email/Contact and Password/Confirm so the page fits one screen.
export function RegisterDesktop({ form }: { form: RegisterForm }) {
  const {
    register,
    registerPassword,
    registerBirthDate,
    control,
    formState: { errors, isSubmitting },
    formError,
    onSubmit,
  } = form;
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [password, confirmPassword] = useWatch({ control, name: ['password', 'confirmPassword'] });
  // Green only when the passwords match AND the password itself is valid.
  const passwordsMatch =
    !!confirmPassword && password === confirmPassword && (password ?? '').length >= 8;

  return (
    <div className="flex min-h-screen font-sans">
      <BrandPanel />
      <main className="flex flex-1 flex-col justify-center bg-page px-10 py-8">
        <div className="mx-auto w-full max-w-[640px] rounded-2xl border border-line bg-white p-8 shadow-[0_6px_20px_-12px_rgba(15,27,69,0.18)]">
          <header className="mb-6">
            <h1 className="text-[28px] leading-[1.2] font-bold text-balance text-ink">
              Create Patient Account
            </h1>
            <p className="mt-1 text-sm text-subtle">Join MRB Optical Clinic's patient portal.</p>
          </header>
          <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3">
            {formError && (
              <div
                role="alert"
                className="rounded-xl border border-error/40 bg-red-50 p-3.5 text-[13px] text-red-900"
              >
                {formError}
              </div>
            )}
            <IconField
              label="Full Name"
              icon={User}
              autoComplete="name"
              placeholder="e.g. Maria Santos"
              error={errors.fullName?.message}
              {...register('fullName')}
            />
            <IconField
              label="Email Address"
              icon={Mail}
              type="email"
              autoComplete="email"
              placeholder="Enter your email address"
              error={errors.email?.message}
              {...register('email')}
            />
            <div className="grid grid-cols-1 gap-x-4 gap-y-3 xl:grid-cols-2">
              <IconField
                label="Contact Number"
                icon={Phone}
                prefix="+63"
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                placeholder="9XX XXX XXXX"
                error={errors.phone?.message}
                {...register('phone')}
              />
              <IconField
                label="Date of Birth"
                icon={CalendarDays}
                type="text"
                inputMode="numeric"
                maxLength={10}
                autoComplete="bday"
                placeholder="mm/dd/yyyy"
                error={errors.birthDate?.message}
                {...registerBirthDate()}
              />
            </div>
            <div className="grid grid-cols-1 gap-x-4 gap-y-3 xl:grid-cols-2">
              <IconField
                label="Password"
                icon={Lock}
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Create a password"
                helper="At least 8 characters"
                error={errors.password?.message}
                trailing={
                  <ShowToggle
                    collapse
                    shown={showPassword}
                    label="password"
                    onToggle={() => setShowPassword((v) => !v)}
                  />
                }
                {...registerPassword()}
              />
              <IconField
                label="Confirm Password"
                icon={Check}
                iconClassName={passwordsMatch ? 'text-green-600' : undefined}
                type={showConfirm ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Re-enter password"
                error={errors.confirmPassword?.message}
                trailing={
                  <ShowToggle
                    collapse
                    shown={showConfirm}
                    label="confirm password"
                    onToggle={() => setShowConfirm((v) => !v)}
                  />
                }
                {...register('confirmPassword')}
              />
            </div>
            <span role="status" className="sr-only">
              {passwordsMatch ? 'Passwords match' : ''}
            </span>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="mt-3 h-12 w-full rounded-xl bg-brand text-base font-semibold text-white shadow-[0_2px_8px_-2px_rgba(53,96,224,0.35)] hover:bg-brand-hover"
            >
              {isSubmitting && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
              {isSubmitting ? 'Creating account…' : 'Create Account'}
            </Button>
          </form>
          <p className="mt-3 text-center text-sm text-subtle">
            Already have an account?{' '}
            <Link
              to="/login"
              className="inline-block rounded-md px-1 py-1.5 font-semibold text-brand-link hover:underline focus-visible:ring-2 focus-visible:ring-brand-link focus-visible:outline-none"
            >
              Log In
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
