'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/useAuthStore';
import { Shield, Smartphone, Key, Lock, Eye, EyeOff, Info, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { setAuth, isAuthenticated } = useAuthStore();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState(1); // 1: Credentials, 2: OTP Verification
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  const handleCredentialsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) {
      setError('Please fill in all fields.');
      return;
    }
    setError('');
    // Advance to mock OTP verification step
    setStep(2);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) {
      setError('Please enter the OTP.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await api.login({
        identifier,
        password,
        otp
      });
      
      setAuth(response.user, response.access_token, response.refresh_token);
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
      setStep(1); // Reset step on failure
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-screen items-center justify-center bg-zinc-950 px-4 py-12 font-sans select-none text-zinc-100">
      <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-zinc-950 to-zinc-950 pointer-events-none" />
      
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/70 p-8 shadow-2xl backdrop-blur-xl transition-all duration-300 my-8">
        
        {/* Header Logo */}
        <div className="flex flex-col items-center justify-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 shadow-lg shadow-blue-500/20">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <h2 className="mt-4 text-2xl font-bold tracking-tight">Welcome to Signal</h2>
          <p className="mt-2 text-sm text-zinc-400">Secure messaging. Redefined.</p>
        </div>

        {error && (
          <div className="mt-6 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400">
            {error}
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleCredentialsSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="identifier" className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Username or Phone Number
              </label>
              <div className="relative mt-1">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Smartphone className="h-4 w-4 text-zinc-500" />
                </div>
                <input
                  type="text"
                  id="identifier"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="block w-full rounded-xl border border-zinc-800 bg-zinc-950/50 py-3 pl-10 pr-3 text-sm placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                  placeholder="e.g. +1234567890 or username"
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
                  placeholder="••••••••"
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
              disabled={loading}
              className="mt-6 w-full flex items-center justify-center rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/10 hover:bg-blue-500 focus:outline-none active:scale-95 disabled:opacity-50 transition-all duration-200"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Continue'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleLoginSubmit} className="mt-6 space-y-4">
            <div className="rounded-lg bg-zinc-950/40 border border-zinc-800/50 p-4 text-center">
              <span className="text-xs text-zinc-400">
                A verification code was sent to <strong className="text-zinc-200">{identifier}</strong>. 
                Enter <strong className="text-blue-500">123456</strong> to proceed.
              </span>
            </div>

            <div>
              <label htmlFor="otp" className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider text-center">
                Enter Verification Code (OTP)
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
                className="w-2/3 flex items-center justify-center rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/10 hover:bg-blue-500 focus:outline-none active:scale-95 disabled:opacity-50 transition-all duration-200"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
                {loading ? 'Verifying...' : 'Verify & Login'}
              </button>
            </div>
          </form>
        )}

        <div className="mt-8 text-center text-sm text-zinc-400 border-b border-zinc-800 pb-6">
          New to Signal?{' '}
          <Link href="/register" className="font-semibold text-blue-500 hover:text-blue-400 transition-colors">
            Create an Account
          </Link>
        </div>

        {/* Demo Credentials Section */}
        <div className="mt-6 pt-2">
          <div className="flex items-center justify-center gap-2 text-xs text-amber-500/90 mb-4 bg-amber-500/10 py-2 px-3 rounded-lg border border-amber-500/20">
            <Info className="h-4 w-4 shrink-0" />
            <span>This application uses mocked authentication for demonstration purposes.</span>
          </div>
          
          <div className="bg-zinc-950/50 rounded-xl p-4 border border-zinc-800/80">
            <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Demo Credentials</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-zinc-500 block text-xs">Username:</span>
                <span className="font-mono text-zinc-200 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">amit</span>
              </div>
              <div>
                <span className="text-zinc-500 block text-xs">Password:</span>
                <span className="font-mono text-zinc-200 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">password123</span>
              </div>
              <div className="col-span-2 text-center text-xs text-zinc-500 my-1">OR</div>
              <div>
                <span className="text-zinc-500 block text-xs">Phone:</span>
                <span className="font-mono text-zinc-200 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">+91 9000000001</span>
              </div>
              <div>
                <span className="text-zinc-500 block text-xs">Password:</span>
                <span className="font-mono text-zinc-200 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">password123</span>
              </div>
              <div className="col-span-2 mt-2 pt-2 border-t border-zinc-800">
                <span className="text-zinc-500 block text-xs">Mock OTP:</span>
                <span className="font-mono text-zinc-200 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800 text-blue-400">123456</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
