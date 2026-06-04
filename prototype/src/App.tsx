import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import { RequireAuth } from './components/RequireAuth'
import { ClientPortalLayout, Layout } from './components/Layout'
import { Overview } from './pages/Overview'
import { LeadIntake } from './pages/LeadIntake'
import { ReviewWorkspace } from './pages/ReviewWorkspace'
import { Pipeline } from './pages/Pipeline'
import { Proposal } from './pages/Proposal'
import { Admin } from './pages/Admin'
import { Analytics } from './pages/Analytics'
import { Reports } from './pages/Reports'
import { ClientPortal } from './pages/ClientPortal'
import { Login } from './pages/Login'
import { Profile } from './pages/Profile'

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ClientPortalLayout />}>
            <Route path="portal/:token" element={<ClientPortal />} />
          </Route>
          <Route element={<RequireAuth />}>
            <Route element={<Layout />}>
              <Route index element={<Overview />} />
              <Route path="intake" element={<LeadIntake />} />
              <Route path="review" element={<ReviewWorkspace />} />
              <Route path="pipeline" element={<Pipeline />} />
              <Route path="proposal" element={<Proposal />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="profile" element={<Profile />} />
              <Route
                path="admin"
                element={
                  <RequireAuth adminOnly>
                    <Admin />
                  </RequireAuth>
                }
              />
              <Route
                path="reports"
                element={
                  <RequireAuth adminOnly>
                    <Reports />
                  </RequireAuth>
                }
              />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  )
}
