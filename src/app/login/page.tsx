'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, User, AlertCircle, Sparkles, Building2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message || 'Invalid username or password');
      } else {
        router.push('/dashboard');
        router.refresh();
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (user: string, pass: string) => {
    setUsername(user);
    setPassword(pass);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl p-6 sm:p-8 border border-white/20">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-400 mx-auto flex items-center justify-center shadow-lg shadow-blue-500/30 mb-3">
            <span className="text-3xl">🧺</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">LMS India SaaS</h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Multi-Location Laundry POS • Indian Rupee (₹)
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4" suppressHydrationWarning>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
              Username
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                suppressHydrationWarning
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                suppressHydrationWarning
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            suppressHydrationWarning
            className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-500/25 transition disabled:opacity-50 mt-2"
          >
            {loading ? 'Authenticating...' : 'Sign In to Workspace'}
          </button>
        </form>

        {/* Demo Roles Quick Fill */}
        <div className="mt-6 pt-5 border-t border-slate-100" suppressHydrationWarning>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center mb-2.5">
            Test Demo Role Accounts
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              suppressHydrationWarning
              onClick={() => handleQuickFill('admin', 'admin')}
              className="p-2 rounded-xl bg-slate-50 hover:bg-blue-50 border border-slate-200 text-left transition"
            >
              <p className="text-xs font-bold text-slate-800">Super Admin</p>
              <p className="text-[10px] text-slate-500 font-mono">admin / admin</p>
            </button>
            <button
              type="button"
              suppressHydrationWarning
              onClick={() => handleQuickFill('staff_mumbai', 'staff123')}
              className="p-2 rounded-xl bg-slate-50 hover:bg-blue-50 border border-slate-200 text-left transition"
            >
              <p className="text-xs font-bold text-slate-800">Mumbai Staff</p>
              <p className="text-[10px] text-slate-500 font-mono">staff_mumbai</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
