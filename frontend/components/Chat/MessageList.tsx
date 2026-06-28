'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useChatStore } from '@/store/useChatStore';
import { formatDateLabel } from '@/utils/formatters';
import MessageBubble from './MessageBubble';
import { useInView } from 'react-intersection-observer';
import { api } from '@/services/api';

export default function MessageList() {
  const { activeConversation, messages, typingStates, prependMessages } = useChatStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isFetching, setIsFetching] = useState(false);

  const { ref, inView } = useInView({
    threshold: 0.1,
  });

  // Reset pagination state when conversation changes
  useEffect(() => {
    setHasMore(true);
  }, [activeConversation?.id]);

  useEffect(() => {
    if (inView && hasMore && !isFetching && activeConversation) {
      const fetchMore = async () => {
        setIsFetching(true);
        try {
          const olderMsgs = await api.getMessages(activeConversation.id, 50, messages.length);
          if (olderMsgs.length < 50) {
            setHasMore(false);
          }
          
          // Save current scroll position
          const scrollContainer = containerRef.current;
          let scrollHeightBefore = 0;
          if (scrollContainer) {
            scrollHeightBefore = scrollContainer.scrollHeight;
          }
          
          prependMessages(olderMsgs.reverse());
          
          // Restore scroll position so it doesn't jump to top
          setTimeout(() => {
            if (scrollContainer) {
              const scrollHeightAfter = scrollContainer.scrollHeight;
              scrollContainer.scrollTop = scrollHeightAfter - scrollHeightBefore;
            }
          }, 0);
        } catch (e) {
          console.error(e);
        } finally {
          setIsFetching(false);
        }
      };
      fetchMore();
    }
  }, [inView, hasMore, isFetching, activeConversation, messages.length, prependMessages]);

  useEffect(() => {
    // Only smooth scroll if we are near bottom already, otherwise jumping is annoying
    const scrollContainer = containerRef.current;
    if (scrollContainer) {
      const isNearBottom = scrollContainer.scrollHeight - scrollContainer.scrollTop - scrollContainer.clientHeight < 200;
      if (isNearBottom) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [messages, typingStates]);

  const isSomeoneTyping = activeConversation && 
    Object.keys(typingStates[activeConversation.id] || {}).length > 0;

  return (
    <div ref={containerRef} className="flex-1 min-h-0 overflow-y-auto px-4 py-2 flex flex-col bg-background items-center w-full">
      <div className="w-full max-w-[800px] flex flex-col">
        {hasMore && messages.length >= 50 && (
          <div ref={ref} className="w-full h-8 flex items-center justify-center my-2">
            <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></span>
          </div>
        )}
        {messages.map((msg, idx) => {
          const showDateLabel = idx === 0 || 
            formatDateLabel(messages[idx - 1].created_at) !== formatDateLabel(msg.created_at);
            
          const isConsecutive = idx > 0 && 
            messages[idx - 1].sender_id === msg.sender_id &&
            !showDateLabel;

          return (
            <MessageBubble 
              key={msg.id} 
              msg={msg} 
              showDateLabel={showDateLabel} 
              dateLabel={formatDateLabel(msg.created_at)}
              isConsecutive={isConsecutive}
            />
          );
        })}
        
        {/* Animated Typing Bubble */}
        {isSomeoneTyping && (
        <div className="flex w-full justify-start mt-2 mb-4">
          <div className="flex items-center gap-1.5 bg-received-bubble px-4 py-2.5 rounded-2xl rounded-tl-sm text-received-bubble-text shadow-sm">
            <span className="flex gap-1 items-center h-4">
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '300ms' }} />
            </span>
          </div>
        </div>
        )}
      </div>
      <div ref={messagesEndRef} />
    </div>
  );
}
