import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Conversation, Message, ActiveTypingState } from '../types';

interface ChatState {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  messages: Message[];
  typingStates: Record<string, Record<string, boolean>>; // conversationId -> { userId -> isTyping }
  onlineUsers: Record<string, boolean>; // userId -> isOnline
  
  // Persisted state
  pinnedChats: string[]; // conversation_ids
  archivedChats: string[]; // conversation_ids
  messageDrafts: Record<string, string>; // conversation_id -> draft text
  
  setConversations: (conversations: Conversation[]) => void;
  setActiveConversation: (conversation: Conversation | null) => void;
  setMessages: (messages: Message[]) => void;
  prependMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  updateMessage: (messageId: string, updatedFields: Partial<Message>) => void;
  deleteMessageRecord: (messageId: string) => void;
  setTyping: (conversationId: string, userId: string, isTyping: boolean) => void;
  setPresence: (userId: string, isOnline: boolean) => void;
  updateMessageStatus: (conversationId: string, user_id: string, messageIds: string[], status: 'sent' | 'delivered' | 'read') => void;
  markConversationRead: (conversationId: string) => void;
  updateMessageReaction: (conversationId: string, messageId: string, userId: string, emoji: string, status: 'added' | 'removed') => void;
  
  // Persisted actions
  togglePinChat: (conversationId: string) => void;
  toggleArchiveChat: (conversationId: string) => void;
  setDraft: (conversationId: string, draft: string) => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      conversations: [],
      activeConversation: null,
      messages: [],
      typingStates: {},
      onlineUsers: {},
      
      pinnedChats: [],
      archivedChats: [],
      messageDrafts: {},
  
  setConversations: (conversations) => set({ conversations }),
  
  setActiveConversation: (conversation) => set((state) => {
    if (!conversation) {
      return { activeConversation: null, messages: [] };
    }
    
    // Clear unread count for this conversation in the list
    const updatedConvs = state.conversations.map((c) =>
      c.id === conversation.id ? { ...c, unread_count: 0 } : c
    );
    
    return {
      activeConversation: conversation,
      conversations: updatedConvs,
      messages: [] // Cleared, will be populated by API load
    };
  }),
  
  setMessages: (messages) => set({ messages }),
  
  prependMessages: (newMessages) => set((state) => {
    // Avoid duplicates
    const existingIds = new Set(state.messages.map(m => m.id));
    const filtered = newMessages.filter(m => !existingIds.has(m.id));
    return { messages: [...filtered, ...state.messages] };
  }),
  
