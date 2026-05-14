import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { loginWithEmailPassword } from '../api/usersAuth.js'
import { useAuth } from '../auth/useAuth.js'
import './LoginPage.css'

export function LoginPage() {
  const { isAuthenticated, setSessionToken } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(/** @type {string | null} */ (null))

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  async function onSubmit(ev) {
    ev.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const token = await loginWithEmailPassword(email.trim(), password)
      setSessionToken(token)
      navigate('/', { replace: true })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка входа')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <h1 className="login-card__title">Вход</h1>
        <p className="login-card__lead">
          Введите email и пароль от вашей учётной записи.
        </p>

        <form onSubmit={onSubmit}>
          <div className="login-field">
            <label htmlFor="login-email">Email</label>
            <input
              id="login-email"
              name="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              required
            />
          </div>
          <div className="login-field">
            <label htmlFor="login-password">Пароль</label>
            <input
              id="login-password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
              required
            />
          </div>

          {error ? (
            <p className="login-card__error" role="alert">
              {error}
            </p>
          ) : null}

          <button type="submit" className="login-card__submit" disabled={busy}>
            {busy ? 'Вход…' : 'Войти'}
          </button>
        </form>

        <p className="login-card__footer">
          Если у вас нет доступа, обратитесь к администратору системы.
        </p>
      </div>

      <p className="login-back">
        <Link to="/">← На главную</Link>
      </p>
    </div>
  )
}
