import { Navigate } from 'react-router-dom'
import { useAuth } from './useAuth.js'
import { hasDirectorRole, hasTeamLeadRole } from './roleChecks.js'

/** @typedef {import('react').ReactNode} ReactNode */

/**
 * Раздел «Собеседования» не доступен тимлиду без роли директора / ГД (в т.ч. при комбинации с «Сотрудник»).
 *
 * @param {{ children: ReactNode }} props
 */
export function RequireInterviewsAccess({ children }) {
  const { roles } = useAuth()
  if (hasTeamLeadRole(roles) && !hasDirectorRole(roles)) {
    return <Navigate to="/" replace />
  }
  return children
}
