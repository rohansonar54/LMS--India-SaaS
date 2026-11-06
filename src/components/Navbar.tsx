'use client';

import React from 'react';
import Link from 'next/link';
import { PlusCircle, QrCode, Menu, Building2 } from 'lucide-react';
import { useSidebar } from '@/context/SidebarContext';

interface NavbarProps {
  title?: string;
  subtitle?: string;
  onMenuClick?: () => void;
  activeLocationName?: string;
}

export default function Navbar({
  title,
  subtitle,
  onMenuClick,
  activeLocationName,
}: NavbarProps) {
  const { toggleSidebar, desktopOpen } = useSidebar();

  const handleToggle = () => {
    toggleSidebar();
    if (onMenuClick) {
      onMenuClick();
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 flex items-center justify-between shadow-xs">
      <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
        {/* Universal Menu Toggle Button (Visible on ALL devices: Mobile, Tablet & Desktop/Web) */}
        <button
          type="button"
          onClick={handleToggle}
          aria-label="Toggle Navigation Menu"
          title={desktopOpen ? "Collapse Navigation Menu" : "Open Navigation Menu"}
          suppressHydrationWarning
          className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition border border-slate-200 shrink-0 flex items-center justify-center cursor-pointer shadow-2xs"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="min-w-0">
          <div className="flex items-center space-x-2">
            <h2 className="text-base sm:text-lg md:text-xl font-bold text-slate-800 tracking-tight truncate">
              {title || 'Laundry Management'}
            </h2>
            {activeLocationName && (
              <span className="hidden sm:inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-semibold border border-blue-200 truncate">
                <Building2 className="w-3 h-3 shrink-0" />
                <span className="truncate">{activeLocationName}</span>
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-[11px] md:text-xs text-slate-500 font-medium truncate mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-2 md:space-x-3 shrink-0">
        {/* Quick QR Lookup Link */}
        <Link
          href="/tracking"
          className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition"
        >
          <QrCode className="w-4 h-4 text-slate-500" />
          <span>Track Order</span>
        </Link>

        {/* Quick New Transaction Button */}
        <Link
          href="/transactions"
          className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 shadow-sm shadow-blue-500/20 transition"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Order (₹)</span>
        </Link>
      </div>
    </header>
  );
}
