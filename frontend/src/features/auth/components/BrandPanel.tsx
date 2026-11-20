import { Calendar, FileText, Phone, Search, type LucideIcon } from 'lucide-react';

// The Ocula logo: the same image as the browser-tab icon.
const LOGO_SRC = '/favicon.png';

const features: { icon: LucideIcon; title: string; text: string; boxed: boolean }[] = [
  {
    icon: FileText,
    title: 'Access Your Records',
    text: 'View your exam history and prescriptions anytime.',
    boxed: true,
  },
  {
    icon: Calendar,
    title: 'Schedule Appointments',
    text: 'Book visits at Pasay or Taguig branches.',
    boxed: true,
  },
  {
    icon: Search,
    title: 'Find the Right Frames',
    text: 'Get AI-powered frame recommendations.',
    boxed: false,
  },
  {
    icon: Phone,
    title: 'Stay Connected',
    text: 'Receive follow-up reminders and updates.',
    boxed: false,
  },
];

export function BrandPanel() {
  return (
    <aside className="relative hidden w-[48%] flex-col overflow-hidden bg-[#0D182E] px-[38px] py-10 lg:flex">
      <div
        aria-hidden
        className="absolute top-[-163px] left-[223px] size-[420px] rounded-full bg-[#111E41]"
      />
      <div
        aria-hidden
        className="absolute top-[482px] left-[-213px] size-[520px] rounded-full bg-[#14234F]"
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
      <h2 className="relative mt-[108px] text-[44px] leading-[1.18] font-bold text-white">
        Your vision,
        <br />
        <span className="text-[#3F74F2]">our priority.</span>
      </h2>
      <p className="relative mt-[18px] max-w-[420px] text-[13px] leading-[1.7] text-[#A5B0C9]">
        Create a patient account to access your records, track your eye health, and stay connected
        with MRB Optical Clinic.
      </p>
      <ul className="relative mt-[30px] flex flex-col gap-7">
        {features.map(({ icon: Icon, title, text, boxed }) => (
          <li key={title} className="flex items-center gap-[14px]">
            <span
              className={`grid size-[38px] shrink-0 place-items-center rounded-[10px] ${boxed ? 'bg-[#14234F]' : ''}`}
            >
              <Icon className="size-5 text-white" strokeWidth={1.6} aria-hidden />
            </span>
            <div>
              <p className="text-sm font-semibold text-white">{title}</p>
              <p className="mt-1 text-xs text-[#8C99B8]">{text}</p>
            </div>
          </li>
        ))}
      </ul>
      <p className="relative mt-auto pt-10 text-xs text-[#8190AF]">
        © 2026 MRB Optical Clinic. All rights reserved.
      </p>
    </aside>
  );
}
