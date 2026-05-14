import { createBrowserRouter } from 'react-router-dom'
import { AppShell } from '../layout/AppShell'
import { LoginPage } from '../pages/LoginPage'
import { HomePage } from '../pages/HomePage'
import { GradeModelPage } from '../pages/GradeModelPage'
import { PositionGradesPage } from '../pages/PositionGradesPage'
import { DepartmentsPage } from '../pages/DepartmentsPage'
import { EmployeesPage } from '../pages/EmployeesPage'
import { PoliciesPage } from '../pages/PoliciesPage'
import { DevelopmentPlansPage } from '../pages/DevelopmentPlansPage'
import { ReviewsPage } from '../pages/ReviewsPage'
import { PromotionDecisionsPage } from '../pages/PromotionDecisionsPage'
import { ReportsPage } from '../pages/ReportsPage'
import { NotFoundPage } from '../pages/NotFoundPage'

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'grade-model', element: <GradeModelPage /> },
      { path: 'grade-model/positions/:positionId', element: <PositionGradesPage /> },
      { path: 'departments', element: <DepartmentsPage /> },
      { path: 'employees', element: <EmployeesPage /> },
      { path: 'policies', element: <PoliciesPage /> },
      { path: 'development-plans', element: <DevelopmentPlansPage /> },
      { path: 'reviews', element: <ReviewsPage /> },
      { path: 'promotion-decisions', element: <PromotionDecisionsPage /> },
      { path: 'reports', element: <ReportsPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
