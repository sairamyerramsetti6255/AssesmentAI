import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Layout } from '@/components/Layout';
import { PageLoading } from '@/components/LoadingSkeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Input';
import { useState } from 'react';
import { FileText, CheckCircle } from 'lucide-react';

export default function ProposalPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [html, setHtml] = useState('');

  const { data: proposal, isLoading } = useQuery({
    queryKey: ['proposal', id],
    queryFn: () => api.getProposal(id!),
    enabled: !!id,
  });

  const { data: poc } = useQuery({
    queryKey: ['poc', id],
    queryFn: () => api.getPoc(id!),
    enabled: !!id,
  });

  const generateMutation = useMutation({
    mutationFn: () => api.generateProposal(id!),
    onSuccess: (data) => {
      setHtml(data.rendered_html);
      qc.invalidateQueries({ queryKey: ['proposal', id] });
    },
  });

  const finalizeMutation = useMutation({
    mutationFn: () => api.finalizeProposal(id!, html || proposal?.rendered_html || ''),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['proposal', id] }),
  });

  const displayHtml = html || proposal?.rendered_html || '';

  if (isLoading) return <Layout><PageLoading /></Layout>;

  return (
    <Layout>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Steps 9-10: PoC Plan & Proposal Generator</h1>
        <div className="flex gap-2">
          <Button onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending}>
            <FileText className="mr-2 h-4 w-4" /> Generate Proposal
          </Button>
          {displayHtml && proposal?.status !== 'finalized' && (
            <Button onClick={() => finalizeMutation.mutate()} disabled={finalizeMutation.isPending}>
              <CheckCircle className="mr-2 h-4 w-4" /> Finalize
            </Button>
          )}
        </div>
      </div>

      {poc && (
        <Card className="mb-6">
          <CardHeader><CardTitle>Step 9: PoC Plan</CardTitle></CardHeader>
          <CardContent>
            <div dangerouslySetInnerHTML={{ __html: poc.html_content || '' }} className="prose prose-sm max-w-none" />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Step 10: Client Proposal {proposal?.status === 'finalized' && <span className="text-green-600">(Finalized)</span>}</CardTitle>
        </CardHeader>
        <CardContent>
          {!displayHtml ? (
            <p className="text-slate-500">Generate a proposal from assessment results, gaps, and PoC plan.</p>
          ) : (
            <>
              <Textarea
                value={displayHtml}
                onChange={(e) => setHtml(e.target.value)}
                rows={20}
                className="mb-4 font-mono text-xs"
                disabled={proposal?.status === 'finalized'}
              />
              <div className="rounded-lg border bg-white p-6">
                <div dangerouslySetInnerHTML={{ __html: displayHtml }} className="prose max-w-none" />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </Layout>
  );
}
