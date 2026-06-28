'use client';

import React, { useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { X, User, Shield, Bell, Moon, Database, HelpCircle, Monitor, LogOut, MessageSquare, Smartphone, Info } from 'lucide-react';

interface SettingsModalProps {
  onClose: () => void;
}

export default function SettingsModal({ onClose }: SettingsModalProps) {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('profile');
  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'appearance', label: 'Appearance', icon: Moon },
    { id: 'chats', label: 'Chats', icon: MessageSquare },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'privacy', label: 'Privacy', icon: Shield },
    { id: 'storage', label: 'Storage', icon: Database },
    { id: 'devices', label: 'Linked Devices', icon: Smartphone },
    { id: 'help', label: 'Help', icon: HelpCircle },
    { id: 'about', label: 'About', icon: Info },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-background w-full max-w-4xl h-[85vh] rounded-2xl shadow-2xl flex overflow-hidden flex-col md:flex-row border border-border">
        
        {/* Settings Sidebar */}
        <div className="w-full md:w-64 bg-muted/30 border-r border-border flex flex-col h-full shrink-0">
          <div className="p-4 flex items-center justify-between border-b border-border md:border-none">
            <h2 className="text-xl font-bold">Settings</h2>
            <button onClick={onClose} className="p-2 md:hidden hover:bg-muted rounded-full">
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto py-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-6 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.id 
                    ? 'bg-primary/10 text-primary border-r-2 border-primary' 
                    : 'text-foreground hover:bg-muted'
                }`}
              >
                <tab.icon className="h-5 w-5" />
                {tab.label}
              </button>
            ))}
          </div>
          
          {/* Sign Out Button */}
          <div className="p-4 border-t border-border mt-auto">
            <button
              onClick={() => {
                localStorage.clear();
                window.location.href = '/login';
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold text-red-500 bg-red-500/10 hover:bg-red-500/20 rounded-xl transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>

        {/* Settings Content */}
        <div className="flex-1 flex flex-col h-full bg-background relative">
          <div className="hidden md:flex absolute top-4 right-4 z-10">
            <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-2xl mx-auto">
              
              {activeTab === 'profile' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                  <h3 className="text-2xl font-bold mb-6">Profile</h3>
                  <div className="flex items-center gap-6">
                    <div className="h-24 w-24 rounded-full bg-muted border border-border flex items-center justify-center overflow-hidden relative group cursor-pointer">
                      {user?.avatar_url ? (
                        <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <User className="h-10 w-10 text-muted-foreground" />
                      )}
                      <div className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center text-white text-xs font-semibold">
                        CHANGE
                      </div>
                    </div>
                    <div>
                      <h4 className="text-xl font-semibold">{user?.display_name}</h4>
                      <p className="text-muted-foreground">@{user?.username}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4 pt-6 border-t border-border">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">About</label>
                      <input 
                        type="text" 
                        value={user?.bio || ''} 
                        readOnly
                        className="w-full mt-1 bg-transparent border-b border-border focus:border-primary outline-none py-2"
                        placeholder="Write something about yourself..."
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Phone Number</label>
                      <div className="py-2 text-foreground">{user?.phone}</div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'appearance' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                  <h3 className="text-2xl font-bold mb-6">Appearance</h3>
                  <div className="space-y-6">
                    <div>
                      <h4 className="font-semibold mb-3">Theme</h4>
                      <div className="grid grid-cols-3 gap-4">
                        <button className="flex flex-col items-center gap-2 p-4 border border-border rounded-xl hover:bg-muted focus:border-primary">
                          <Monitor className="h-8 w-8 text-muted-foreground" />
                          <span className="text-sm font-medium">System</span>
                        </button>
                        <button className="flex flex-col items-center gap-2 p-4 border border-border rounded-xl hover:bg-muted focus:border-primary bg-white text-black">
                          <Moon className="h-8 w-8" />
                          <span className="text-sm font-medium">Light</span>
                        </button>
                        <button className="flex flex-col items-center gap-2 p-4 border border-primary rounded-xl hover:bg-muted/50 bg-slate-950 text-white">
                          <Moon className="h-8 w-8" />
                          <span className="text-sm font-medium text-primary">Dark</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {['chats', 'privacy', 'notifications', 'storage', 'devices', 'help', 'about'].includes(activeTab) && (
                <div className="flex flex-col items-center justify-center h-64 text-center animate-in fade-in">
                  <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mb-4">
                    <Shield className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-bold mb-2 capitalize">{activeTab.replace('-', ' ')}</h3>
                  <p className="text-muted-foreground max-w-sm">
                    Coming Soon! Advanced configuration for {activeTab.replace('-', ' ')} will be available in an upcoming update.
                  </p>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
