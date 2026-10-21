import { RouterProvider } from 'react-router-dom'

import { ToastProvider } from '@/components/shared/ToastProvider'
import { TooltipProvider } from '@/components/ui/tooltip'
import { router } from '@/app/router'

function App() {
  return (
    <TooltipProvider>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </TooltipProvider>
  )
}

export default App
