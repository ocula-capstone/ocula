import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import { queryClient } from '@/app/query-client';
import { router } from '@/app/router';
import { AuthProvider } from '@/features/auth/AuthProvider';
import './index.css';

async function enableMocking() {
  if (!import.meta.env.DEV || import.meta.env.VITE_USE_MOCKS !== 'true') return;
  const { worker } = await import('@/mocks/browser');
  await worker.start({ onUnhandledFrame: 'bypass' });
}

enableMocking().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </QueryClientProvider>
    </StrictMode>,
  );
});
