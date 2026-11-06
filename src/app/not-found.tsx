import React from 'react';
import Link from 'next/link';
import { Compass, LayoutDashboard, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 border border-slate-100 text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center mx-auto shadow-sm">
          <Compass className="w-9 h-9 animate-pulse" />
        </div>

        <div className="space-y-2">
          <span className="inline-block px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold font-mono tracking-wider">
            ERROR 404
          </span>
          <h1 className="text-2xl font-black text-slate-900">Page Not Found</h1>
          <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
            The page you&apos;re looking for doesn&apos;t exist or may have been moved.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
          <Link
            href="/dashboard"
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Return to Dashboard</span>
          </Link>
          <Link
            href="/tracking"
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Order Tracking</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

