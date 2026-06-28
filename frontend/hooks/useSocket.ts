import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/useAuthStore';
import { useChatStore } from '../store/useChatStore';
import { Message } from '../types';

let globalSocket: Socket | null = null;

export const useSocket = () => {
  const { user, accessToken } = useAuthStore();
  const { 
    addMessage, 
    setTyping, 
    setPresence, 
    updateMessageStatus,
    updateMessageReaction,
    activeConversation
  } = useChatStore();
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!accessToken || !user) {
      if (globalSocket) {
        globalSocket.disconnect();
        globalSocket = null;
      }
      setIsConnected(false);
      return;
    }

    if (globalSocket) {
      if (!globalSocket.connected) {
        globalSocket.connect();
      }
      setIsConnected(globalSocket.connected);
      return;
    }

    // Connect to server socket.io
    const baseUrl = process.env.NEXT_PUBLIC_API_URL ? process.env.NEXT_PUBLIC_API_URL.replace('/api', '') : 'http://localhost:8000';
    const socket = io(baseUrl, {
      auth: {
        token: `Bearer ${accessToken}`
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    globalSocket = socket;

    socket.on('connect', () => {
      console.log('Socket connected successfully:', socket.id);
      setIsConnected(true);
      
      // Re-join active room if any
      if (activeConversation) {
        socket.emit('join_room', { conversation_id: activeConversation.id });
      }
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
      setIsConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
      setIsConnected(false);
    });

    // Subscriptions
    socket.on('message_new', (message: Message) => {
      console.log('Realtime message received:', message);
      addMessage(message);

      // If we are currently focusing on this conversation, automatically mark it read
      const currentUserId = JSON.parse(localStorage.getItem('current_user') || '{}').id;
      if (activeConversation && message.conversation_id === activeConversation.id && message.sender_id !== currentUserId) {
        socket.emit('mark_read', {
          conversation_id: activeConversation.id,
          message_ids: [message.id],
        });
      }
    });

    socket.on('typing_update', (data: { conversation_id: string; user_id: string; is_typing: boolean }) => {
      setTyping(data.conversation_id, data.user_id, data.is_typing);
    });

    socket.on('presence_update', (data: { user_id: string; is_online: boolean; last_seen?: string }) => {
      setPresence(data.user_id, data.is_online);
    });

    socket.on('receipt_update', (data: { conversation_id: string; user_id: string; message_ids: string[]; status: 'sent' | 'delivered' | 'read' }) => {
      updateMessageStatus(data.conversation_id, data.user_id, data.message_ids, data.status);
    });

    socket.on('reaction_update', (data: { conversation_id: string; message_id: string; user_id: string; emoji: string; status: 'added' | 'removed' }) => {
      updateMessageReaction(data.conversation_id, data.message_id, data.user_id, data.emoji, data.status);
    });

    socket.on('conversation_activity', (data: { conversation_id: string; last_message: any; unread_count: number }) => {
      // Direct state update for conversation list
      useChatStore.setState((state) => {
        const updatedConvs = state.conversations.map((c) => {
          if (c.id === data.conversation_id) {
            return {
              ...c,
              last_message: data.last_message,
              unread_count: data.unread_count,
              updated_at: data.last_message.created_at
            };
          }
          return c;
        });

        // Re-sort
        const sortedConvs = [...updatedConvs].sort(
          (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );

        return { conversations: sortedConvs };
      });
    });

    socket.on('unread_count_update', (data: { conversation_id: string; unread_count: number }) => {
      useChatStore.getState().markConversationRead(data.conversation_id);
    });

    return () => {
      // Note: We don't disconnect on unmount to keep socket connection alive across pages, 
      // but if user logs out (handled in first useEffect dependency check) we will clean it up.
    };
  }, [accessToken, user]);

  // Actions
  const joinRoom = (conversationId: string) => {
    if (globalSocket && globalSocket.connected) {
      globalSocket.emit('join_room', { conversation_id: conversationId });
    }
  };

  const leaveRoom = (conversationId: string) => {
    if (globalSocket && globalSocket.connected) {
      globalSocket.emit('leave_room', { conversation_id: conversationId });
    }
  };

  const sendTypingStatus = (conversationId: string, isTyping: boolean) => {
    if (globalSocket && globalSocket.connected) {
      globalSocket.emit('typing_status', { conversation_id: conversationId, is_typing: isTyping });
    }
  };

  const emitSendMessage = (
    conversationId: string, 
    text: string | null, 
    parentMessageId: string | null = null, 
    clientMsgId: string,
    attachment: { file_url: string; file_type: string; file_size: number } | null = null
  ) => {
    if (globalSocket && globalSocket.connected) {
      globalSocket.emit('send_message', {
        conversation_id: conversationId,
        text,
        message_type: attachment ? 'attachment' : 'text',
        parent_message_id: parentMessageId,
        client_msg_id: clientMsgId,
        attachment
      });
    }
  };

  const emitMarkRead = (conversationId: string, messageIds: string[]) => {
    if (globalSocket && globalSocket.connected && messageIds.length > 0) {
      globalSocket.emit('mark_read', {
        conversation_id: conversationId,
        message_ids: messageIds
      });
    }
  };

  const emitSendReaction = (conversationId: string, messageId: string, emoji: string) => {
    if (globalSocket && globalSocket.connected) {
      globalSocket.emit('send_reaction', {
        conversation_id: conversationId,
        message_id: messageId,
        emoji
      });
    }
  };

  return {
    isConnected,
    socket: globalSocket,
    joinRoom,
    leaveRoom,
    sendTypingStatus,
    emitSendMessage,
    emitMarkRead,
    emitSendReaction
  };
};
export { globalSocket };
