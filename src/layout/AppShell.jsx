import { Outlet, useLocation } from 'react-router-dom'
import { PageBackground } from '../components/ui/PageBackground.jsx'
import { AppHeader } from './AppHeader'
import { AppFooter } from './AppFooter'
import './AppShell.css'

export function AppShell() {
  const location = useLocation()

  return (
    <PageBackground>
      <div className="app-shell">
        <AppHeader />
        <main className="app-main">
          <div key={location.pathname} className="app-page-transition">
            <Outlet />
          </div>
        </main>
        <AppFooter />
      </div>
    </PageBackground>
  )
}
