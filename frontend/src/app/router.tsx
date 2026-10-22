import { createBrowserRouter } from 'react-router-dom'

import { AppShell } from '@/components/shared/AppShell'
import { ActivitiesPage } from '@/features/activities/pages/ActivitiesPage'
import { ActivityDetailPage } from '@/features/activities/pages/ActivityDetailPage'
import { DiaryPage } from '@/features/diary/pages/DiaryPage'
import { HomePage } from '@/features/home/HomePage'
import { NotFoundPage } from '@/app/NotFoundPage'
import { RouteErrorPage } from '@/app/RouteErrorPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'atividades', element: <ActivitiesPage /> },
      { path: 'atividades/:id', element: <ActivityDetailPage /> },
      { path: 'diario', element: <DiaryPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
