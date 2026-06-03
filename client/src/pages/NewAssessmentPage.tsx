import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Layout } from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/Card';

export default function NewAssessmentPage() {
  const navigate = useNavigate();

  const mutation = useMutation({
    mutationFn: () => api.createAssessment({ company_name: 'New Client Assessment' }),
    onSuccess: (data) => navigate(`/assessments/${data.id}?step=1`),
  });

  if (!mutation.isPending && !mutation.isSuccess) {
    mutation.mutate();
  }

  return (
    <Layout>
      <Card className="mx-auto max-w-md">
        <CardContent className="py-12 text-center text-slate-500">
          Creating draft assessment...
        </CardContent>
      </Card>
    </Layout>
  );
}
