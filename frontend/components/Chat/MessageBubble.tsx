'use client';

import React from 'react';
import { Message } from '@/types';
import { useAuthStore } from '@/store/useAuthStore';
import { useChatStore } from '@/store/useChatStore';
import { useUIStore } from '@/store/useUIStore';
import { useSocket } from '@/hooks/useSocket';
import { Check, CheckCheck, Paperclip, Reply, Copy, Trash2, Smile, Forward, Edit3, Info } from 'lucide-react';
import { decryptMessage } from '@/utils/crypto';
import { formatTime } from '@/utils/formatters';
import ContextMenu, { ContextMenuItem } from '../Shared/ContextMenu';
import { toast } from 'sonner';

interface MessageBubbleProps {
  msg: Message;
  showDateLabel: boolean;
  dateLabel: string;
  isConsecutive?: boolean;
}

export default React.memo(function MessageBubble({ msg, showDateLabel, dateLabel, isConsecutive }: MessageBubbleProps) {
  const { user } = useAuthStore();
  const { activeConversation, deleteMessageRecord } = useChatStore();
  const { setReplyingTo } = useUIStore();
  const { emitSendReaction } = useSocket();

  const [contextMenu, setContextMenu] = React.useState<{ x: number, y: number } | null>(null);

  const isSelf = msg.sender_id === user?.id;
  const decryptedText = decryptMessage(msg.text);
  const isSystem = msg.message_type === 'system';
  
  const handleDeleteMessage = async () => {
    if (!confirm('Are you sure you want to delete this message?')) return;
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`http://localhost:8000/api/messages/${msg.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        deleteMessageRecord(msg.id);
      } else {
        alert('Failed to delete message.');
      }
    } catch (e) {
      alert('Error deleting message.');
    }
  };

  if (isSystem) {
    return (
      <div className="flex flex-col items-center space-y-2 select-none my-4">
        {showDateLabel && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-muted text-muted-foreground uppercase tracking-wider">
            {dateLabel}
          </span>
        )}
        <span className="text-xs italic text-muted-foreground py-1 bg-muted px-4 rounded-full border border-border">
          {decryptedText}
        </span>
      </div>
    );
  }

  // Find statuses
  const hasRead = msg.statuses.some((s) => s.user_id !== user?.id && s.status === 'read');
  const hasDelivered = msg.statuses.some((s) => s.user_id !== user?.id && s.status === 'delivered');

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const getContextMenuItems = (): ContextMenuItem[] => {
    const items: ContextMenuItem[] = [
      { label: 'Reply', icon: <Reply className="h-4 w-4" />, onClick: () => setReplyingTo(msg) },
      { label: 'Forward', icon: <Forward className="h-4 w-4" />, onClick: () => toast.info('Forwarding coming soon!') },
      { label: 'Copy Text', icon: <Copy className="h-4 w-4" />, onClick: () => {
        navigator.clipboard.writeText(decryptedText);
        toast.success('Copied to clipboard');
      }},
    ];
    if (isSelf) {
      items.push({ label: 'Edit', icon: <Edit3 className="h-4 w-4" />, onClick: () => toast.info('Message editing coming soon!') });
      items.push({ label: 'Message Info', icon: <Info className="h-4 w-4" />, onClick: () => toast.info('Message info coming soon!') });
      items.push({ label: 'Delete', icon: <Trash2 className="h-4 w-4" />, onClick: handleDeleteMessage, destructive: true });
    }
    return items;
  };

  return (
    <div className={`flex flex-col ${isConsecutive ? 'mt-[2px]' : 'mt-2'} mb-[2px]`}>
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={getContextMenuItems()}
          onClose={() => setContextMenu(null)}
        />
      )}

      {showDateLabel && (
        <div className="flex justify-center select-none my-5">
          <span className="text-xs font-medium px-3 py-1 rounded-full bg-muted/50 text-muted-foreground uppercase tracking-wider">
            {dateLabel}
          </span>
        </div>
      )}

      <div className={`flex w-full ${isSelf ? 'justify-end' : 'justify-start'}`}>
        <div className={`flex flex-col max-w-[75%] lg:max-w-[65%] group relative`}>
          
          {/* Group sender name header */}
          {!isSelf && activeConversation?.is_group && !isConsecutive && (
            <span className="text-[12px] font-semibold text-muted-foreground ml-3 mb-1">
              {msg.sender.display_name}
            </span>
          )}

          {/* Bubble Container */}
          <div 
            onContextMenu={handleContextMenu}
            className={`relative px-3 py-2 text-[15px] leading-snug shadow-sm ${
            isSelf
              ? `bg-sent-bubble text-primary-foreground ${isConsecutive ? 'rounded-2xl rounded-tr-md' : 'rounded-2xl rounded-tr-sm'}`
              : `bg-received-bubble text-received-bubble-text ${isConsecutive ? 'rounded-2xl rounded-tl-md' : 'rounded-2xl rounded-tl-sm'}`
          }`}>
            
            {/* Quoted parent reply box */}
            {msg.parent_message && (
              <div className={`mb-2 rounded-lg p-2 text-xs border-l-4 cursor-pointer hover:opacity-90 transition-opacity ${
                isSelf 
                  ? 'bg-black/20 border-white/50 text-primary-foreground/90' 
                  : 'bg-black/5 dark:bg-white/10 border-primary text-foreground/90'
              }`}>
                <span className={`font-bold block mb-0.5 ${isSelf ? 'text-white' : 'text-primary'}`}>
                  {msg.parent_message.sender_id === user?.id ? 'You' : msg.parent_message.sender.display_name}
                </span>
                <span className="truncate block max-w-[200px]">
                  {decryptMessage(msg.parent_message.text)}
                </span>
              </div>
            )}

            {/* Render media attachments */}
            {msg.message_type === 'attachment' && msg.attachments.length > 0 && (
              <div className="mb-2 overflow-hidden rounded-lg bg-black/10 dark:bg-black/40 max-w-sm">
                {msg.attachments[0].file_type.startsWith('image/') ? (
                  <img
                    src={`http://localhost:8000${msg.attachments[0].file_url}`}
                    alt="Attachment"
                    className="max-h-64 w-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => window.open(`http://localhost:8000${msg.attachments[0].file_url}`)}
                  />
                ) : (
                  <a
                    href={`http://localhost:8000${msg.attachments[0].file_url}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 p-3 text-xs font-semibold hover:underline"
                  >
                    <Paperclip className="h-4 w-4" />
                    <span>Download File ({(msg.attachments[0].file_size / 1024).toFixed(1)} KB)</span>
                  </a>
                )}
              </div>
            )}

            {/* Text payload & Inline Timestamp Container */}
            <div>
              <span className="whitespace-pre-wrap break-words">{decryptedText}</span>
              
              {/* Timestamp & Receipt checkmarks floated inside bubble */}
              <span className={`inline-flex items-center gap-1 text-[11px] select-none float-right relative top-1.5 ml-3 ${
                isSelf ? 'text-primary-foreground/80' : 'text-muted-foreground'
              }`}>
                {formatTime(msg.created_at)}
                
                {isSelf && (
                  <span className="flex ml-0.5">
                    {hasRead ? (
                      <CheckCheck className="h-4 w-4 stroke-[2.5]" />
                    ) : hasDelivered ? (
                      <CheckCheck className="h-4 w-4 stroke-[2.5] opacity-60" />
                    ) : (
                      <Check className="h-4 w-4 stroke-[2.5] opacity-60" />
                    )}
                  </span>
                )}
              </span>
              <div className="clear-both" />
            </div>

            {/* Reactions */}
            {msg.reactions && msg.reactions.length > 0 && (
              <div className={`absolute -bottom-3 ${isSelf ? 'right-0' : 'left-0'} flex flex-wrap gap-1 z-10`}>
                {Array.from(new Set(msg.reactions.map(r => r.emoji))).map(emoji => {
                  const count = msg.reactions!.filter(r => r.emoji === emoji).length;
                  const userReacted = msg.reactions!.some(r => r.emoji === emoji && r.user_id === user?.id);
                  return (
                    <button
                      key={emoji}
                      onClick={() => emitSendReaction(activeConversation!.id, msg.id, emoji)}
                      className={`flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] shadow-sm border ${
                        userReacted 
                          ? 'bg-blue-100 dark:bg-blue-900 border-blue-500 text-blue-900 dark:text-blue-100' 
                          : 'bg-background border-border text-foreground hover:bg-muted'
                      } transition-colors`}
                    >
                      <span>{emoji}</span>
                      {count > 1 && <span>{count}</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Message actions triggers below bubble (delete, reply) */}
          <div className={`opacity-0 group-hover:opacity-100 flex gap-2 mt-1 px-1 transition-opacity absolute top-1/2 -translate-y-1/2 ${
            isSelf ? '-left-24' : '-right-24'
          }`}>
            <div className="flex gap-1.5 bg-background border border-border shadow-sm rounded-full px-2 py-1 items-center">
              {['👍', '❤️', '😂', '😮'].map(emoji => (
                <button
                  key={emoji}
                  onClick={() => emitSendReaction(activeConversation!.id, msg.id, emoji)}
                  className="text-sm hover:scale-125 transition-transform"
                >
                  {emoji}
                </button>
              ))}
              <div className="w-px h-3 bg-border mx-1"></div>
              <button
                onClick={() => setReplyingTo(msg)}
                className="text-[10px] font-semibold text-muted-foreground hover:text-foreground transition-colors uppercase tracking-wider"
              >
                Reply
              </button>
              {isSelf && (
                <>
                  <div className="w-px h-3 bg-border mx-1"></div>
                  <button
                    onClick={handleDeleteMessage}
                    className="text-[10px] font-semibold text-red-500 hover:text-red-400 transition-colors uppercase tracking-wider"
                  >
                    Del
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
