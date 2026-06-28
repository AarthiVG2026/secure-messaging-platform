import { create } from 'zustand';

interface UIState {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  
  replyingTo: any | null;
  setReplyingTo: (msg: any | null) => void;
  
  showProfileModal: boolean;
  setShowProfileModal: (show: boolean) => void;
  
  showAddContactModal: boolean;
  setShowAddContactModal: (show: boolean) => void;
  
  showCreateGroupModal: boolean;
  setShowCreateGroupModal: (show: boolean) => void;
  
  showSettingsModal: boolean;
  setShowSettingsModal: (show: boolean) => void;
  
  showInfoDrawer: boolean;
  setShowInfoDrawer: (show: boolean) => void;
  
  showNewChatModal: boolean;
  setShowNewChatModal: (show: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  searchQuery: '',
  setSearchQuery: (q) => set({ searchQuery: q }),
  
  replyingTo: null,
  setReplyingTo: (msg) => set({ replyingTo: msg }),
  
  showProfileModal: false,
  setShowProfileModal: (show) => set({ showProfileModal: show }),
  
  showAddContactModal: false,
  setShowAddContactModal: (show) => set({ showAddContactModal: show }),
  
  showCreateGroupModal: false,
  setShowCreateGroupModal: (show) => set({ showCreateGroupModal: show }),
  
  showSettingsModal: false,
  setShowSettingsModal: (show) => set({ showSettingsModal: show }),
  
  showInfoDrawer: false,
  setShowInfoDrawer: (show) => set({ showInfoDrawer: show }),
  
  showNewChatModal: false,
  setShowNewChatModal: (show) => set({ showNewChatModal: show }),
}));
