import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useApp } from '../context/AppContext'

export function RequireAuth({
  adminOnly = false,
  children,
}: {
  adminOnly?: boolean
  children?: React.ReactNode
}) {
  const { currentUser, loading } = useApp()
  const location = useLocation()

  // On a reload the session is restored asynchronously; redirecting before
  // that settles would sign the user out on every refresh.
  if (loading) return null

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  if (adminOnly && currentUser.role === 'account_executive') {
    return <Navigate to="/" replace />
  }

  if (children) return <>{children}</>
  return <Outlet />
}
