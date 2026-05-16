import { createBrowserRouter } from 'react-router-dom'
import { RequireAuth } from '../auth/RequireAuth.jsx'
import { RequireInterviewsAccess } from '../auth/RequireInterviewsAccess.jsx'
import { AppShell } from '../layout/AppShell'
import { LoginPage } from '../pages/LoginPage'
import { HomePage } from '../pages/HomePage'
import { GradeModelPage } from '../pages/GradeModelPage'
import { PositionGradesPage } from '../pages/PositionGradesPage'
import { DepartmentsPage } from '../pages/DepartmentsPage'
import { EmployeesPage } from '../pages/EmployeesPage'
import { EmployeeDetailsPage } from '../pages/EmployeeDetailsPage'
import { PoliciesPage } from '../pages/PoliciesPage'
import { DevelopmentPlansPage } from '../pages/DevelopmentPlansPage'
import { DevelopmentPlanCreatePage } from '../pages/DevelopmentPlanCreatePage'
import { DevelopmentPlanDetailsPage } from '../pages/DevelopmentPlanDetailsPage'
import { DevelopmentPlanTaskPage } from '../pages/DevelopmentPlanTaskPage'
import { ReviewsPage } from '../pages/ReviewsPage'
import { ReviewCycleDetailsPage } from '../pages/ReviewCycleDetailsPage'
import { PromotionDecisionsPage } from '../pages/PromotionDecisionsPage'
import { PromotionDecisionDetailsPage } from '../pages/PromotionDecisionDetailsPage'
import { ReportsPage } from '../pages/ReportsPage'
import { NotFoundPage } from '../pages/NotFoundPage'

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <HomePage /> },
      { path: 'grade-model', element: <GradeModelPage /> },
      { path: 'grade-model/positions/:positionId', element: <PositionGradesPage /> },
      { path: 'departments', element: <DepartmentsPage /> },
      { path: 'employees', element: <EmployeesPage /> },
      { path: 'employees/:employeeId', element: <EmployeeDetailsPage /> },
      { path: 'policies', element: <PoliciesPage /> },
      { path: 'development-plans', element: <DevelopmentPlansPage /> },
      { path: 'development-plans/new', element: <DevelopmentPlanCreatePage /> },
      { path: 'development-plans/:planId', element: <DevelopmentPlanDetailsPage /> },
      { path: 'development-plans/:planId/tasks/:taskId', element: <DevelopmentPlanTaskPage /> },
      {
        path: 'reviews',
        element: (
          <RequireInterviewsAccess>
            <ReviewsPage />
          </RequireInterviewsAccess>
        ),
      },
      {
        path: 'reviews/:reviewCycleId',
        element: (
          <RequireInterviewsAccess>
            <ReviewCycleDetailsPage />
          </RequireInterviewsAccess>
        ),
      },
      { path: 'promotion-decisions', element: <PromotionDecisionsPage /> },
      { path: 'promotion-decisions/:decisionId', element: <PromotionDecisionDetailsPage /> },
      { path: 'reports', element: <ReportsPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
