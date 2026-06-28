'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Users, Image as ImageIcon, FileText, Link2, Ban, Trash2, UserPlus, Edit2 } from 'lucide-react';
import { useChatStore } from '@/store/useChatStore';
import { useAuthStore } from '@/store/useAuthStore';

interface RightDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function RightDrawer({ isOpen, onClose }: RightDrawerProps) {
  const { activeConversation } = useChatStore();
  const { user } = useAuthStore();

  if (!activeConversation) return null;

  const isGroup = activeConversation.is_group;
  const otherMember = !isGroup ? activeConversation.members.find(m => m.user_id !== user?.id) : null;
  const recipient = otherMember?.user;
  const currentUserMember = isGroup ? activeConversation.members.find(m => m.user_id === user?.id) : null;
  const isCurrentUserAdmin = currentUserMember?.is_admin || false;
  
  const title = isGroup ? activeConversation.name : recipient?.display_name;
  const avatar = isGroup ? activeConversation.avatar_url : recipient?.avatar_url;
  const subtitle = isGroup 
    ? `${activeConversation.members.length} members` 
    : recipient?.phone || `@${recipient?.username}`;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/20 lg:hidden"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed lg:relative right-0 top-0 h-full w-80 bg-background border-l border-border shadow-2xl lg:shadow-none z-50 flex flex-col shrink-0"
          >
            <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
              <h3 className="font-semibold text-lg">{isGroup ? 'Group Info' : 'Contact Info'}</h3>
              <button onClick={onClose} className="p-2 hover:bg-muted rounded-full">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto h-0">
              <div className="flex flex-col items-center px-4 py-4 text-center border-b border-border">
                <div className="h-16 w-16 rounded-full bg-muted border border-border flex items-center justify-center overflow-hidden mb-2">
                  {avatar ? (
                    <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    isGroup ? <Users className="h-8 w-8 text-muted-foreground" /> : <User className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                <h2 className="text-lg font-bold">{title}</h2>
                <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
                
                {!isGroup && recipient?.bio && (
                  <p className="text-sm mt-4 italic">"{recipient.bio}"</p>
                )}
                {isGroup && activeConversation.description && (
                  <p className="text-sm mt-4">{activeConversation.description}</p>
                )}
              </div>

              <div className="px-2 py-2 border-b border-border">
                <div className="px-2 py-1">
                  <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Shared Content</h4>
                  <div className="grid grid-cols-3 gap-2">
                    <button className="flex flex-col items-center justify-center p-3 hover:bg-muted rounded-xl transition-colors">
                      <ImageIcon className="h-6 w-6 text-blue-500 mb-1" />
                      <span className="text-xs">Media</span>
                    </button>
                    <button className="flex flex-col items-center justify-center p-3 hover:bg-muted rounded-xl transition-colors">
                      <FileText className="h-6 w-6 text-orange-500 mb-1" />
                      <span className="text-xs">Files</span>
                    </button>
                    <button className="flex flex-col items-center justify-center p-3 hover:bg-muted rounded-xl transition-colors">
                      <Link2 className="h-6 w-6 text-green-500 mb-1" />
                      <span className="text-xs">Links</span>
                    </button>
                  </div>
                </div>
              </div>
              {isGroup && (
                <div className="px-4 py-2 border-b border-border">
                  <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Members ({activeConversation.members.length})</h4>
                  <div className="space-y-2">
                    {activeConversation.members.map(member => (
                      <div key={member.id} className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
                          {member.user.avatar_url ? (
                            <img src={member.user.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <User className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{member.user_id === user?.id ? 'You' : member.user.display_name}</p>
                        </div>
                        {member.is_admin && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-primary/20 text-primary uppercase">Admin</span>
                        )}
                        {isGroup && isCurrentUserAdmin && member.user_id !== user?.id && (
                          <div className="flex gap-1 ml-2">
                            <button onClick={async () => {
                              try {
                                const { api } = await import('@/services/api');
                                if (member.is_admin) await api.demoteAdmin(activeConversation.id, member.user_id);
                                else await api.promoteAdmin(activeConversation.id, member.user_id);
                                window.dispatchEvent(new Event('reload_data'));
                              } catch (e: any) { alert('Failed: ' + e.message); }
                            }} className="text-[10px] text-muted-foreground hover:text-primary transition-colors">
                              {member.is_admin ? 'Demote' : 'Promote'}
                            </button>
                            <button onClick={async () => {
                              try {
                                const { api } = await import('@/services/api');
                                await api.removeGroupMember(activeConversation.id, member.user_id);
                                window.dispatchEvent(new Event('reload_data'));
                              } catch (e: any) { alert('Failed: ' + e.message); }
                            }} className="text-[10px] text-red-500 hover:text-red-400 transition-colors ml-1">
                              Remove
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="px-2 py-2 space-y-1 border-b border-border">
                {isGroup && isCurrentUserAdmin && (
                  <>
                    <button 
                      onClick={async () => {
                      const username = prompt('Enter the exact username to add:');
                      if (username) {
                        try {
                          const { api } = await import('@/services/api');
                          const search = await api.searchUsers(username);
                          const target = search.find((u: any) => u.username === username);
                          if (!target) return alert('User not found.');
                          await api.addGroupMember(activeConversation.id, target.id);
                          window.dispatchEvent(new Event('reload_data'));
                          alert('Member added successfully.');
                        } catch (e: any) { alert('Failed to add member: ' + e.message); }
                      }
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-primary hover:bg-primary/10 rounded-xl transition-colors"
                  >
                    <UserPlus className="h-4 w-4" />
                    <span className="font-semibold text-sm">Add Member</span>
                  </button>
                  <button 
                    onClick={async () => {
                      const newName = prompt('Enter new group name:', activeConversation.name || '');
                      if (newName && newName !== activeConversation.name) {
                        try {
                          const { api } = await import('@/services/api');
                          await api.updateGroup(activeConversation.id, { name: newName });
                          window.dispatchEvent(new Event('reload_data'));
                        } catch (e: any) { alert('Failed to rename: ' + e.message); }
                      }
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-primary hover:bg-primary/10 rounded-xl transition-colors"
                  >
                    <Edit2 className="h-4 w-4" />
                    <span className="font-semibold text-sm">Rename Group</span>
                  </button>
                  <button 
                    onClick={async () => {
                      if (confirm('Are you sure you want to permanently delete this group?')) {
                        try {
                          const { api } = await import('@/services/api');
                          await api.deleteGroup(activeConversation.id);
                          useChatStore.getState().setActiveConversation(null);
                          window.dispatchEvent(new Event('reload_data'));
                        } catch (e: any) { alert('Failed to delete group: ' + e.message); }
                      }
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-red-500 hover:bg-red-500/10 rounded-xl transition-colors"
                  >
                      <Trash2 className="h-4 w-4" />
                      <span className="font-semibold text-sm">Delete Group</span>
                    </button>
                  </>
                )}
                {isGroup && (
                  <button onClick={() => alert('Leaving groups is coming soon.')} className="w-full flex items-center gap-3 px-3 py-2 text-red-500 hover:bg-red-500/10 rounded-xl transition-colors">
                    <Ban className="h-4 w-4" />
                    <span className="font-semibold text-sm">Leave Group</span>
                  </button>
                )}
                {!isGroup && (
                  <button className="w-full flex items-center gap-3 px-3 py-2 text-red-500 hover:bg-red-500/10 rounded-xl transition-colors">
                    <Ban className="h-4 w-4" />
                    <span className="font-semibold text-sm">Block Contact</span>
                  </button>
                )}
                <button className="w-full flex items-center gap-3 px-3 py-2 text-red-500 hover:bg-red-500/10 rounded-xl transition-colors">
                  <Trash2 className="h-4 w-4" />
                  <span className="font-semibold text-sm">Clear Chat History</span>
                </button>
              </div>



            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
