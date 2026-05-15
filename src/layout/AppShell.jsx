import { Outlet } from 'react-router-dom'
import { PageBackground } from '../components/ui/PageBackground.jsx'
import { AppHeader } from './AppHeader'
import { AppFooter } from './AppFooter'
import './AppShell.css'

export function AppShell() {
  return (
    <PageBackground>
      <div className="app-shell">
        <AppHeader />
        <main className="app-main">
          <Outlet />
        </main>
        <AppFooter />
      </div>
    </PageBackground>
  )
}
