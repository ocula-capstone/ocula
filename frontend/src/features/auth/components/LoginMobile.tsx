import { useState } from 'react';
import { Lock, Mail } from 'lucide-react';
import { Link } from 'react-router';
import { AuthMobileShell } from '@/features/auth/components/AuthMobileShell';
import {
  MobileField,
  MobileShowToggle,
  MobileSubmitButton,
} from '@/features/auth/components/MobileControls';
import type { LoginForm } from '@/features/auth/useLoginForm';

// Phone-width view: same navy header and white sheet as the mobile register page.
export function LoginMobile({ form }: { form: LoginForm }) {
  const {
    register,
    formState: { errors, isSubmitting },
    formError,
    onSubmit,
  } = form;
  const [showPw, setShowPw] = useState(false);

  return (
    <AuthMobileShell
      lead="Sign in to see your records & book visits."
      title="Welcome back"
      subtitle="Sign in to your OCULA account."
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
          label="Email Address"
          icon={Mail}
          type="email"
          autoComplete="email"
          placeholder="Enter your email address"
          error={errors.email?.message}
          {...register('email')}
        />
        <MobileField
          label="Password"
          icon={Lock}
          type={showPw ? 'text' : 'password'}
          autoComplete="current-password"
          placeholder="Enter your password"
          error={errors.password?.message}
          trailing={
            <MobileShowToggle
              shown={showPw}
              noun="password"
              onToggle={() => setShowPw((s) => !s)}
            />
          }
          {...register('password')}
        />
        <Link
          to="/forgot-password"
          className="-mt-3 inline-flex min-h-11 items-center self-end rounded-lg px-1 text-sm font-semibold text-brand-link hover:underline focus-visible:ring-2 focus-visible:ring-brand-link focus-visible:outline-none"
        >
          Forgot your password?
        </Link>
        <MobileSubmitButton pending={isSubmitting} label="Sign In" pendingLabel="Signing in…" />
      </form>

      <p className="text-center text-[15px] text-subtle">
        New patient?{' '}
        <Link
          to="/register"
          className="inline-flex min-h-11 items-center rounded-lg px-1 font-semibold text-brand-link hover:underline focus-visible:ring-2 focus-visible:ring-brand-link focus-visible:outline-none"
        >
          Create an account
        </Link>
      </p>
    </AuthMobileShell>
  );
}