  addMessage: (message) => set((state) => {
    // 1. If it belongs to active conversation, append to list (checking for duplicates first)
    let updatedMessages = state.messages;
    if (state.activeConversation && message.conversation_id === state.activeConversation.id) {
      // Check for optimistic message match to replace it
      const optimisticIdx = state.messages.findIndex((m) => {
        if (message.client_msg_id && m.client_msg_id === message.client_msg_id) return true;
        if (m.id === message.id) return true;
        return false;
      });
      
      if (optimisticIdx !== -1) {
        updatedMessages = [...state.messages];
        updatedMessages[optimisticIdx] = message;
      } else {
        updatedMessages = [...state.messages, message];
      }
    }
    
    // 2. Update conversation list: update last_message, unread_count, and re-sort
    const conversationId = message.conversation_id;
    let found = false;
    
    const updatedConvs = state.conversations.map((c) => {
      if (c.id === conversationId) {
        found = true;
        let isSelf = false;
        try {
          const userStr = localStorage.getItem('current_user');
          if (userStr) {
            const userObj = JSON.parse(userStr);
            isSelf = userObj.id === message.sender_id;
          }
        } catch(e) {}
        
        const isCurrentActive = state.activeConversation?.id === conversationId;
        const increment = (!isSelf && !isCurrentActive) ? 1 : 0;
        
        return {
          ...c,
          last_message: {
            id: message.id,
            sender_id: message.sender_id,
            text: message.text,
            message_type: message.message_type,
            created_at: message.created_at
          },
          unread_count: c.unread_count + increment,
          updated_at: message.created_at
        };
      }
      return c;
    });
    
    // Re-sort conversations by updated_at desc
    const sortedConvs = [...updatedConvs].sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );
    
    return {
      messages: updatedMessages,
      conversations: sortedConvs
    };
  }),
  
  updateMessage: (messageId, updatedFields) => set((state) => {
    const updatedMessages = state.messages.map((m) =>
      m.id === messageId ? { ...m, ...updatedFields } : m
    );
    
    // Also update last message in conversation list if applicable
    const updatedConvs = state.conversations.map((c) => {
      if (c.last_message?.id === messageId) {
        return {
          ...c,
          last_message: {
            ...c.last_message,
            text: updatedFields.text || c.last_message.text,
            message_type: updatedFields.message_type || c.last_message.message_type
          }
        };
      }
      return c;
    });
    
    return {
      messages: updatedMessages,
      conversations: updatedConvs
    };
  }),
  
  deleteMessageRecord: (messageId) => set((state) => {
    return {
      messages: state.messages.filter((m) => m.id !== messageId)
    };
  }),
  
  setTyping: (conversationId, userId, isTyping) => set((state) => {
    const convTyping = state.typingStates[conversationId] || {};
    const updatedConvTyping = { ...convTyping, [userId]: isTyping };
    if (!isTyping) {
      delete updatedConvTyping[userId];
    }
    return {
      typingStates: {
        ...state.typingStates,
        [conversationId]: updatedConvTyping
      }
    };
  }),
  
  setPresence: (userId, isOnline) => set((state) => ({
    onlineUsers: {
      ...state.onlineUsers,
      [userId]: isOnline
    }
  })),
  
  updateMessageStatus: (conversationId, user_id, messageIds, status) => set((state) => {
    // If conversation is currently active, update statuses of affected messages
    let updatedMessages = state.messages;
    if (state.activeConversation?.id === conversationId) {
      updatedMessages = state.messages.map((msg) => {
        if (messageIds.includes(msg.id)) {
          // Check if status for this user already exists, update it, otherwise append
          const existingStatusIdx = msg.statuses.findIndex((s) => s.user_id === user_id);
          const newStatus = {
            id: Math.random().toString(), // dummy PK
            message_id: msg.id,
            user_id,
            status,
            updated_at: new Date().toISOString()
          };
          
          let updatedStatuses = [...msg.statuses];
          if (existingStatusIdx !== -1) {
            updatedStatuses[existingStatusIdx] = newStatus;
          } else {
            updatedStatuses.push(newStatus);
          }
          
          return {
            ...msg,
            statuses: updatedStatuses
          };
        }
        return msg;
      });
    }
    
    return { messages: updatedMessages };
  }),
  
  markConversationRead: (conversationId) => set((state) => {
    const updatedConvs = state.conversations.map((c) =>
      c.id === conversationId ? { ...c, unread_count: 0 } : c
    );
    return { conversations: updatedConvs };
  }),
  
  updateMessageReaction: (conversationId, messageId, userId, emoji, status) => set((state) => {
    if (state.activeConversation?.id !== conversationId) return state;

    const updatedMessages = state.messages.map((msg) => {
      if (msg.id === messageId) {
        const reactions = msg.reactions || [];
        const existingIdx = reactions.findIndex((r) => r.user_id === userId);
        
        let newReactions = [...reactions];
        
        if (status === 'removed') {
          if (existingIdx !== -1) {
            newReactions.splice(existingIdx, 1);
          }
        } else {
          const newReaction = {
            id: Math.random().toString(),
            message_id: messageId,
            user_id: userId,
            emoji: emoji,
            created_at: new Date().toISOString()
          };
          
          if (existingIdx !== -1) {
            newReactions[existingIdx] = newReaction;
          } else {
            newReactions.push(newReaction);
          }
        }
        
        return { ...msg, reactions: newReactions };
      }
      return msg;
    });
    
    
    return { messages: updatedMessages };
  }),
  
  togglePinChat: (conversationId) => set((state) => {
    const isPinned = state.pinnedChats.includes(conversationId);
    return {
      pinnedChats: isPinned 
        ? state.pinnedChats.filter(id => id !== conversationId)
        : [...state.pinnedChats, conversationId]
    };
  }),
  
  toggleArchiveChat: (conversationId) => set((state) => {
    const isArchived = state.archivedChats.includes(conversationId);
    return {
      archivedChats: isArchived
        ? state.archivedChats.filter(id => id !== conversationId)
        : [...state.archivedChats, conversationId]
    };
  }),
  
  setDraft: (conversationId, draft) => set((state) => {
    if (!draft) {
      const newDrafts = { ...state.messageDrafts };
      delete newDrafts[conversationId];
      return { messageDrafts: newDrafts };
    }
    return {
      messageDrafts: {
        ...state.messageDrafts,
        [conversationId]: draft
      }
    };
  })
}),
{
  name: 'signal-chat-storage',
  storage: createJSONStorage(() => localStorage),
  partialize: (state) => ({ 
    pinnedChats: state.pinnedChats,
    archivedChats: state.archivedChats,
    messageDrafts: state.messageDrafts 
  })
}
));
