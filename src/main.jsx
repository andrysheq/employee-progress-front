import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import './styles/global.css'
import { router } from './app/router.jsx'
import { configureSessionStorageAccessToken } from './api/token.js'
import { AuthProvider } from './auth/AuthProvider.jsx'

configureSessionStorageAccessToken()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </StrictMode>,
)
