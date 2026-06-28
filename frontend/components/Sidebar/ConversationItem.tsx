'use client';

import React from 'react';
import { useChatStore } from '@/store/useChatStore';
import { useAuthStore } from '@/store/useAuthStore';
import { Conversation, User } from '@/types';
import { decryptMessage } from '@/utils/crypto';
import { formatTime, formatDateLabel } from '@/utils/formatters';

export interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
}

export default React.memo(function ConversationItem({ conversation, isActive }: ConversationItemProps) {
  const { user } = useAuthStore();
  const { setActiveConversation, onlineUsers } = useChatStore();

  const isGroup = conversation.is_group;
  const getRecipientUser = (): User | null => {
    if (isGroup || !user) return null;
    const otherMember = conversation.members.find(m => m.user_id !== user.id);
    return otherMember?.user || null;
  };
  const recipient = getRecipientUser();

  const title = isGroup ? conversation.name : recipient?.display_name;
  const avatar = isGroup ? conversation.avatar_url : recipient?.avatar_url;
  const isOnline = recipient ? onlineUsers[recipient.id] : false;
  
  const lastMsgText = decryptMessage(conversation.last_message?.text);
  const unreadCount = conversation.unread_count;

  return (
    <button
      onClick={() => setActiveConversation(conversation)}
      className={`flex w-full items-center gap-3 rounded-lg px-2 py-2.5 my-[1px] text-left transition-colors select-none group ${
        isActive
          ? 'bg-primary text-primary-foreground'
          : 'hover:bg-black/5 dark:hover:bg-white/5 text-foreground'
      }`}
    >
      {/* Avatar */}
      <div className="relative h-[46px] w-[46px] flex-shrink-0 rounded-full border border-black/5 dark:border-white/5 overflow-hidden flex items-center justify-center bg-muted">
        {avatar ? (
          <img src={avatar} alt={title || ''} className="h-full w-full object-cover" />
        ) : (
          <span className={`text-lg font-medium ${isActive ? 'text-primary-foreground' : 'text-muted-foreground'}`}>
            {title ? title[0].toUpperCase() : '?'}
          </span>
        )}
        {/* User Presence indicator on DMs */}
        {!isGroup && isOnline && (
          <span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 ${isActive ? 'border-primary' : 'border-sidebar'} bg-green-500`} />
        )}
      </div>

      {/* Info details */}
      <div className="flex-1 min-w-0 border-b border-sidebar-border group-last:border-none pb-2 pt-1 h-full">
        <div className="flex items-center justify-between">
          <span className="text-[14px] font-semibold truncate leading-tight">
            {title}
          </span>
          {conversation.last_message && (
            <span className={`text-[11px] whitespace-nowrap ml-2 font-medium ${isActive ? 'text-primary-foreground/90' : 'text-muted-foreground'}`}>
              {formatTime(conversation.last_message.created_at)}
            </span>
          )}
        </div>
        
        <div className="flex items-center justify-between mt-1">
          <p className={`text-[13px] truncate pr-2 ${isActive ? 'text-primary-foreground/90' : 'text-muted-foreground'}`}>
            {conversation.last_message?.message_type === 'system' ? (
              <span className="italic">{lastMsgText}</span>
            ) : conversation.last_message?.message_type === 'attachment' ? (
              <span>📷 Photo/Media</span>
            ) : (
              lastMsgText || 'Start conversation...'
            )}
          </p>
          
          {/* Unread count circle */}
          {unreadCount > 0 && (
            <span className={`flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-bold ${isActive ? 'bg-primary-foreground text-primary' : 'bg-primary text-primary-foreground'}`}>
              {unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
});
