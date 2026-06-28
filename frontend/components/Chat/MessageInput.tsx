'use client';

import React, { useRef, useState } from 'react';
import { useChatStore } from '@/store/useChatStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useUIStore } from '@/store/useUIStore';
import { useSocket } from '@/hooks/useSocket';
import { Smile, Paperclip, Send, X, Mic } from 'lucide-react';
import { decryptMessage, encryptMessage } from '@/utils/crypto';
import { api } from '@/services/api';
import { Message } from '@/types';

interface MessageInputProps {
  droppedFile?: File | null;
  onClearDroppedFile?: () => void;
}

export default function MessageInput({ droppedFile, onClearDroppedFile }: MessageInputProps) {
  const { user } = useAuthStore();
  const { activeConversation, typingStates, addMessage } = useChatStore();
  const { replyingTo, setReplyingTo } = useUIStore();
  const { sendTypingStatus, emitSendMessage } = useSocket();
  
  const [inputText, setInputText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);

  if (!activeConversation) return null;

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    
    // Auto-grow textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      sendTypingStatus(activeConversation.id, true);
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      sendTypingStatus(activeConversation.id, false);
    }, 2000);
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !user) return;

    const textPayload = inputText.trim();
    setInputText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    isTypingRef.current = false;
    sendTypingStatus(activeConversation.id, false);

    const clientMsgId = Math.random().toString();
    const optimisticMsg: Message = {
      id: clientMsgId,
      conversation_id: activeConversation.id,
      sender_id: user.id,
      text: encryptMessage(textPayload),
      parent_message_id: replyingTo?.id || null,
      parent_message: replyingTo,
      message_type: 'text',
      created_at: new Date().toISOString(),
      sender: user,
      attachments: [],
      statuses: [{ id: '1', message_id: clientMsgId, user_id: user.id, status: 'sent', updated_at: new Date().toISOString() }],
      reactions: [],
      client_msg_id: clientMsgId
    };
    
    addMessage(optimisticMsg);
    setReplyingTo(null);

    emitSendMessage(
      activeConversation.id,
      encryptMessage(textPayload),
      replyingTo?.id || null,
      clientMsgId
    );
  };

  const processFile = async (file: File) => {
    if (!file || !user) return;

    try {
      // Create a mock local object URL so it previews immediately without needing an actual backend upload endpoint
      const mockUrl = URL.createObjectURL(file);
      const clientMsgId = Math.random().toString();
      
      const optimisticMsg: Message = {
        id: clientMsgId,
        conversation_id: activeConversation.id,
        sender_id: user.id,
        text: encryptMessage(file.name),
        parent_message_id: null,
        message_type: 'attachment',
        created_at: new Date().toISOString(),
        sender: user,
        attachments: [{
          id: Math.random().toString(),
          message_id: clientMsgId,
          file_url: mockUrl,
          file_type: file.type || 'application/octet-stream',
          file_size: file.size
        }],
        statuses: [{ id: '1', message_id: clientMsgId, user_id: user.id, status: 'sent', updated_at: new Date().toISOString() }],
        reactions: [],
        client_msg_id: clientMsgId
      };
      
      addMessage(optimisticMsg);
      
      emitSendMessage(
        activeConversation.id,
        encryptMessage(file.name),
        null,
        clientMsgId,
        {
          file_url: mockUrl,
          file_type: file.type || 'application/octet-stream',
          file_size: file.size
        }
      );
    } catch (err: any) {
      alert(`Upload failed: ${err.message}`);
    }
  };

  React.useEffect(() => {
    if (droppedFile) {
      processFile(droppedFile);
      if (onClearDroppedFile) onClearDroppedFile();
    }
  }, [droppedFile]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };



  return (
    <div className="flex-shrink-0 w-full px-4 py-3 bg-background flex flex-col items-center justify-center">
      
      {/* Replying banner indicator */}
      {replyingTo && (
        <div className="flex w-full max-w-3xl items-center justify-between bg-black/5 dark:bg-white/5 border-l-4 border-primary px-4 py-2 text-xs text-foreground mb-1 rounded-t-lg z-10 shadow-sm relative">
          <div className="flex flex-col min-w-0 pr-4">
            <span className="font-bold text-primary">Replying to {replyingTo.sender_id === user?.id ? 'yourself' : replyingTo.sender.display_name}</span>
            <span className="truncate text-muted-foreground mt-0.5">{decryptMessage(replyingTo.text)}</span>
          </div>
          <button onClick={() => setReplyingTo(null)} className="p-1 rounded-full hover:bg-black/10 dark:bg-white/10 transition-colors">
            <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
          </button>
        </div>
      )}

      {/* Input Form Wrapper */}
      <div className="w-full max-w-3xl relative">
        <form onSubmit={handleSendMessage} className="flex items-end gap-1.5 bg-sidebar rounded-[24px] px-3 py-1.5 border border-border focus-within:border-border transition-colors shadow-sm">
          
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
          />
          
          <button
            type="button"
            className="p-2 mb-0.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors flex-shrink-0"
            title="Emojis"
          >
            <Smile className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2 mb-0.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors flex-shrink-0"
            title="Upload Media"
          >
            <Paperclip className="h-5 w-5" />
          </button>

          <textarea
            ref={textareaRef}
            rows={1}
            value={inputText}
            onChange={handleInputChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            className="flex-1 max-h-[120px] bg-transparent resize-none py-2.5 px-1 text-[15px] text-foreground placeholder-muted-foreground focus:outline-none"
            placeholder="Type a message"
          />

          {inputText.trim() ? (
            <button
              type="submit"
              className="p-2 mb-0.5 bg-primary text-primary-foreground hover:bg-blue-600 rounded-full transition-colors flex-shrink-0"
            >
              <Send className="h-4 w-4 ml-0.5" />
            </button>
          ) : (
            <button
              type="button"
              className="p-2 mb-0.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors flex-shrink-0 cursor-not-allowed"
              title="Voice Message"
            >
              <Mic className="h-5 w-5" />
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
