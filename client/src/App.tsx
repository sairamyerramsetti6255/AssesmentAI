import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '@/lib/auth';
import { PageLoading } from '@/components/LoadingSkeleton';
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import AssessmentsPage from '@/pages/AssessmentsPage';
import NewAssessmentPage from '@/pages/NewAssessmentPage';
import AssessmentDetailPage from '@/pages/AssessmentDetailPage';
import LiveSessionPage from '@/pages/LiveSessionPage';
import ResultsPage from '@/pages/ResultsPage';
import GapAnalysisPage from '@/pages/GapAnalysisPage';
import ProposalPage from '@/pages/ProposalPage';
import ReportsPage from '@/pages/ReportsPage';
import AdminPage from '@/pages/AdminPage';
import AuditPage from '@/pages/AuditPage';
import ClientPortalPage from '@/pages/ClientPortalPage';
import NotificationsPage from '@/pages/NotificationsPage';

const qc = new QueryClient();

function PrivateRoute({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoading />;
  if (!user) return <Navigate to="/login" />;
  if (roles && !roles.includes(user.role_name)) return <Navigate to="/dashboard" />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/client/:token" element={<ClientPortalPage />} />
      <Route path="/dashboard" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
      <Route path="/assessments" element={<PrivateRoute><AssessmentsPage /></PrivateRoute>} />
      <Route path="/assessments/new" element={<PrivateRoute roles={['super_admin', 'sales_manager']}><NewAssessmentPage /></PrivateRoute>} />
      <Route path="/assessments/:id" element={<PrivateRoute><AssessmentDetailPage /></PrivateRoute>} />
      <Route path="/assessments/:id/results" element={<PrivateRoute><ResultsPage /></PrivateRoute>} />
      <Route path="/assessments/:id/gap-analysis" element={<PrivateRoute roles={['super_admin', 'sales_manager']}><GapAnalysisPage /></PrivateRoute>} />
      <Route path="/assessments/:id/proposal" element={<PrivateRoute roles={['super_admin', 'sales_manager']}><ProposalPage /></PrivateRoute>} />
      <Route path="/sessions/:id" element={<PrivateRoute roles={['sales_rep']}><LiveSessionPage /></PrivateRoute>} />
      <Route path="/reports" element={<PrivateRoute roles={['super_admin', 'sales_manager']}><ReportsPage /></PrivateRoute>} />
      <Route path="/admin" element={<PrivateRoute roles={['super_admin']}><AdminPage /></PrivateRoute>} />
      <Route path="/audit" element={<PrivateRoute roles={['super_admin']}><AuditPage /></PrivateRoute>} />
      <Route path="/notifications" element={<PrivateRoute><NotificationsPage /></PrivateRoute>} />
      <Route path="/" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
