'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { useChatStore } from '@/store/useChatStore';
import { useSocket } from '@/hooks/useSocket';
import { api } from '@/services/api';

import Sidebar from '@/components/Sidebar/Sidebar';
import ChatArea from '@/components/Chat/ChatArea';
import AllModals from '@/components/Modals/AllModals';

export default function DashboardPage() {
  const router = useRouter();
  const { accessToken, isAuthenticated, initializeAuth } = useAuthStore();
  const { setConversations, setPresence, activeConversation } = useChatStore();
  
  // Initialize Socket via hook (must be called to maintain connection)
  useSocket();

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem('access_token')) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  const fetchInitialData = async () => {
    if (!accessToken) return;
    try {
      const convData = await api.getConversations();
      setConversations(convData);
      
      const contactsData = await api.getContacts();
      contactsData.forEach((c: any) => {
        const isMockOnline = c.contact_user.username === 'bob' || c.contact_user.username === 'emma';
        setPresence(c.contact_user.id, isMockOnline);
      });
    } catch (e) {
      console.error('Failed to load dashboard data:', e);
    }
  };

  useEffect(() => {
    fetchInitialData();

    // Listen for custom reload event from Modals
    const handleReload = () => fetchInitialData();
    window.addEventListener('reload_data', handleReload);
    return () => window.removeEventListener('reload_data', handleReload);
  }, [accessToken]);

  return (
    <div className="flex h-[100dvh] w-full bg-background font-sans text-foreground overflow-hidden select-none">
      <div className={`${activeConversation ? 'hidden lg:flex' : 'flex'} h-full shrink-0 w-full lg:w-auto`}>
        <Sidebar />
      </div>
      <div className={`${!activeConversation ? 'hidden lg:flex' : 'flex'} flex-1 h-full min-w-0`}>
        <ChatArea />
      </div>
      <AllModals />
    </div>
  );
}
