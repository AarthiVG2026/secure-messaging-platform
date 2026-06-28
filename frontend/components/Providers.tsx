'use client';

import React, { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '../store/useAuthStore';
import { useSocket } from '../hooks/useSocket';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function SocketInitializer({ children }: { children: React.ReactNode }) {
  // Instantiates global socket listeners and connections
  const { isConnected } = useSocket();
  
  useEffect(() => {
    console.log('Socket network connection state:', isConnected ? 'Connected' : 'Disconnected');
  }, [isConnected]);

  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const initializeAuth = useAuthStore((state) => state.initializeAuth);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Hydrate authentication from LocalStorage on client mount
    initializeAuth();
    setMounted(true);

    // Hydrate theme variable from LocalStorage or system preference
    const savedTheme = localStorage.getItem('theme') || 'dark'; // Dark mode default for premium Signal look
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [initializeAuth]);

  if (!mounted) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-zinc-950 text-zinc-100 font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-600 border-t-blue-500"></div>
          <span className="text-sm font-medium tracking-wide">Loading Signal...</span>
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <SocketInitializer>
        {children}
      </SocketInitializer>
    </QueryClientProvider>
  );
}
export default Providers;
