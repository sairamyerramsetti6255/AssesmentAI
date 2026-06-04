import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useApp } from '../context/AppContext'

export function RequireAuth({
  adminOnly = false,
  children,
}: {
  adminOnly?: boolean
  children?: React.ReactNode
}) {
  const { currentUser } = useApp()
  const location = useLocation()

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  if (adminOnly && currentUser.role === 'account_executive') {
    return <Navigate to="/" replace />
  }

  if (children) return <>{children}</>
  return <Outlet />
}
