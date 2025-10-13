'use client';

import { CookiesProvider } from 'react-cookie';
import { Toaster } from 'react-hot-toast';

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <CookiesProvider>
      <Toaster position="top-center" />
      {children}
    </CookiesProvider>
  );
}
