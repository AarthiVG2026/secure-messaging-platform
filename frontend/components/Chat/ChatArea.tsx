'use client';

import React, { useState } from 'react';
import { useChatStore } from '@/store/useChatStore';
import { Shield, UploadCloud } from 'lucide-react';
import ChatHeader from './ChatHeader';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import RightDrawer from './RightDrawer';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/useAuthStore';
import { useSocket } from '@/hooks/useSocket';
import { useUIStore } from '@/store/useUIStore';

export default function ChatArea() {
  const { user } = useAuthStore();
  const { activeConversation, messages, setMessages } = useChatStore();
  const { setReplyingTo, showInfoDrawer, setShowInfoDrawer } = useUIStore();
  const { joinRoom, leaveRoom, emitMarkRead } = useSocket();
  const [isDragging, setIsDragging] = useState(false);
  const [droppedFile, setDroppedFile] = useState<File | null>(null);

  React.useEffect(() => {
    if (!activeConversation) return;

    const loadMessages = async () => {
      try {
        const msgs = await api.getMessages(activeConversation.id);
        setMessages(msgs.reverse());
        joinRoom(activeConversation.id);
        
        const unreadMsgIds = msgs
          .filter((m: any) => {
            const isSelf = m.sender_id === user?.id;
            const hasRead = m.statuses.some((s: any) => s.user_id === user?.id && s.status === 'read');
            return !isSelf && !hasRead;
          })
          .map((m: any) => m.id);
          
        if (unreadMsgIds.length > 0) {
          emitMarkRead(activeConversation.id, unreadMsgIds);
        }
      } catch (e) {
        console.error('Failed to load messages:', e);
      }
    };

    loadMessages();
    setReplyingTo(null);

    return () => {
      if (activeConversation) {
        leaveRoom(activeConversation.id);
      }
    };
  }, [activeConversation]);

  if (!activeConversation) {
    return (
      <div className="flex h-full flex-1 flex-col items-center justify-center p-8 text-center select-none bg-sidebar relative overflow-hidden">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
        
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-background border border-border shadow-sm mb-6 z-10 relative">
          <Shield className="h-10 w-10 text-primary stroke-[1.5]" />
          <div className="absolute -bottom-1 -right-1 h-8 w-8 bg-background border border-border rounded-full flex items-center justify-center shadow-sm">
            <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
          </div>
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground z-10">Signal for Desktop</h2>
        <p className="mt-3 text-[15px] max-w-md leading-relaxed text-muted-foreground z-10">
          Send and receive messages without keeping your phone online.
          <br/>
          Use Signal on up to 5 linked devices and 1 phone at the same time.
        </p>
      </div>
    );
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setDroppedFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="flex h-full flex-1 flex-row min-w-0 min-h-0 overflow-hidden bg-background relative">
      <div 
        className="flex h-full flex-1 flex-col min-w-0 min-h-0 relative"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
      {isDragging && (
        <div className="absolute inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center border-4 border-dashed border-primary m-4 rounded-3xl">
          <div className="flex flex-col items-center p-8 bg-card rounded-2xl shadow-2xl">
            <div className="h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <UploadCloud className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-xl font-bold">Drop files to send</h3>
            <p className="text-muted-foreground mt-2 text-sm">Supports Images, PDFs, Videos, Audio, ZIP</p>
          </div>
        </div>
      )}
      
      <ChatHeader />
      
      {messages.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground select-none bg-background">
          <Shield className="h-10 w-10 text-primary mb-3 stroke-[1.5]" />
          <h4 className="text-sm font-semibold text-foreground">End-to-End Encryption</h4>
          <p className="text-xs max-w-[280px] mt-1 leading-relaxed">
            Messages and calls are secured with end-to-end encryption. Nobody outside of this chat, not even the server, can read or listen to them.
          </p>
        </div>
      ) : (
        <MessageList />
      )}

      <MessageInput droppedFile={droppedFile} onClearDroppedFile={() => setDroppedFile(null)} />
      
      </div>
      
      <RightDrawer isOpen={showInfoDrawer} onClose={() => setShowInfoDrawer(false)} />
    </div>
  );
}
