import type { ReactNode } from 'react';

// The Ocula logo: the same image as the browser-tab icon.
const LOGO_SRC = '/favicon.png';

// Phone-width frame shared by login and register: a navy header and a white sheet with rounded top
// corners. Under 640px it fills the screen; from 640px up it is a centered 475px card.
export function AuthMobileShell({
  lead,
  title,
  subtitle,
  children,
}: {
  lead: string;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh items-stretch justify-center bg-navy-900 font-sans sm:items-center sm:bg-page sm:px-6 sm:py-12">
      <div className="relative flex w-full flex-col overflow-hidden bg-navy-900 sm:max-w-[475px] sm:rounded-[32px] sm:shadow-[0_32px_70px_-28px_rgba(13,24,46,0.5)]">
        {/* decorative circles */}
        <div
          aria-hidden
          className="absolute -top-[190px] -right-[170px] size-[400px] rounded-full bg-navy-800"
        />
        <div
          aria-hidden
          className="absolute -top-[210px] -right-[200px] size-[360px] rounded-full bg-navy-700"
        />

        <header className="relative flex flex-col gap-5 px-6 pt-6 pb-5 sm:px-9">
          <div className="flex items-center gap-[13px]">
            <img src={LOGO_SRC} alt="" className="size-[40px] object-contain" />
            <div className="flex flex-col gap-[5px]">
              <span className="text-[18px] leading-none font-bold tracking-[-0.01em] text-white">
                Ocula
              </span>
              <span className="text-[10px] font-medium tracking-[0.18em] text-navy-muted uppercase">
                Optical Clinic Management
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {/* a <p>, not a heading: the page's single <h1> is the title in the white sheet */}
            <p className="text-[26px] leading-[1.15] font-bold tracking-[-0.01em] text-balance text-white">
              Your vision, <span className="text-brand-on-dark">our priority.</span>
            </p>
            <p className="text-sm leading-relaxed text-navy-muted">{lead}</p>
          </div>
        </header>

        <main className="relative flex flex-1 flex-col gap-6 rounded-t-[32px] bg-white px-6 pt-9 pb-[calc(2rem+env(safe-area-inset-bottom))] sm:px-9">
          <div className="flex flex-col gap-1.5">
            <h1 className="text-[28px] leading-[1.15] font-bold tracking-[-0.01em] text-balance text-ink">
              {title}
            </h1>
            <p className="text-[15px] leading-normal text-subtle">{subtitle}</p>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
