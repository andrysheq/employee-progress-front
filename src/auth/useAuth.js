import { useContext } from 'react'
import { AuthContext } from './authContext.js'

/**
 * @returns {import('./AuthProvider.jsx').AuthContextValue}
 */
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth должен вызываться внутри AuthProvider')
  }
  return ctx
}
