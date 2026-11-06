import React from 'react';
import Link from 'next/link';
import { Lock, LogIn } from 'lucide-react';

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 border border-slate-100 text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto shadow-sm">
          <Lock className="w-9 h-9" />
        </div>

        <div className="space-y-2">
          <span className="inline-block px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold font-mono tracking-wider">
            ERROR 401
          </span>
          <h1 className="text-2xl font-black text-slate-900">Session Required</h1>
          <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
            Your session is invalid or you are not logged in. Please log in to continue.
          </p>
        </div>

        <div className="pt-2 flex justify-center">
          <Link
            href="/login"
            className="inline-flex items-center justify-center space-x-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition"
          >
            <LogIn className="w-4 h-4" />
            <span>Go to Login</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

