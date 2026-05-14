import { useCallback, useEffect, useMemo, useState } from 'react'
import { AuthContext } from './authContext.js'
import { parseJwtPayload } from './jwtPayload.js'
import { getAccessToken } from '../api/token.js'
import { fetchEmployeeDisplayName } from '../api/employees.js'
import { COMPANY_CLAIM, EMPLOYEE_CLAIM } from '../config/companyContext.js'
import { normalizeJwtRoles, getVisibleNavItems } from './roleNav.js'

/** @typedef {import('react').ReactNode} ReactNode */

/**
 * @typedef {object} AuthContextValue
 * @property {boolean} isAuthenticated
 * @property {string[]} roles
 * @property {string | null} subject
 * @property {string | null} displayName
 * @property {number | null} companyIdFromJwt
 * @property {number | null} employeeIdFromJwt
 * @property {import('../layout/navConfig.js').NavItem[]} visibleNavItems
 * @property {(accessToken: string) => void} setSessionToken
 * @property {() => void} clearSession
 */

/** @param {{ children: ReactNode }} props */
export function AuthProvider({ children }) {
  const [version, setVersion] = useState(0)
  const [resolvedDisplayName, setResolvedDisplayName] = useState(null)

  const snapshot = useMemo(() => {
    void version
    const token = getAccessToken()
    if (!token) {
      return {
        isAuthenticated: false,
        roles: /** @type {string[]} */ ([]),
        subject: null,
        displayName: null,
        companyIdFromJwt: null,
        employeeIdFromJwt: null,
      }
    }
    const payload = parseJwtPayload(token)
    const roles = normalizeJwtRoles(payload?.roles)
    const subject = payload?.sub != null ? String(payload.sub) : null
    return {
      isAuthenticated: true,
      roles,
      subject,
      displayName: readDisplayName(payload),
      companyIdFromJwt: readPositiveLong(payload, COMPANY_CLAIM),
      employeeIdFromJwt: readPositiveLong(payload, EMPLOYEE_CLAIM),
    }
  }, [version])

  useEffect(() => {
    if (!snapshot.isAuthenticated) {
      setResolvedDisplayName(null)
      return
    }
    if (snapshot.employeeIdFromJwt == null) {
      setResolvedDisplayName(null)
      return
    }
    if (!shouldResolveDisplayName(snapshot.displayName)) {
      setResolvedDisplayName(null)
      return
    }

    let cancelled = false
    fetchEmployeeDisplayName(snapshot.employeeIdFromJwt)
      .then((name) => {
        if (!cancelled) {
          setResolvedDisplayName(name)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setResolvedDisplayName(null)
        }
      })
    return () => {
      cancelled = true
    }
  }, [snapshot.isAuthenticated, snapshot.employeeIdFromJwt, snapshot.displayName])

  const setSessionToken = useCallback((accessToken) => {
    try {
      sessionStorage.setItem('ep_access_token', accessToken)
    } catch {
      /* ignore */
    }
    setVersion((v) => v + 1)
  }, [])

  const clearSession = useCallback(() => {
    try {
      sessionStorage.removeItem('ep_access_token')
    } catch {
      /* ignore */
    }
    setVersion((v) => v + 1)
  }, [])

  const visibleNavItems = useMemo(
    () => getVisibleNavItems(snapshot.roles),
    [snapshot.roles],
  )

  const value = useMemo(
    () => ({
      ...snapshot,
      displayName: normalizeDisplayName(resolvedDisplayName) ?? normalizeDisplayName(snapshot.displayName),
      visibleNavItems,
      setSessionToken,
      clearSession,
    }),
    [snapshot, resolvedDisplayName, visibleNavItems, setSessionToken, clearSession],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/**
 * @param {Record<string, unknown> | null} payload
 * @param {string} claim
 * @returns {number | null}
 */
function readPositiveLong(payload, claim) {
  if (!payload || payload[claim] == null) {
    return null
  }
  const n = Number(payload[claim])
  if (!Number.isFinite(n) || n <= 0) {
    return null
  }
  return Math.trunc(n)
}

/**
 * @param {Record<string, unknown> | null} payload
 * @returns {string | null}
 */
function readDisplayName(payload) {
  if (!payload) {
    return null
  }
  const directName =
    readNonEmptyString(payload, 'full_name') ??
    readNonEmptyString(payload, 'fullName') ??
    readNonEmptyString(payload, 'name') ??
    readNonEmptyString(payload, 'fio') ??
    readNonEmptyString(payload, 'preferred_username') ??
    readNonEmptyString(payload, 'username')
  if (directName) {
    return directName
  }

  const family = readNonEmptyString(payload, 'last_name') ?? readNonEmptyString(payload, 'family_name')
  const given = readNonEmptyString(payload, 'first_name') ?? readNonEmptyString(payload, 'given_name')
  const middle = readNonEmptyString(payload, 'middle_name')
  const parts = [family, given, middle].filter(Boolean)
  if (parts.length > 0) {
    return parts.join(' ')
  }
  return null
}

/**
 * @param {Record<string, unknown>} payload
 * @param {string} key
 * @returns {string | null}
 */
function readNonEmptyString(payload, key) {
  const value = payload[key]
  if (typeof value !== 'string') {
    return null
  }
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

/**
 * @param {string | null} value
 * @returns {string | null}
 */
function normalizeDisplayName(value) {
  if (!value) {
    return null
  }
  const trimmed = value.trim()
  if (trimmed.length === 0) {
    return null
  }
  if (/^\d+$/.test(trimmed)) {
    return null
  }
  return trimmed
}

/**
 * @param {string | null} displayName
 * @returns {boolean}
 */
function shouldResolveDisplayName(displayName) {
  return normalizeDisplayName(displayName) == null
}
