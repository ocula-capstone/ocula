import { Calendar, FileText, Search, type LucideIcon } from 'lucide-react';

// The Ocula logo: the same image as the browser-tab icon.
const LOGO_SRC = '/favicon.png';

const features: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: FileText,
    title: 'Access Your Records',
    text: 'View your exam history and prescriptions anytime.',
  },
  {
    icon: Calendar,
    title: 'Schedule Appointments',
    text: 'Book visits at Pasay or Taguig branches.',
  },
  {
    icon: Search,
    title: 'Find the Right Frames',
    text: 'Get AI-powered frame recommendations.',
  },
];

const REGISTER_TEXT =
  'Create a patient account to access your records and stay connected with MRB Optical Clinic.';

// Stays fixed to the screen height while the form scrolls: logo top, content middle, copyright bottom.
export function BrandPanel({ description = REGISTER_TEXT }: { description?: string }) {
  return (
    <aside className="relative hidden w-[48%] shrink-0 flex-col justify-between self-start overflow-hidden bg-navy-900 px-[38px] py-10 lg:sticky lg:top-0 lg:flex lg:h-screen">
      <div
        aria-hidden
        className="absolute top-[-163px] left-[223px] size-[420px] rounded-full bg-navy-800"
      />
      <div
        aria-hidden
        className="absolute top-[420px] left-[-213px] size-[520px] rounded-full bg-navy-700"
      />
      <div className="relative flex items-center gap-[14px]">
        <img src={LOGO_SRC} alt="" className="h-[56px] w-[58px] object-contain" />
        <div>
          <p className="text-[28px] leading-none font-bold text-white">Ocula</p>
          <p className="mt-1.5 text-[10px] font-normal tracking-[0.22em] text-[#8C99B8] uppercase">
            Optical Clinic Management
          </p>
        </div>
      </div>
      <div className="relative">
        <h2 className="text-[40px] leading-[1.18] font-bold text-balance text-white">
          Your vision,
          <br />
          <span className="text-brand-on-dark">our priority.</span>
        </h2>
        <p className="mt-3.5 max-w-[420px] text-[13px] leading-[1.7] text-navy-muted">
          {description}
        </p>
        <ul className="mt-7 flex flex-col gap-[22px]">
          {features.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex items-center gap-[14px]">
              <span className="grid size-[38px] shrink-0 place-items-center rounded-[10px] bg-white/10">
                <Icon className="size-5 text-white" strokeWidth={1.6} aria-hidden />
              </span>
              <div>
                <p className="text-sm font-semibold text-white">{title}</p>
                <p className="mt-0.5 text-xs text-navy-muted">{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <p className="relative text-xs text-[#8190AF]">
        © 2026 MRB Optical Clinic. All rights reserved.
      </p>
    </aside>
  );
}
