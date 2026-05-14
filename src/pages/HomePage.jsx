import { Link } from 'react-router-dom'
import { useAuth } from '../auth/useAuth.js'
import './pages.css'

export function HomePage() {
  const { isAuthenticated } = useAuth()

  return (
    <article className="page">
      <h1 className="page__title">Рабочий стол</h1>
      <p className="page__lead">
        Добро пожаловать в систему карьерного развития. Выберите нужный раздел в верхнем меню.
      </p>

      {!isAuthenticated ? (
        <p className="page__stub">
          Чтобы продолжить работу, выполните вход в систему.
        </p>
      ) : null}

      <ul className="home-links">
        <li>
          <Link to="/development-plans">Индивидуальные планы развития</Link>
        </li>
        <li>
          <Link to="/departments">Отделы</Link>
        </li>
        <li>
          <Link to="/grade-model">Матрица грейдов</Link>
        </li>
        <li>
          <Link to="/reports">Отчёты</Link>
        </li>
      </ul>
    </article>
  )
}
