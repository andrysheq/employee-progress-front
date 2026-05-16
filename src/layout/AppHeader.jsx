import * as DialogPrimitive from '@radix-ui/react-dialog'
import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth.js'
import './AppShell.css'
import './AppHeader.css'

function pathMatches(pathname, to) {
  if (to === '/') {
    return pathname === '/'
  }
  return pathname === to || pathname.startsWith(`${to}/`)
}

/** @param {{ pathname: string, to: string, end?: boolean }} props */
function navLinkClass({ pathname, to, end }) {
  const active = end ? pathname === to : pathMatches(pathname, to)
  return `app-nav-link${active ? ' app-nav-link--active' : ''}`
}

function sheetLinkClass(pathname, item) {
  const active = item.end ? pathname === item.to : pathMatches(pathname, item.to)
  return `app-nav-sheet__flat${active ? ' app-nav-sheet__flat--active' : ''}`
}

export function AppHeader() {
  const navigate = useNavigate()
  const location = useLocation()
  const pathname = location.pathname
  const { isAuthenticated, visibleNavItems, displayName, clearSession, employeeIdFromJwt } =
    useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  function onLogout() {
    clearSession()
    navigate('/login', { replace: true })
  }

  const userName = displayName ?? 'Пользователь'
  const profileHref = employeeIdFromJwt != null ? `/employees/${employeeIdFromJwt}` : null

  const toolsBlock = (
    <>
      {profileHref != null ? (
        <Link
          to={profileHref}
          className="app-header__session app-header__session--link"
          title={userName}
          aria-label={`Страница сотрудника: ${userName}`}
          onClick={() => setMenuOpen(false)}
        >
          {userName}
        </Link>
      ) : (
        <span className="app-header__session" title={userName}>
          {userName}
        </span>
      )}
      <button type="button" className="ui-btn ui-btn--outline ui-btn--sm" onClick={onLogout}>
        Выйти
      </button>
    </>
  )

  const navLinks = visibleNavItems.map((item) => (
    <NavLink
      key={item.to}
      to={item.to}
      end={item.end}
      className={() => navLinkClass({ pathname, to: item.to, end: item.end })}
    >
      {item.label}
    </NavLink>
  ))

  return (
    <header className="app-header">
      <div className="app-header__inner app-header__inner--navbar">
        <NavLink to="/" className="app-logo" end>
          <span className="app-logo__mark" aria-hidden />
          <span className="app-logo__text">Карьера</span>
        </NavLink>

        <nav className="app-header__nav-desktop" aria-label="Основной раздел">
          <div className="app-header__nav-desktop-inner">{navLinks}</div>
        </nav>

        <div className="app-header__tools app-header__tools--desktop">
          {isAuthenticated ? (
            toolsBlock
          ) : (
            <NavLink to="/login" className="ui-btn ui-btn--default ui-btn--sm">
              Войти
            </NavLink>
          )}
        </div>

        <DialogPrimitive.Root open={menuOpen} onOpenChange={setMenuOpen}>
          <DialogPrimitive.Trigger asChild>
            <button
              type="button"
              className="app-header__sheet-trigger ui-btn ui-btn--outline ui-btn--icon"
              aria-label="Открыть меню"
            >
              <svg className="app-header__menu-icon" viewBox="0 0 24 24" aria-hidden>
                <path
                  fill="currentColor"
                  d="M4 6h16v2H4V6zm0 5h16v2H4v-2zm0 5h16v2H4v-2z"
                />
              </svg>
            </button>
          </DialogPrimitive.Trigger>
          <DialogPrimitive.Portal>
            <DialogPrimitive.Overlay className="app-nav-sheet__overlay" />
            <DialogPrimitive.Content
              className="app-nav-sheet__content"
              aria-describedby="app-nav-sheet-desc"
            >
              <DialogPrimitive.Title className="app-nav-sheet__title">Меню</DialogPrimitive.Title>
              <p id="app-nav-sheet-desc" className="sr-only">
                Навигация по разделам приложения
              </p>

              <div className="app-nav-sheet__body">
                {visibleNavItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={() => sheetLinkClass(pathname, item)}
                    onClick={() => setMenuOpen(false)}
                  >
                    {item.label}
                  </NavLink>
                ))}
              </div>

              <div className="app-nav-sheet__footer">
                {isAuthenticated ? (
                  <div className="app-nav-sheet__tools">{toolsBlock}</div>
                ) : (
                  <NavLink to="/login" className="ui-btn ui-btn--default" onClick={() => setMenuOpen(false)}>
                    Войти
                  </NavLink>
                )}
              </div>

              <DialogPrimitive.Close type="button" className="app-nav-sheet__close" aria-label="Закрыть">
                <span aria-hidden>×</span>
              </DialogPrimitive.Close>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
      </div>
    </header>
  )
}
