'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { QrCode, Search, Sparkles, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function TrackingSearchPage() {
  const router = useRouter();
  const [orderNumber, setOrderNumber] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = orderNumber.trim();
    if (!clean) return;
    router.push(`/tracking/${clean}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl p-8 border border-white/20 text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-400 mx-auto flex items-center justify-center shadow-lg shadow-blue-500/30">
          <QrCode className="w-8 h-8 text-white" />
        </div>

        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Track Your Laundry</h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Scan your receipt QR code or type your Order Number below
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              required
              placeholder="e.g. LMS-1001"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 text-sm font-mono font-bold uppercase tracking-wider focus:ring-2 focus:ring-blue-500 text-center"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-500/25 transition flex items-center justify-center space-x-2"
          >
            <span>Track Order Status</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="pt-4 border-t border-slate-200">
          <Link
            href="/dashboard"
            className="text-xs font-semibold text-slate-500 hover:text-blue-600 transition"
          >
            ← Return to Staff Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
