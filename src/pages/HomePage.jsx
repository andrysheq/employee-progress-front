import { ChevronRightIcon } from '@radix-ui/react-icons'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/useAuth.js'
import './pages.css'

export function HomePage() {
  const { isAuthenticated, visibleNavItems } = useAuth()
  const hubItems = visibleNavItems.filter((item) => item.to !== '/')

  return (
    <article className="page">
      <h1 className="page__title">Рабочий стол</h1>
      <p className="page__lead">
        Добро пожаловать в систему карьерного развития. Ниже — краткие описания разделов, доступных вам; перейдите по
        карточке или выберите пункт в верхнем меню.
      </p>

      {!isAuthenticated ? (
        <p className="page__stub">
          Чтобы продолжить работу, выполните вход в систему.
        </p>
      ) : null}

      <section className="home-hub" aria-label="Разделы приложения">
        <div className="home-hub__grid">
          {hubItems.map((item) => (
            <Link key={item.to} to={item.to} className="home-hub__card">
              <span className="home-hub__card-title">{item.label}</span>
              {item.description ? <span className="home-hub__card-desc">{item.description}</span> : null}
              <ChevronRightIcon className="home-hub__card-chevron" aria-hidden />
            </Link>
          ))}
        </div>
      </section>
    </article>
  )
}
