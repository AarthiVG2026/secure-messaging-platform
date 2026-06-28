'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/useAuthStore';
import { Shield, Smartphone, Key, Lock, User, AtSign, Eye, EyeOff } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const { setAuth, isAuthenticated } = useAuthStore();
  
  // Registration States
  const [phone, setPhone] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState(1); // 1: Registration Form, 2: OTP Confirm
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  const handleDetailsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !username || !displayName || !password) {
      setError('Please fill in all fields.');
      return;
    }
    if (username.length < 3) {
      setError('Username must be at least 3 characters.');
      return;
    }
    setError('');
    // Advance to OTP prompt step
    setStep(2);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) {
      setError('Please enter the OTP.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await api.register({
        phone,
        username: username.toLowerCase().trim(),
        display_name: displayName.trim(),
        password,
        otp
      });
      
      setAuth(response.user, response.access_token, response.refresh_token);
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please review user details.');
      setStep(1); // Return to form
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-screen items-center justify-center bg-zinc-950 px-4 py-12 font-sans select-none text-zinc-100">
      <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-zinc-950 to-zinc-950 pointer-events-none" />
      
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/70 p-8 shadow-2xl backdrop-blur-xl transition-all duration-300">
        
        {/* Logo */}
        <div className="flex flex-col items-center justify-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 shadow-lg shadow-blue-500/20">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <h2 className="mt-4 text-2xl font-bold tracking-tight">Create Account</h2>
          <p className="mt-2 text-sm text-zinc-400">Join a privacy-focused network.</p>
        </div>

        {error && (
          <div className="mt-6 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400">
            {error}
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleDetailsSubmit} className="mt-6 space-y-4">
            
            <div>
              <label htmlFor="displayName" className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Display Name
              </label>
              <div className="relative mt-1">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <User className="h-4 w-4 text-zinc-500" />
                </div>
                <input
                  type="text"
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="block w-full rounded-xl border border-zinc-800 bg-zinc-950/50 py-3 pl-10 pr-3 text-sm placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                  placeholder="e.g. John Doe"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="phone" className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Phone Number
              </label>
              <div className="relative mt-1">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Smartphone className="h-4 w-4 text-zinc-500" />
                </div>
                <input
                  type="tel"
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="block w-full rounded-xl border border-zinc-800 bg-zinc-950/50 py-3 pl-10 pr-3 text-sm placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                  placeholder="e.g. +1234567890"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="username" className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Username
              </label>
              <div className="relative mt-1">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <AtSign className="h-4 w-4 text-zinc-500" />
                </div>
                <input
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full rounded-xl border border-zinc-800 bg-zinc-950/50 py-3 pl-10 pr-3 text-sm placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                  placeholder="e.g. johndoe"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Password
              </label>
              <div className="relative mt-1">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Lock className="h-4 w-4 text-zinc-500" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-xl border border-zinc-800 bg-zinc-950/50 py-3 pl-10 pr-10 text-sm placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                  placeholder="password123"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-zinc-500 hover:text-zinc-300" />
                  ) : (
                    <Eye className="h-4 w-4 text-zinc-500 hover:text-zinc-300" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="mt-6 w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/10 hover:bg-blue-500 focus:outline-none active:scale-95 transition-all duration-200"
            >
              Continue
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegisterSubmit} className="mt-6 space-y-4">
            <div className="rounded-lg bg-zinc-950/40 border border-zinc-800/50 p-4 text-center">
              <span className="text-xs text-zinc-400">
                To verify this account registration, please enter code <strong className="text-blue-500">123456</strong>.
              </span>
            </div>

            <div>
              <label htmlFor="otp" className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider text-center">
                Verification Code (OTP)
              </label>
              <div className="relative mt-2 max-w-[200px] mx-auto">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Key className="h-4 w-4 text-zinc-500" />
                </div>
                <input
                  type="text"
                  id="otp"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  className="block w-full rounded-xl border border-zinc-800 bg-zinc-950/50 py-3 pl-10 pr-3 text-center text-lg font-bold tracking-[0.4em] placeholder-zinc-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                  placeholder="000000"
                  required
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-1/3 rounded-xl border border-zinc-800 py-3 text-sm font-semibold text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 active:scale-95 transition-all duration-200"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="w-2/3 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/10 hover:bg-blue-500 focus:outline-none active:scale-95 disabled:opacity-50 transition-all duration-200"
              >
                {loading ? 'Registering...' : 'Complete Sign Up'}
              </button>
            </div>
          </form>
        )}

        <div className="mt-8 text-center text-sm text-zinc-400">
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-blue-500 hover:text-blue-400 transition-colors">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
