import React from 'react'
import { RouterProvider } from 'react-router-dom'
import { Providers } from '@/providers/Providers'
import { router } from '@/routes'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'

export const App: React.FC = () => {
  return (
    <Providers>
      <ErrorBoundary>
        <RouterProvider router={router} />
      </ErrorBoundary>
    </Providers>
  )
}

export default App
