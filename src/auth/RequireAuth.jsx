import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './useAuth.js'

/** @typedef {import('react').ReactNode} ReactNode */

/**
 * @param {{ children: ReactNode }} props
 */
export function RequireAuth({ children }) {
  const { isAuthenticated } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return children
}
