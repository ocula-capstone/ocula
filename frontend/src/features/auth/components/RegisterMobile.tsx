import { useState } from 'react';
import { CalendarDays, Check, Lock, Mail, Phone, User } from 'lucide-react';
import { Link } from 'react-router';
import { AuthMobileShell } from '@/features/auth/components/AuthMobileShell';
import {
  MobileField,
  MobileShowToggle,
  MobileSubmitButton,
} from '@/features/auth/components/MobileControls';
import type { RegisterForm } from '@/features/auth/useRegisterForm';

// Phone-width view: a navy header and a white sheet with rounded top corners.
export function RegisterMobile({ form }: { form: RegisterForm }) {
  const {
    register,
    registerPassword,
    registerBirthDate,
    formState: { errors, isSubmitting },
    formError,
    onSubmit,
  } = form;
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <AuthMobileShell
      lead="Create an account to access prescriptions & book visits."
      title="Create Patient Account"
      subtitle="Join MRB Optical Clinic's patient portal."
    >
      {formError && (
        <div
          role="alert"
          className="rounded-xl border border-error/40 bg-red-50 px-4 py-3 text-sm font-medium text-red-900"
        >
          {formError}
        </div>
      )}

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3">
        <MobileField
          label="Full Name"
          icon={User}
          autoComplete="name"
          placeholder="e.g. Maria Santos"
          error={errors.fullName?.message}
          {...register('fullName')}
        />
        <MobileField
          label="Email Address"
          icon={Mail}
          type="email"
          autoComplete="email"
          placeholder="Enter your email address"
          error={errors.email?.message}
          {...register('email')}
        />
        <MobileField
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
        <MobileField
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
        <MobileField
          label="Password"
          icon={Lock}
          type={showPw ? 'text' : 'password'}
          autoComplete="new-password"
          placeholder="Create a password"
          helper="At least 8 characters"
          error={errors.password?.message}
          trailing={
            <MobileShowToggle
              shown={showPw}
              noun="password"
              onToggle={() => setShowPw((s) => !s)}
            />
          }
          {...registerPassword()}
        />
        <MobileField
          label="Confirm Password"
          icon={Check}
          type={showConfirm ? 'text' : 'password'}
          autoComplete="new-password"
          placeholder="Re-enter password"
          error={errors.confirmPassword?.message}
          trailing={
            <MobileShowToggle
              shown={showConfirm}
              noun="confirm password"
              onToggle={() => setShowConfirm((s) => !s)}
            />
          }
          {...register('confirmPassword')}
        />
        <MobileSubmitButton
          pending={isSubmitting}
          label="Create Account"
          pendingLabel="Creating account…"
        />
      </form>

      <p className="text-center text-[15px] text-subtle">
        Already have an account?{' '}
        <Link
          to="/login"
          className="inline-flex min-h-11 items-center rounded-lg px-1 font-semibold text-brand-link hover:underline focus-visible:ring-2 focus-visible:ring-brand-link focus-visible:outline-none"
        >
          Log In
        </Link>
      </p>
    </AuthMobileShell>
  );
}
