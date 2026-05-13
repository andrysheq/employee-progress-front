import { Link } from 'react-router-dom'
import { useAuth } from '../auth/useAuth.js'
import './pages.css'

export function HomePage() {
  const { isAuthenticated, roles } = useAuth()

  return (
    <article className="page">
      <h1 className="page__title">Рабочий стол</h1>
      <p className="page__lead">
        Скелет клиента для системы карьерного развития. Выберите раздел в меню или перейдите по ссылкам ниже.
      </p>

      {!isAuthenticated ? (
        <p className="page__stub">
          Вы не авторизованы.{' '}
          <Link to="/login">Войти</Link> — токен попадёт в <code>sessionStorage</code>, после чего откроются зоны по
          ролям из JWT (см. <code>docs/ui-roles.md</code>).
        </p>
      ) : (
        <p className="page__stub">
          Сессия активна. Роли в токене:{' '}
          <strong>{roles.length > 0 ? roles.join(', ') : 'не найдены — показаны все пункты меню'}</strong>. Скрытие
          разделов — по эвристике из <code>src/auth/roleNav.js</code>; окончательный доступ всё равно определяет
          ответ API (403 при недостаточных грантах).
        </p>
      )}

      <ul className="home-links">
        <li>
          <Link to="/development-plans">Индивидуальные планы развития</Link>
        </li>
        <li>
          <Link to="/departments">Отделы компании</Link>
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
