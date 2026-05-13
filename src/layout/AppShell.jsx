import { Outlet } from 'react-router-dom'
import { AppHeader } from './AppHeader'
import { AppFooter } from './AppFooter'
import './AppShell.css'

export function AppShell() {
  return (
    <div className="app-shell">
      <AppHeader />
      <main className="app-main">
        <Outlet />
      </main>
      <AppFooter />
    </div>
  )
}
