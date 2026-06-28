'use client';

import React from 'react';
import { useChatStore } from '@/store/useChatStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useUIStore } from '@/store/useUIStore';
import { useSocket } from '@/hooks/useSocket';
import { Search, Plus, Users, Settings, Edit2 } from 'lucide-react';
import { decryptMessage } from '@/utils/crypto';
import { formatTime, formatDateLabel } from '@/utils/formatters';
import { Conversation, User } from '@/types';
import { ConversationItemProps } from './ConversationItem';
import ConversationItem from './ConversationItem';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, MessageCircle, UserPlus, Users as UsersIcon } from 'lucide-react';

export default function Sidebar() {
  const { user } = useAuthStore();
  const { conversations, activeConversation, onlineUsers, pinnedChats, archivedChats } = useChatStore();
  const { isConnected } = useSocket();
  const [showArchived, setShowArchived] = React.useState(false);
  
  const { 
    searchQuery, setSearchQuery,
    setShowProfileModal,
    setShowAddContactModal,
    setShowCreateGroupModal,
    setShowSettingsModal,
    setShowNewChatModal
  } = useUIStore();

  const getRecipientUser = (conv: Conversation): User | null => {
    if (conv.is_group || !user) return null;
    const otherMember = conv.members.find(m => m.user_id !== user.id);
    return otherMember?.user || null;
  };

  const filteredConversations = conversations.filter(c => {
    if (c.is_group) {
      return c.name?.toLowerCase().includes(searchQuery.toLowerCase());
    } else {
      const recipient = getRecipientUser(c);
      return recipient?.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        recipient?.username.toLowerCase().includes(searchQuery.toLowerCase());
    }
  });

  return (
    <div className="flex h-full w-[360px] flex-col bg-sidebar border-r border-sidebar-border select-none">
      
      {/* Sidebar Header */}
      <div className="flex items-center justify-between px-5 py-3 h-[60px]">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowProfileModal(true)}
            className="relative h-8 w-8 rounded-full bg-zinc-800 hover:opacity-90 overflow-hidden flex items-center justify-center transition-opacity"
          >
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="Profile" className="h-full w-full object-cover" />
            ) : (
              <span className="text-sm font-bold text-white">{user?.display_name[0].toUpperCase()}</span>
            )}
            <span className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-sidebar ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          </button>
        </div>
        
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowAddContactModal(true)}
            title="Add Contact"
            className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Plus className="h-4.5 w-4.5" />
          </button>
          <button
            onClick={() => setShowCreateGroupModal(true)}
            title="Create Group"
            className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Users className="h-4.5 w-4.5" />
          </button>
          <button
            onClick={() => setShowSettingsModal(true)}
            title="Settings"
            className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Settings className="h-4.5 w-4.5" />
          </button>
        </div>
      </div>

      {/* Conversation Search Bar */}
      <div className="px-4 pb-2 pt-1 flex gap-2 items-center">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search className="h-4 w-4 text-muted-foreground" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full rounded-md bg-black/5 dark:bg-white/5 py-1.5 pl-9 pr-3 text-[13px] font-medium placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 transition-shadow"
            placeholder="Search"
          />
        </div>
        <button
          onClick={() => setShowNewChatModal(true)}
          className="flex-shrink-0 p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
          title="New Chat"
        >
          <Edit2 className="h-[18px] w-[18px]" />
        </button>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto px-2 space-y-[2px]">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-6 mt-10 text-center">
            <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <MessageCircle className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-bold text-foreground">Welcome to Signal!</h3>
            <p className="text-[13px] text-muted-foreground mt-2 mb-6">
              Start by adding your first contact.
            </p>
            <div className="flex flex-col gap-2 w-full max-w-[200px]">
              <button 
                onClick={() => setShowAddContactModal(true)}
                className="flex items-center justify-center gap-2 w-full py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-blue-600 transition-colors"
              >
                <UserPlus className="h-4 w-4" /> Add Contact
              </button>
              <button 
                onClick={() => setShowNewChatModal(true)}
                className="flex items-center justify-center gap-2 w-full py-2 bg-muted text-foreground rounded-lg text-sm font-medium hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
              >
                <Edit2 className="h-4 w-4" /> Start New Chat
              </button>
              <button 
                onClick={async () => {
                  try {
                    const { api } = await import('@/services/api');
                    await api.importDemoContacts();
                    window.dispatchEvent(new Event('reload_data'));
                    alert('Demo contacts imported successfully!');
                  } catch (e: any) {
                    alert('Failed to import contacts: ' + e.message);
                  }
                }}
                className="flex items-center justify-center gap-2 w-full py-2 bg-muted text-foreground rounded-lg text-sm font-medium hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
              >
                <UsersIcon className="h-4 w-4" /> Import Demo Contacts
              </button>
              <button 
                onClick={() => setShowCreateGroupModal(true)}
                className="flex items-center justify-center gap-2 w-full py-2 bg-muted text-foreground rounded-lg text-sm font-medium hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
              >
                <UsersIcon className="h-4 w-4" /> Create Group
              </button>
            </div>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
            <span className="text-sm">No chats found.</span>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {/* Pinned Chats */}
            {filteredConversations.filter(c => pinnedChats.includes(c.id)).map((conv) => (
              <motion.div key={conv.id} layout initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}>
                <ConversationItem conversation={conv} isActive={activeConversation?.id === conv.id} />
              </motion.div>
            ))}
            
            {/* Recent Chats */}
            {filteredConversations.filter(c => !pinnedChats.includes(c.id) && !archivedChats.includes(c.id)).map((conv) => (
              <motion.div key={conv.id} layout initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}>
                <ConversationItem conversation={conv} isActive={activeConversation?.id === conv.id} />
              </motion.div>
            ))}
          </AnimatePresence>
        )}
        
        {/* Archived Chats Toggle */}
        {archivedChats.length > 0 && (
          <div className="pt-2 pb-4">
            <button
              onClick={() => setShowArchived(!showArchived)}
              className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted rounded-lg transition-colors"
            >
              {showArchived ? 'Hide Archived' : `Archived (${archivedChats.length})`}
            </button>
            <AnimatePresence initial={false}>
              {showArchived && filteredConversations.filter(c => archivedChats.includes(c.id)).map((conv) => (
                <motion.div key={conv.id} layout initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}>
                  <ConversationItem conversation={conv} isActive={activeConversation?.id === conv.id} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
