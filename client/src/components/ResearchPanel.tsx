import { cn } from '@/lib/utils';

interface ResearchPanelProps {
  content: string;
  loading?: boolean;
  onChange: (value: string) => void;
}

function renderMarkdownLine(line: string) {
  if (line.startsWith('## ')) {
    return <h2 key={line} className="mb-2 mt-6 first:mt-0 text-lg font-bold text-brand-navy">{line.slice(3)}</h2>;
  }
  if (line.startsWith('### ')) {
    return <h3 key={line} className="mb-2 mt-4 text-sm font-semibold uppercase tracking-wide text-brand-primary">{line.slice(4)}</h3>;
  }
  if (line.startsWith('- ')) {
    return <li key={line} className="ml-4 text-brand-slate">{line.slice(2)}</li>;
  }
  if (line.trim() === '') return null;
  return <p key={line} className="mb-2 leading-relaxed text-brand-slate">{line}</p>;
}

export function ResearchPanel({ content, loading, onChange }: ResearchPanelProps) {
  const previewLines = content.split('\n');

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="overflow-hidden rounded-2xl border border-brand-cream bg-white shadow-sm">
        <div className="bg-brand-navy px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-widest text-brand-slate">Deep Research</p>
          <p className="text-sm font-semibold text-white">Edit research notes</p>
        </div>
        <textarea
          value={content}
          onChange={(e) => onChange(e.target.value)}
          disabled={loading}
          rows={16}
          className="w-full resize-none border-0 bg-white p-4 text-sm leading-relaxed text-brand-navy focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-primary/30"
          placeholder="Research will appear here after Step 1 is saved..."
        />
      </div>

      <div className="glass-card p-6">
        <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-brand-slate">Live Preview</p>
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-primary border-t-transparent" />
          </div>
        ) : content.trim() ? (
          <div className="prose-sm max-h-[420px] overflow-y-auto">
            {previewLines.map((line, i) => (
              <div key={`${i}-${line.slice(0, 20)}`}>{renderMarkdownLine(line)}</div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-brand-slate">Complete Step 1 and save to auto-generate deep research.</p>
        )}
      </div>
    </div>
  );
}

export function WizardHero({
  companyName,
  status,
  stepLabel,
  stepSubtitle,
}: {
  companyName: string;
  status: string;
  stepLabel: string;
  stepSubtitle: string;
}) {
  return (
    <div className="wizard-hero mb-8">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-slate">Assessment Wizard</p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">{companyName}</h1>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <span className="rounded-full bg-brand-primary px-3 py-1 text-xs font-medium capitalize text-white">
          {status.replace('_', ' ')}
        </span>
        <span className="text-sm text-brand-cream">
          Step: <strong className="text-white">{stepLabel}</strong> — {stepSubtitle}
        </span>
      </div>
    </div>
  );
}
