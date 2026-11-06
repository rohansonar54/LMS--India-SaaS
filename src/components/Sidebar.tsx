'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  CreditCard,
  Users,
  Clock,
  Package,
  BarChart3,
  QrCode,
  ShieldAlert,
  History,
  Settings,
  LogOut,
  Sparkles,
  Wallet,
  Building2,
  X,
  ChevronDown,
} from 'lucide-react';
import { useSidebar } from '@/context/SidebarContext';

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

interface LocationOption {
  _id: string;
  name: string;
  code: string;
}

export default function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { desktopOpen, mobileOpen: ctxMobileOpen, closeSidebar } = useSidebar();

  const isMobileOpen = mobileOpen !== undefined ? mobileOpen : ctxMobileOpen;

  const handleClose = () => {
    closeSidebar();
    if (onMobileClose) {
      onMobileClose();
    }
  };

  const [user, setUser] = useState<{
    id: string;
    name: string;
    username: string;
    level: number;
    locationId?: string;
    locationName?: string;
    selectedLocationId?: string;
  } | null>(null);

  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [seeding, setSeeding] = useState(false);
  const [seedSuccess, setSeedSuccess] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated) {
          setUser(data.user);
        }
      })
      .catch(() => {});

    fetch('/api/locations')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setLocations(data.locations || []);
        }
      })
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  const handleLocationSwitch = async (locId: string) => {
    try {
      const res = await fetch('/api/auth/switch-location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locationId: locId }),
      });
      const data = await res.json();
      if (data.success) {
        setUser((prev) => (prev ? { ...prev, selectedLocationId: locId } : null));
        window.location.reload();
      }
    } catch {
      // ignore
    }
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const res = await fetch('/api/seed', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setSeedSuccess(true);
        setTimeout(() => setSeedSuccess(false), 3000);
        window.location.reload();
      }
    } catch {
      // ignore
    } finally {
      setSeeding(false);
    }
  };

  const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'POS Billing', href: '/transactions', icon: CreditCard },
    { label: 'Query / Queue Board', href: '/queue', icon: Clock },
    { label: 'Money & Balances', href: '/payments', icon: Wallet },
    { label: 'Customers', href: '/customers', icon: Users },
    { label: 'Supplies / Stock', href: '/supplies', icon: Package },
    { label: 'Track by QR', href: '/tracking', icon: QrCode },
  ];

  const adminItems = [
    { label: 'Sales & Reports', href: '/sales', icon: BarChart3 },
    { label: 'Location Management', href: '/locations', icon: Building2 },
    { label: 'Staff Management', href: '/staff', icon: ShieldAlert },
    { label: 'Activity Logs', href: '/logs', icon: History },
    { label: 'Rates & Services', href: '/settings', icon: Settings },
  ];

  const sidebarContent = (
    <div className="w-64 bg-slate-900 text-slate-200 flex flex-col h-full border-r border-slate-800 shadow-xl select-none">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/30">
            <span className="text-xl">🧺</span>
          </div>
          <div>
            <h1 className="font-bold text-white text-sm tracking-tight leading-tight">LMS India SaaS</h1>
            <p className="text-[11px] text-cyan-400 font-medium">Multi-Location • INR (₹)</p>
          </div>
        </div>

        {/* Close Button on Any Device (Mobile, Tablet, Desktop) */}
        <button
          onClick={handleClose}
          aria-label="Close Navigation Menu"
          title="Close Navigation Menu"
          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Location Selector for Super Admin or Location Badge for Staff */}
      <div className="p-3 border-b border-slate-800/80 bg-slate-950/40">
        <div className="flex items-center space-x-1.5 mb-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          <Building2 className="w-3.5 h-3.5 text-cyan-400" />
          <span>Branch Location</span>
        </div>
        {user?.level === 0 ? (
          <div className="relative">
            <select
              value={user.selectedLocationId || 'all'}
              onChange={(e) => handleLocationSwitch(e.target.value)}
              className="w-full bg-slate-800/90 text-white text-xs font-semibold rounded-lg px-2.5 py-2 border border-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 appearance-none pr-7 cursor-pointer"
            >
              <option value="all">🌐 All Locations (Consolidated)</option>
              {locations.map((loc) => (
                <option key={loc._id} value={loc._id}>
                  📍 {loc.name} ({loc.code})
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        ) : (
          <div className="px-2.5 py-1.5 rounded-lg bg-blue-950/60 border border-blue-800/50 text-blue-200 text-xs font-medium flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="truncate">{user?.locationName || 'Assigned Branch'}</span>
          </div>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto dark-scrollbar">
        <p className="px-3 text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">Main Menu</p>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => {
                if (typeof window !== 'undefined' && window.innerWidth < 768) {
                  handleClose();
                }
              }}
              className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-xs md:text-sm font-medium transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-semibold'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}

        {/* Admin Only Section */}
        {user?.level === 0 && (
          <div className="pt-3 mt-3 border-t border-slate-800">
            <p className="px-3 text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">Admin Central</p>
            {adminItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => {
                    if (typeof window !== 'undefined' && window.innerWidth < 768) {
                      handleClose();
                    }
                  }}
                  className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-xs md:text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-semibold'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </nav>

      {/* Quick Demo Seeder & User Profile Footer */}
      <div className="p-3 border-t border-slate-800 space-y-2">
        <button
          onClick={handleSeed}
          disabled={seeding}
          className="w-full flex items-center justify-center space-x-2 py-1.5 px-3 text-xs font-semibold rounded-lg bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-500/30 transition-all cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{seeding ? 'Seeding...' : seedSuccess ? '✓ Seeded INR Data!' : 'Reset Demo (₹)'}</span>
        </button>

        <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/60 border border-slate-700/50">
          <div className="flex items-center space-x-2 min-w-0">
            <div className="w-7 h-7 rounded-full bg-blue-500/20 text-blue-400 font-bold flex items-center justify-center text-xs shrink-0 border border-blue-500/30">
              {user?.name?.[0] || 'U'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">{user?.name || 'User'}</p>
              <p className="text-[10px] text-slate-400 truncate">
                {user?.level === 0 ? 'Super Admin' : 'Staff'}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Log out"
            className="p-1 rounded-md text-slate-400 hover:text-rose-400 hover:bg-slate-700 transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Collapsible / Expandable Sidebar */}
      <aside
        className={`hidden md:flex h-screen sticky top-0 shrink-0 transition-all duration-300 ease-in-out z-20 ${
          desktopOpen ? 'w-64 opacity-100' : 'w-0 opacity-0 overflow-hidden border-0 pointer-events-none'
        }`}
      >
        <div className="w-64 h-full shrink-0">
          {sidebarContent}
        </div>
      </aside>

      {/* Mobile Drawer (Slide-in with dark backdrop) */}
      {isMobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={handleClose}
          />
          <div className="relative z-10 h-full animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
