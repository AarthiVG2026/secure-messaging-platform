'use client';

import React, { useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { useChatStore } from '@/store/useChatStore';
import { useUIStore } from '@/store/useUIStore';
import { api } from '@/services/api';
import { X, Settings, Sun, Moon, Users, LogOut, User as UserIcon } from 'lucide-react';
import { User } from '@/types';
import { AnimatePresence, motion } from 'framer-motion';
import SettingsModal from './SettingsModal';

const ModalWrapper = ({ children, onClose }: { children: React.ReactNode, onClose: () => void }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
  >
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.95, opacity: 0 }}
      className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl text-foreground"
    >
      {children}
    </motion.div>
  </motion.div>
);

export default function AllModals() {
  const { user, updateUser } = useAuthStore();
  const activeConversation = useChatStore(state => state.activeConversation);
  const setActiveConversation = useChatStore(state => state.setActiveConversation);
  
  const {
    showProfileModal, setShowProfileModal,
    showAddContactModal, setShowAddContactModal,
    showCreateGroupModal, setShowCreateGroupModal,
    showSettingsModal, setShowSettingsModal,
    showInfoDrawer, setShowInfoDrawer,
    showNewChatModal, setShowNewChatModal
  } = useUIStore();

  // Global Keyboard Shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowProfileModal(false);
        setShowAddContactModal(false);
        setShowCreateGroupModal(false);
        setShowSettingsModal(false);
        setShowInfoDrawer(false);
        setShowNewChatModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    setShowProfileModal, setShowAddContactModal, setShowCreateGroupModal, 
    setShowSettingsModal, setShowInfoDrawer, setShowNewChatModal
  ]);

  // Profile State
  const [profileName, setProfileName] = useState(user?.display_name || '');
  const [profileBio, setProfileBio] = useState(user?.bio || '');
  const [profileAvatar, setProfileAvatar] = useState(user?.avatar_url || '');

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updatedUser = await api.updateProfile({
        display_name: profileName,
        bio: profileBio,
        avatar_url: profileAvatar || undefined
      });
      updateUser(updatedUser);
      setShowProfileModal(false);
    } catch (e) {
      alert('Failed to update profile settings.');
    }
  };

  // Contacts
  const [contactSearchQuery, setContactSearchQuery] = useState('');
  const [contactNickname, setContactNickname] = useState('');
  const [contactSearchResults, setContactSearchResults] = useState<User[]>([]);
  const [contactError, setContactError] = useState('');
  const [contactSuccess, setContactSuccess] = useState('');

  const searchNewContact = async () => {
    if (contactSearchQuery.length < 2) return;
    setContactError('');
    setContactSuccess('');
    try {
      const results = await api.searchUsers(contactSearchQuery);
      setContactSearchResults(results);
      if (results.length === 0) setContactError('No Signal user found with this phone number.');
    } catch (e) {
      setContactError('No Signal user found with this phone number.');
    }
  };

  const addContactByIdentifier = async (identifier: string) => {
    setContactError('');
    setContactSuccess('');
    try {
      await api.addContact(identifier, contactNickname || undefined);
      setContactSuccess(`Contact added successfully.`);
      setContactSearchQuery('');
      setContactNickname('');
      setContactSearchResults([]);
      window.dispatchEvent(new Event('reload_data'));
    } catch (err: any) {
      setContactError(err.message === 'This contact already exists.' ? err.message : 'Failed to add contact.');
    }
  };

  const initiateDM = async (recipientId: string) => {
    try {
      const conv = await api.startConversation(recipientId);
      setActiveConversation(conv);
      setShowAddContactModal(false);
      setShowNewChatModal(false);
      window.dispatchEvent(new Event('reload_data'));
    } catch (e) {
      alert('Failed to initiate conversation.');
    }
  };

  // Group Create
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [contactsList, setContactsList] = useState<any[]>([]);

  React.useEffect(() => {
    if (showCreateGroupModal || showNewChatModal) {
      api.getContacts().then(setContactsList).catch(console.error);
    }
  }, [showCreateGroupModal, showNewChatModal]);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim() || selectedContacts.length === 0) return alert('Enter name and choose contacts.');
    try {
      const newGroup = await api.createGroup({
        name: groupName.trim(),
        description: groupDesc.trim() || undefined,
        member_ids: selectedContacts
      });
      setActiveConversation(newGroup);
      setGroupName('');
      setGroupDesc('');
      setSelectedContacts([]);
      setShowCreateGroupModal(false);
      window.dispatchEvent(new Event('reload_data'));
    } catch (err: any) {
      alert(`Failed to create group: ${err.message}`);
    }
  };



  return (
    <AnimatePresence>
      {showProfileModal && (
        <ModalWrapper onClose={() => setShowProfileModal(false)}>
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h3 className="text-sm font-bold">Edit Profile</h3>
            <button onClick={() => setShowProfileModal(false)} className="rounded-full p-1 hover:bg-muted text-muted-foreground"><X className="h-4 w-4" /></button>
          </div>
          <form onSubmit={handleUpdateProfile} className="mt-4 space-y-4">
            <div>
              <label className="block text-[10px] font-semibold text-muted-foreground uppercase">Display Name</label>
              <input type="text" value={profileName} onChange={e => setProfileName(e.target.value)} className="block w-full rounded-lg border border-border bg-background mt-1 py-2 px-3 text-sm focus:border-primary focus:outline-none" required />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-muted-foreground uppercase">Bio / Status</label>
              <input type="text" value={profileBio} onChange={e => setProfileBio(e.target.value)} className="block w-full rounded-lg border border-border bg-background mt-1 py-2 px-3 text-sm focus:border-primary focus:outline-none" />
            </div>
            <div className="flex justify-end gap-3 pt-3 border-t border-border mt-6">
              <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-blue-600">Save</button>
            </div>
          </form>
        </ModalWrapper>
      )}

      {showAddContactModal && (
        <ModalWrapper onClose={() => setShowAddContactModal(false)}>
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h3 className="text-sm font-bold">Add Contact</h3>
            <button onClick={() => setShowAddContactModal(false)} className="rounded-full p-1 hover:bg-muted text-muted-foreground"><X className="h-4 w-4" /></button>
          </div>
          <div className="mt-4 flex flex-col gap-2">
            <input type="text" value={contactSearchQuery} onChange={e => setContactSearchQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && searchNewContact()} className="w-full rounded-lg border border-border bg-background py-2 px-3 text-sm focus:outline-none focus:border-primary" placeholder="Phone Number *" />
            <div className="flex gap-2">
              <input type="text" value={contactNickname} onChange={e => setContactNickname(e.target.value)} className="flex-1 rounded-lg border border-border bg-background py-2 px-3 text-sm focus:outline-none focus:border-primary" placeholder="Nickname (Optional)" />
              <button onClick={searchNewContact} className="rounded-lg bg-muted border border-border px-4 text-xs font-semibold hover:bg-black/5">Search</button>
            </div>
          </div>
          <div className="mt-4 max-h-48 overflow-y-auto space-y-2">
            {contactError && (
              <div className="text-sm text-red-500 bg-red-500/10 p-3 rounded-xl border border-red-500/20 text-center">
                {contactError}
              </div>
            )}
            {contactSuccess && (
              <div className="text-sm text-green-500 bg-green-500/10 p-3 rounded-xl border border-green-500/20 text-center">
                {contactSuccess}
              </div>
            )}
            {!contactError && !contactSuccess && contactSearchResults.map(usr => (
              <div key={usr.id} className="flex items-center justify-between bg-muted/50 border border-border p-3 rounded-xl">
                <div className="flex flex-col">
                  <span className="text-sm font-bold">{usr.display_name}</span>
                  <span className="text-xs text-muted-foreground">{usr.phone || usr.username}</span>
                </div>
                <button onClick={() => addContactByIdentifier(usr.phone)} className="rounded bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-blue-600">Add</button>
              </div>
            ))}
          </div>
        </ModalWrapper>
      )}

      {showNewChatModal && (
        <ModalWrapper onClose={() => setShowNewChatModal(false)}>
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h3 className="text-sm font-bold">Start New Chat</h3>
            <button onClick={() => setShowNewChatModal(false)} className="rounded-full p-1 hover:bg-muted text-muted-foreground"><X className="h-4 w-4" /></button>
          </div>
          <div className="mt-4 max-h-64 overflow-y-auto space-y-1">
            {contactsList.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No contacts found.</p>
            ) : (
              contactsList.map(contact => (
                <button key={contact.id} onClick={() => initiateDM(contact.contact_user.id)} className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-muted transition-colors text-left">
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center border border-border">
                    <UserIcon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="text-sm font-bold truncate">{contact.nickname || contact.contact_user.display_name}</span>
                    <span className="text-xs text-muted-foreground truncate">{contact.contact_user.phone}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </ModalWrapper>
      )}

      {showCreateGroupModal && (
        <ModalWrapper onClose={() => setShowCreateGroupModal(false)}>
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h3 className="text-sm font-bold">Create Group</h3>
            <button onClick={() => setShowCreateGroupModal(false)} className="rounded-full p-1 hover:bg-muted text-muted-foreground"><X className="h-4 w-4" /></button>
          </div>
          <form onSubmit={handleCreateGroup} className="mt-4 space-y-4">
            <div>
              <input type="text" value={groupName} onChange={e => setGroupName(e.target.value)} className="block w-full rounded-lg border border-border bg-background mt-1 py-2 px-3 text-sm focus:border-primary focus:outline-none" placeholder="Group Name *" required />
            </div>
            <div>
              <input type="text" value={groupDesc} onChange={e => setGroupDesc(e.target.value)} className="block w-full rounded-lg border border-border bg-background mt-1 py-2 px-3 text-sm focus:border-primary focus:outline-none" placeholder="Description (Optional)" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-2">Select Contacts</label>
              <div className="max-h-48 overflow-y-auto space-y-1 border border-border rounded-lg p-2 bg-muted/20">
                {contactsList.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-2">No contacts available to add.</p>
                ) : (
                  contactsList.map(contact => (
                    <label key={contact.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer transition-colors">
                      <input 
                        type="checkbox" 
                        checked={selectedContacts.includes(contact.contact_user.id)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedContacts([...selectedContacts, contact.contact_user.id]);
                          else setSelectedContacts(selectedContacts.filter(id => id !== contact.contact_user.id));
                        }}
                        className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                      />
                      <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center border border-border">
                        <UserIcon className="h-3 w-3 text-muted-foreground" />
                      </div>
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="text-sm font-bold truncate">{contact.nickname || contact.contact_user.display_name}</span>
                      </div>
                    </label>
                  ))
                )}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1 text-right">{selectedContacts.length} selected</p>
            </div>
            <div className="flex justify-end gap-3 pt-3 border-t border-border mt-6">
              <button type="button" onClick={() => setShowCreateGroupModal(false)} className="rounded-lg px-4 py-2 text-xs font-semibold hover:bg-muted">Cancel</button>
              <button type="submit" disabled={!groupName.trim() || selectedContacts.length === 0} className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-blue-600 disabled:opacity-50">Create Group</button>
            </div>
          </form>
        </ModalWrapper>
      )}

      {showSettingsModal && (
        <SettingsModal onClose={() => setShowSettingsModal(false)} />
      )}
    </AnimatePresence>
  );
}
