import { useState } from 'react';
import { Check, Eye, EyeOff, LoaderCircle, Lock, Mail, Phone, User } from 'lucide-react';
import { useWatch } from 'react-hook-form';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { BrandPanel } from '@/features/auth/components/BrandPanel';
import { IconField } from '@/features/auth/components/IconField';
import type { RegisterForm } from '@/features/auth/useRegisterForm';

function ShowToggle({
  shown,
  label,
  onToggle,
}: {
  shown: boolean;
  label: string;
  onToggle: () => void;
}) {
  const Icon = shown ? EyeOff : Eye;
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={`${shown ? 'Hide' : 'Show'} ${label}`}
      className="flex shrink-0 items-center gap-1.5 rounded-md text-[13px] font-medium text-[#667085] transition-colors hover:text-[#2F5BE0] focus-visible:ring-2 focus-visible:ring-[#2F5BE0] focus-visible:outline-none"
    >
      <Icon className="size-[18px]" aria-hidden />
      {shown ? 'Hide' : 'Show'}
    </button>
  );
}

// Web view (1024px and wider): dark brand panel on the left, the form on the right.
export function RegisterDesktop({ form }: { form: RegisterForm }) {
  const {
    register,
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
    <div className="flex min-h-screen font-poppins">
      <BrandPanel />
      <main className="flex flex-1 flex-col bg-white px-[53px] pt-[62px] pb-0">
        <div className="mx-auto w-full max-w-[480px]">
          <header className="mb-[30px]">
            <h1 className="text-[32px] leading-[1.2] font-bold text-[#0F1B45]">
              Create Patient Account
            </h1>
            <p className="mt-1.5 text-sm text-[#667085]">
              Join MRB Optical Clinic's patient portal.
            </p>
          </header>
          <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
            {formError && (
              <div
                role="alert"
                className="rounded-xl border border-[#DC2626]/40 bg-red-50 p-3.5 text-[13px] text-red-900"
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
              placeholder="you@example.com"
              error={errors.email?.message}
              {...register('email')}
            />
            <IconField
              label="Contact Number"
              icon={Phone}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="+63 9XX XXX XXXX"
              error={errors.phone?.message}
              {...register('phone')}
            />
            <IconField
              label="Password"
              icon={Lock}
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="At least 8 characters"
              error={errors.password?.message}
              trailing={
                <ShowToggle
                  shown={showPassword}
                  label="password"
                  onToggle={() => setShowPassword((v) => !v)}
                />
              }
              // re-check the confirm field whenever the password changes
              {...register('password', { deps: ['confirmPassword'] })}
            />
            <IconField
              label="Confirm Password"
              icon={Check}
              iconClassName={passwordsMatch ? 'text-green-600' : undefined}
              type={showConfirm ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Re-enter your password"
              error={errors.confirmPassword?.message}
              trailing={
                <ShowToggle
                  shown={showConfirm}
                  label="confirm password"
                  onToggle={() => setShowConfirm((v) => !v)}
                />
              }
              {...register('confirmPassword')}
            />
            <span role="status" className="sr-only">
              {passwordsMatch ? 'Passwords match' : ''}
            </span>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="mt-[7px] h-12 w-full rounded-xl bg-[#3560E0] text-base font-semibold text-white shadow-[0_8px_20px_-6px_rgba(53,96,224,0.5)] hover:bg-[#2B52C8]"
            >
              {isSubmitting && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
              {isSubmitting ? 'Creating account…' : 'Create Account'}
            </Button>
          </form>
          <p className="mt-5 text-center text-sm text-[#667085]">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-[#2F5BE0]">
              Log In
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
