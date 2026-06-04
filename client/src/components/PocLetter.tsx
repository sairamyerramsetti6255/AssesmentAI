import { Printer, FileText, Calendar, Building2, Target, ListChecks, Clock, BarChart3, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { PocLetterContent } from '@/lib/pocContent';

export interface PocLetterProps {
  content: PocLetterContent;
  companyName: string;
  industryName?: string;
  contactName?: string | null;
  preparedBy?: string;
  date?: string;
}

export function PocLetter({
  content,
  companyName,
  industryName = 'General',
  contactName,
  preparedBy = 'Assessment ai · AI Readiness Team',
  date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
}: PocLetterProps) {
  const salutation = contactName ? `Dear ${contactName},` : 'Dear Executive Team,';

  return (
    <div className="poc-letter-page overflow-hidden rounded-3xl border border-brand-cream bg-white shadow-[0_20px_60px_rgba(17,24,68,0.12)]">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-brand-cream bg-[#faf9f7] px-5 py-4 sm:px-6">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-primary text-white">
            <FileText className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-bold text-brand-navy">Proof of Concept</p>
            <p className="text-[11px] text-brand-slate">Executive letter · {companyName}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" className="bg-white" onClick={() => window.print()}>
          <Printer className="mr-1.5 h-3.5 w-3.5" /> Print / Save PDF
        </Button>
      </div>

      {/* Letterhead band */}
      <header className="bg-brand-navy px-6 py-8 text-white sm:px-10 sm:py-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-slate">Assessment ai</p>
            <h1 className="mt-2 font-sans text-2xl font-bold tracking-tight sm:text-3xl">Proof of Concept Plan</h1>
            <p className="mt-2 max-w-md text-sm text-white/70">
              A structured pilot proposal following your AI readiness assessment
            </p>
          </div>
          <div className="shrink-0 space-y-2 rounded-2xl bg-white/10 px-5 py-4 text-sm ring-1 ring-white/15 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-white/90">
              <Calendar className="h-4 w-4 text-brand-cream" />
              <span>{date}</span>
            </div>
            <div className="flex items-center gap-2 text-white/90">
              <Building2 className="h-4 w-4 text-brand-cream" />
              <span>{companyName}</span>
            </div>
            <p className="text-xs text-brand-slate">{industryName}</p>
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="poc-letter-body px-6 py-10 sm:px-12 sm:py-14">
        <p className="mb-1 font-sans text-xs font-bold uppercase tracking-widest text-brand-primary">Re:</p>
        <p className="mb-8 font-sans text-lg font-semibold leading-snug text-brand-navy">{content.title}</p>

        <p className="mb-2 font-serif text-base font-semibold text-brand-navy">{salutation}</p>
        <p className="mb-10 font-serif text-[15px] leading-[1.75] text-[#2d3558]">
          Following our AI readiness assessment, we recommend a focused proof of concept to validate impact before
          broader investment. This document outlines objectives, scope, timeline, and success criteria tailored
          specifically for {companyName}.
        </p>

        {/* Objectives */}
        <section className="mb-10">
          <SectionTitle icon={Target} label="Executive objectives" />
          <ul className="mt-4 space-y-3">
            {content.objectives.map((item, i) => (
              <li
                key={i}
                className="flex gap-3 rounded-xl border border-brand-cream bg-brand-soft-light/40 px-4 py-3.5 font-serif text-[15px] leading-relaxed text-brand-navy"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-primary text-xs font-bold text-white">
                  {i + 1}
                </span>
                <span className="pt-0.5">{item}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Scope */}
        <section className="mb-10">
          <SectionTitle icon={ListChecks} label="Scope of work" />
          <p className="mt-4 rounded-2xl border border-brand-cream bg-white px-5 py-5 font-serif text-[15px] leading-[1.75] text-[#2d3558] ring-1 ring-brand-cream/80">
            {content.scope}
          </p>
        </section>

        {/* Timeline */}
        <section className="mb-10">
          <SectionTitle icon={Clock} label="Implementation timeline" />
          <div className="mt-4 overflow-hidden rounded-2xl border border-brand-cream ring-1 ring-brand-cream/60">
            <table className="w-full border-collapse font-sans text-sm">
              <thead>
                <tr className="bg-brand-navy text-left text-white">
                  <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider">Phase</th>
                  <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider">Activities</th>
                </tr>
              </thead>
              <tbody>
                {content.timeline.map((row, i) => (
                  <tr
                    key={i}
                    className={i % 2 === 0 ? 'bg-white' : 'bg-brand-soft-light/50'}
                  >
                    <td className="whitespace-nowrap border-t border-brand-cream px-5 py-4 font-semibold text-brand-primary">
                      {row.phase}
                    </td>
                    <td className="border-t border-brand-cream px-5 py-4 leading-relaxed text-brand-navy">
                      {row.activity}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Success metrics */}
        <section className="mb-10">
          <SectionTitle icon={BarChart3} label="Success metrics" />
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {content.success_metrics.map((m, i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-xl border-l-4 border-l-brand-primary bg-brand-soft-light/50 px-4 py-4"
              >
                <span className="mt-0.5 text-brand-primary">✓</span>
                <p className="font-serif text-[14px] leading-relaxed text-brand-navy">{m}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Investment */}
        <section className="mb-10 rounded-2xl border border-brand-cream bg-brand-soft-light p-6 sm:p-8">
          <SectionTitle icon={Wallet} label="Investment profile" />
          <div className="mt-5 grid gap-6 sm:grid-cols-2">
            <div className="rounded-xl bg-white p-5 ring-1 ring-brand-cream">
              <p className="text-[10px] font-bold uppercase tracking-widest text-brand-slate">Typical effort</p>
              <p className="mt-2 font-sans text-xl font-bold text-brand-navy">{content.effort}</p>
            </div>
            <div className="rounded-xl bg-white p-5 ring-1 ring-brand-cream">
              <p className="text-[10px] font-bold uppercase tracking-widest text-brand-slate">Cost-conscious path</p>
              <p className="mt-2 font-sans text-base font-semibold leading-snug text-brand-navy">
                {content.low_cost_options}
              </p>
            </div>
          </div>
        </section>

        <p className="mb-10 font-serif text-[15px] leading-[1.75] text-[#2d3558]">
          We are prepared to mobilize a joint working session to finalize data access, stakeholders, and a go/no-go
          checkpoint at the end of the pilot window.
        </p>

        <footer className="border-t-2 border-brand-cream pt-8">
          <p className="font-serif text-[15px] text-brand-navy">Respectfully,</p>
          <p className="mt-4 font-sans text-lg font-bold text-brand-primary">{preparedBy}</p>
          <p className="mt-1 text-sm text-brand-slate">On behalf of the AI Readiness Assessment Program</p>
        </footer>
      </div>
    </div>
  );
}

function SectionTitle({ icon: Icon, label }: { icon: typeof Target; label: string }) {
  return (
    <div className="flex items-center gap-3 border-b border-brand-cream pb-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-primary/10 text-brand-primary">
        <Icon className="h-4 w-4" />
      </div>
      <h2 className="font-sans text-xs font-bold uppercase tracking-[0.15em] text-brand-primary">{label}</h2>
    </div>
  );
}
