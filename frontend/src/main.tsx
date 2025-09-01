import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async';
import { ToastProvider } from '@/components/ui/ToastProvider';
import '@/index.css'
import App from '@/App.tsx'
import { getAccess } from './lib/auth'; // Import auth utility

const bootToken = getAccess();
console.log('[BOOT] access=', !!bootToken);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <HelmetProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </HelmetProvider>
    </BrowserRouter>
  </StrictMode>,
)