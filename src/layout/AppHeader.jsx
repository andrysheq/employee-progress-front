import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth.js'
import './AppShell.css'

export function AppHeader() {
  const navigate = useNavigate()
  const {
    isAuthenticated,
    visibleNavItems,
    roles,
    subject,
    companyIdFromJwt,
    employeeIdFromJwt,
    clearSession,
  } = useAuth()

  function onLogout() {
    clearSession()
    navigate('/login', { replace: true })
  }

  const rolesShort =
    roles.length > 0 ? roles.join(', ') : isAuthenticated ? 'роли не указаны в токене' : ''

  return (
    <header className="app-header">
      <div className="app-header__inner">
        <NavLink to="/" className="app-logo" end>
          <span className="app-logo__mark" aria-hidden />
          <span className="app-logo__text">Карьера</span>
        </NavLink>

        <nav className="app-nav" aria-label="Основной раздел">
          {visibleNavItems.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `app-nav__link${isActive ? ' app-nav__link--active' : ''}`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="app-header__tools">
          {isAuthenticated ? (
            <>
              <span className="app-header__session" title={rolesShort}>
                {subject ? `УЗ #${subject}` : 'Вошли'}
                {companyIdFromJwt != null ? ` · компания ${companyIdFromJwt}` : ''}
                {employeeIdFromJwt != null ? ` · сотр. ${employeeIdFromJwt}` : ''}
              </span>
              <button type="button" className="app-header__btn" onClick={onLogout}>
                Выйти
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" className="app-header__btn app-header__btn--link">
                Войти
              </NavLink>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
