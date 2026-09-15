import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router/dom'

import { AppProviders } from './app/providers'
import { router } from './app/router'
import { RootErrorBoundary } from './components/feedback/RootErrorBoundary'
import './styles/globals.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RootErrorBoundary>
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>
    </RootErrorBoundary>
  </StrictMode>,
)
