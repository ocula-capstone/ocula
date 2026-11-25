import { outlineButton } from '@/components/common/buttons';
import { PageHeader } from '@/components/common/PageHeader';
import { Panel } from '@/components/common/Panel';
import { cn } from '@/lib/utils';

// Step one of the frame finder. The matching itself comes in its own phase.
export function FrameFinderPage() {
  return (
    <>
      <PageHeader
        title="Find frames that suit you"
        description="Add a photo and we match styles from the MRB catalog."
      />
      <Panel title="1. Add your photo">
        <p className="text-sm text-subtle">
          Use even lighting, face the camera, and remove glasses.
        </p>
        <button
          type="button"
          className="mt-4 grid min-h-40 w-full place-items-center rounded-xl border-2 border-dashed border-field-border text-sm font-semibold text-ink outline-none hover:bg-page focus-visible:ring-2 focus-visible:ring-brand-link"
        >
          Upload a front-facing photo (JPG, PNG or WEBP)
        </button>
        <button type="button" className={cn(outlineButton, 'mt-3 w-full')}>
          Use the camera instead
        </button>
      </Panel>
    </>
  );
}
