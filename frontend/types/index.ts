export interface User {
  id: string;
  phone: string;
  username: string;
  display_name: string;
  bio: string;
  avatar_url?: string | null;
  created_at: string;
}

export interface Contact {
  id: string;
  user_id: string;
  contact_user_id: string;
  is_blocked: boolean;
  created_at: string;
  contact_user: User;
}

export interface LastMessage {
  id: string;
  sender_id: string;
  text?: string | null;
  message_type: string;
  created_at: string;
}

export interface ConversationMember {
  id: string;
  conversation_id: string;
  user_id: string;
  is_admin: boolean;
  joined_at: string;
  user: User;
}

export interface Conversation {
  id: string;
  name?: string | null;
  is_group: boolean;
  avatar_url?: string | null;
  description?: string | null;
  disappearing_seconds?: number | null;
  created_at: string;
  updated_at: string;
  members: ConversationMember[];
  last_message?: LastMessage | null;
  unread_count: number;
}

export interface Attachment {
  id: string;
  message_id: string;
  file_url: string;
  file_type: string;
  file_size: number;
}

export interface MessageStatus {
  id: string;
  message_id: string;
  user_id: string;
  status: 'sent' | 'delivered' | 'read';
  updated_at: string;
}

export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  text?: string | null;
  parent_message_id?: string | null;
  message_type: 'text' | 'system' | 'attachment';
  disappearing_at?: string | null;
  created_at: string;
  sender: User;
  parent_message?: Message | null;
  attachments: Attachment[];
  statuses: MessageStatus[];
  reactions: MessageReaction[];
  client_msg_id?: string; // Client-only temporary identifier
}

export interface ActiveTypingState {
  conversation_id: string;
  user_id: string;
  is_typing: boolean;
}
