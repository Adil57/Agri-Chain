import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'

// Which routes each role can access
const roleRoutes = {
  farmer: ['/farmer', '/ai', '/orders'],
  b2b:    ['/b2b', '/ai', '/orders'],
  b2c:    ['/b2c', '/ai', '/orders'],
}

// Default landing page per role
const roleHome = {
  farmer: '/farmer',
  b2b: '/b2b',
  b2c: '/b2c',
}

export default function RoleGuard({ children, allowedRoles }) {
  const user = useAuthStore((s) => s.user)

  // Not logged in → send to login
  if (!user) return <Navigate to="/login" replace />

  // If specific roles are required, check them
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={roleHome[user.role] || '/'} replace />
  }

  return children
}

export { roleRoutes, roleHome }
