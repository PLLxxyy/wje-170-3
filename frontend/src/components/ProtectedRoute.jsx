import { Navigate } from 'react-router-dom'
import useAuthStore from '../store/auth'

export default function ProtectedRoute({ children, roles }) {
  const { isAuthenticated, user } = useAuthStore()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (roles && roles.length > 0) {
    const hasDirectRole = roles.includes(user?.role)
    const canActAsSupervisor = roles.includes('supervisor') && user?.canApprove && (user?.role === 'supervisor' || user?.role === 'employee')
    if (!hasDirectRole && !canActAsSupervisor) {
      return <Navigate to="/dashboard" replace />
    }
  }

  return children
}
