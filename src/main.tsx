import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import tldrawCssUrl from 'tldraw/tldraw.css?url'
import App from './App.tsx'

// Inject tldraw CSS as a <link> to bypass Tailwind CSS processing
const tldrawLink = document.createElement('link')
tldrawLink.rel = 'stylesheet'
tldrawLink.href = tldrawCssUrl
document.head.appendChild(tldrawLink)

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      retry: 1,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
