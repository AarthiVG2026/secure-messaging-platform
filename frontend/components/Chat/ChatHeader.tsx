'use client';

import React from 'react';
import { useChatStore } from '@/store/useChatStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useUIStore } from '@/store/useUIStore';
import { Phone, Video, MoreVertical, Search, Shield, Users, ChevronLeft } from 'lucide-react';
import { Conversation, User } from '@/types';

export default function ChatHeader() {
  const { user } = useAuthStore();
  const { activeConversation, onlineUsers, setActiveConversation } = useChatStore();
  const { setShowInfoDrawer } = useUIStore();

  if (!activeConversation) return null;

  const isGroup = activeConversation.is_group;

  const getRecipientUser = (): User | null => {
    if (isGroup || !user) return null;
    const otherMember = activeConversation.members.find(m => m.user_id !== user.id);
    return otherMember?.user || null;
  };

  const recipient = getRecipientUser();
  const title = isGroup ? activeConversation.name : recipient?.display_name;
  const avatar = isGroup ? activeConversation.avatar_url : recipient?.avatar_url;
  const isOnline = recipient ? onlineUsers[recipient.id] : false;

  return (
    <div className="flex-shrink-0 flex items-center justify-between px-4 lg:px-6 py-3 border-b border-border bg-background">
      <div className="flex items-center gap-3">
        <button 
          onClick={() => setActiveConversation(null)}
          className="lg:hidden p-2 -ml-2 rounded-full hover:bg-muted"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        {/* Chat Avatar */}
        <div
          onClick={() => setShowInfoDrawer(true)}
          className={`h-10 w-10 rounded-full border border-border bg-muted flex items-center justify-center overflow-hidden cursor-pointer hover:opacity-80 transition-opacity`}
        >
          {avatar ? (
            <img src={avatar} alt={title || ''} className="h-full w-full object-cover" />
          ) : (
            isGroup ? (
              <Users className="h-5 w-5 text-muted-foreground" />
            ) : (
              <span className="text-sm font-bold text-muted-foreground">
                {title ? title[0].toUpperCase() : '?'}
              </span>
            )
          )}
        </div>
        
        <div 
          className="flex flex-col cursor-pointer hover:opacity-80 transition-opacity" 
          onClick={() => setShowInfoDrawer(true)}
        >
          <span
            className={`text-sm font-bold text-foreground hover:underline`}
          >
            {title}
          </span>
          <span className="text-xs text-muted-foreground">
            {isGroup ? (
              `${activeConversation.members.length} members`
            ) : (
              isOnline ? 'Online' : 'Offline'
            )}
          </span>
        </div>
      </div>

      {/* Header Right Controls */}
      <div className="flex items-center gap-3">
        <button title="Voice Call" className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-muted-foreground transition-colors cursor-not-allowed">
          <Phone className="h-5 w-5" />
        </button>
        <button title="Video Call" className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-muted-foreground transition-colors cursor-not-allowed">
          <Video className="h-5 w-5" />
        </button>
        <button title="Search in Chat" className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-muted-foreground transition-colors cursor-not-allowed">
          <Search className="h-5 w-5" />
        </button>
        <button 
          onClick={() => setShowInfoDrawer(true)}
          title="More Options" 
          className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-muted-foreground transition-colors"
        >
          <MoreVertical className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
