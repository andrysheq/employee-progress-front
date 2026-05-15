import { useCallback, useEffect, useMemo, useState } from 'react'
import { AuthContext } from './authContext.js'
import { parseJwtPayload } from './jwtPayload.js'
import { getAccessToken } from '../api/token.js'
import { fetchEmployeeDisplayName, fetchCurrentEmployee } from '../api/employees.js'
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
 * @property {number | null} employeeIdFromJwt Идентификатор сотрудника для API: из `GET /employees/me` при успехе, иначе claim `employee_id`.
 * @property {import('../layout/navConfig.js').NavItem[]} visibleNavItems
 * @property {(accessToken: string) => void} setSessionToken
 * @property {() => void} clearSession
 */

/** @param {{ children: ReactNode }} props */
export function AuthProvider({ children }) {
  const [version, setVersion] = useState(0)
  const [resolvedDisplayName, setResolvedDisplayName] = useState(null)
  const [resolvedEmployeeIdFromMe, setResolvedEmployeeIdFromMe] = useState(/** @type {number | null} */ (null))

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
        jwtEmployeeIdClaim: null,
      }
    }
    const payload = parseJwtPayload(token)
    if (!payload) {
      return {
        isAuthenticated: false,
        roles: /** @type {string[]} */ ([]),
        subject: null,
        displayName: null,
        companyIdFromJwt: null,
        jwtEmployeeIdClaim: null,
      }
    }
    const roles = normalizeJwtRoles([
      ...(Array.isArray(payload?.roles) ? payload.roles : payload?.roles != null ? [payload.roles] : []),
      ...(Array.isArray(payload?.role_ids) ? payload.role_ids : payload?.role_ids != null ? [payload.role_ids] : []),
    ])
    const subject = payload?.sub != null ? String(payload.sub) : null
    return {
      isAuthenticated: true,
      roles,
      subject,
      displayName: readDisplayName(payload),
      companyIdFromJwt: readPositiveLong(payload, COMPANY_CLAIM),
      jwtEmployeeIdClaim: readPositiveLong(payload, EMPLOYEE_CLAIM),
    }
  }, [version])

  useEffect(() => {
    if (!snapshot.isAuthenticated) {
      setResolvedEmployeeIdFromMe(null)
      return
    }
    let cancelled = false
    fetchCurrentEmployee()
      .then((emp) => {
        if (cancelled) {
          return
        }
        if (typeof emp?.id === 'number' && emp.id > 0) {
          setResolvedEmployeeIdFromMe(Math.trunc(emp.id))
        } else {
          setResolvedEmployeeIdFromMe(null)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setResolvedEmployeeIdFromMe(null)
        }
      })
    return () => {
      cancelled = true
    }
  }, [snapshot.isAuthenticated, version])

  const effectiveEmployeeId =
    resolvedEmployeeIdFromMe != null ? resolvedEmployeeIdFromMe : snapshot.jwtEmployeeIdClaim

  useEffect(() => {
    if (!snapshot.isAuthenticated) {
      setResolvedDisplayName(null)
      return
    }
    if (effectiveEmployeeId == null) {
      setResolvedDisplayName(null)
      return
    }
    if (!shouldResolveDisplayName(snapshot.displayName)) {
      setResolvedDisplayName(null)
      return
    }

    let cancelled = false
    fetchEmployeeDisplayName(effectiveEmployeeId)
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
  }, [snapshot.isAuthenticated, snapshot.displayName, effectiveEmployeeId])

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

  const value = useMemo(() => {
    const { jwtEmployeeIdClaim: _jwtEmployeeIdClaim, ...rest } = snapshot
    return {
      ...rest,
      employeeIdFromJwt: effectiveEmployeeId,
      displayName: normalizeDisplayName(resolvedDisplayName) ?? normalizeDisplayName(snapshot.displayName),
      visibleNavItems,
      setSessionToken,
      clearSession,
    }
  }, [snapshot, effectiveEmployeeId, resolvedDisplayName, visibleNavItems, setSessionToken, clearSession])

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
