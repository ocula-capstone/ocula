import { useState } from 'react';
import { LoaderCircle, Lock, Mail } from 'lucide-react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { BrandPanel } from '@/features/auth/components/BrandPanel';
import { IconField } from '@/features/auth/components/IconField';
import { ShowToggle } from '@/features/auth/components/ShowToggle';
import type { LoginForm } from '@/features/auth/useLoginForm';

// Web view (1024px and wider): same brand panel as register, sign-in card on the right.
export function LoginDesktop({ form }: { form: LoginForm }) {
  const {
    register,
    formState: { errors, isSubmitting },
    formError,
    onSubmit,
  } = form;
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="flex min-h-screen font-poppins">
      <BrandPanel description="Sign in to view your records, book visits, and stay connected with MRB Optical Clinic." />
      <main className="flex flex-1 flex-col justify-center bg-page px-10 py-8">
        <div className="mx-auto w-full max-w-[480px] rounded-2xl border border-line bg-white p-8 shadow-[0_6px_20px_-12px_rgba(15,27,69,0.18)]">
          <header className="mb-6">
            <h1 className="text-[28px] leading-[1.2] font-bold text-balance text-ink">
              Welcome back
            </h1>
            <p className="mt-1 text-sm text-subtle">Sign in to your OCULA account.</p>
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
              label="Email Address"
              icon={Mail}
              type="email"
              autoComplete="email"
              placeholder="Enter your email address"
              error={errors.email?.message}
              {...register('email')}
            />
            <IconField
              label="Password"
              icon={Lock}
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Enter your password"
              error={errors.password?.message}
              trailing={
                <ShowToggle
                  shown={showPassword}
                  label="password"
                  onToggle={() => setShowPassword((v) => !v)}
                />
              }
              {...register('password')}
            />
            <div className="-mt-3 text-right">
              <Link
                to="/forgot-password"
                className="-my-1.5 inline-block rounded-md px-1 py-1.5 text-[13px] font-semibold text-brand-link hover:underline focus-visible:ring-2 focus-visible:ring-brand-link focus-visible:outline-none"
              >
                Forgot your password?
              </Link>
            </div>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="mt-3 h-12 w-full rounded-xl bg-brand text-base font-semibold text-white shadow-[0_2px_8px_-2px_rgba(53,96,224,0.35)] hover:bg-brand-hover"
            >
              {isSubmitting && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
              {isSubmitting ? 'Signing in…' : 'Sign In'}
            </Button>
          </form>
          <p className="mt-3 text-center text-sm text-subtle">
            New patient?{' '}
            <Link
              to="/register"
              className="inline-block rounded-md px-1 py-1.5 font-semibold text-brand-link hover:underline focus-visible:ring-2 focus-visible:ring-brand-link focus-visible:outline-none"
            >
              Create an account
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
