import { useQuery } from '@tanstack/react-query';
import { Loader2, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';
import { PocLetter } from '@/components/PocLetter';
import { parsePocContent, isStyledPocHtml } from '@/lib/pocContent';
import { Button } from '@/components/ui/Button';

interface PocLetterSectionProps {
  assessmentId: string;
  poc: { content: Record<string, unknown>; html_content?: string } | null | undefined;
  isGenerating: boolean;
  onRegenerate: () => void;
}

/** Full-width PoC letter block with client context — always uses React layout for styling. */
export function PocLetterSection({ assessmentId, poc, isGenerating, onRegenerate }: PocLetterSectionProps) {
  const { data: assessment } = useQuery({
    queryKey: ['assessment', assessmentId],
    queryFn: () => api.getAssessment(assessmentId),
  });

  const client = assessment?.client;
  const parsed = parsePocContent(poc?.content);
  const legacyHtml = poc?.html_content && !parsed && !isStyledPocHtml(poc.html_content);

  if (isGenerating) {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 rounded-3xl border border-brand-cream bg-white py-20 shadow-sm">
        <Loader2 className="h-10 w-10 animate-spin text-brand-primary" />
        <p className="text-sm font-medium text-brand-slate">Crafting your executive PoC letter…</p>
      </div>
    );
  }

  if (!poc) return null;

  if (legacyHtml) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
        <p className="text-sm text-amber-900">This PoC was created with an older format.</p>
        <Button className="mt-4" size="sm" onClick={onRegenerate}>
          <RefreshCw className="mr-2 h-4 w-4" /> Regenerate letter
        </Button>
      </div>
    );
  }

  if (!parsed) {
    return (
      <div className="rounded-2xl border border-brand-cream bg-white p-8 text-center text-brand-slate">
        <p>PoC data is incomplete. Regenerate the letter.</p>
        <Button className="mt-4" size="sm" variant="outline" onClick={onRegenerate}>
          <RefreshCw className="mr-2 h-4 w-4" /> Regenerate
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PocLetter
        content={parsed}
        companyName={client?.company_name || 'Client'}
        industryName={client?.industry_name}
        contactName={client?.contact_name}
      />
    </div>
  );
}
