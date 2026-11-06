'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import ReceiptModal, { ReceiptOrder } from '@/components/ReceiptModal';
import Link from 'next/link';
import { formatINR } from '@/lib/currency';
import {
  Wallet,
  Clock,
  Users,
  AlertTriangle,
  ArrowRight,
  PlusCircle,
  Eye,
  CheckCircle2,
  TrendingUp,
  CreditCard,
  Building2,
  Package,
  Calendar,
} from 'lucide-react';

interface DashboardStats {
  totalRevenue: number;
  todayRevenue: number;
  monthlyRevenue: number;
  totalOutstanding: number;
  totalOrders: number;
  todayOrders: number;
  activeCount: number;
  completedCount: number;
  totalCustomers: number;
  newCustomers: number;
  lowStockCount: number;
}

interface LocationMetric {
  id: string;
  name: string;
  code: string;
  ordersCount: number;
  revenue: number;
  outstanding: number;
}

export default function DashboardPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    totalRevenue: 0,
    todayRevenue: 0,
    monthlyRevenue: 0,
    totalOutstanding: 0,
    totalOrders: 0,
    todayOrders: 0,
    activeCount: 0,
    completedCount: 0,
    totalCustomers: 0,
    newCustomers: 0,
    lowStockCount: 0,
  });

  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [paymentMethodsDist, setPaymentMethodsDist] = useState<Record<string, number>>({});
  const [locationComparison, setLocationComparison] = useState<LocationMetric[]>([]);
  const [recentOrders, setRecentOrders] = useState<ReceiptOrder[]>([]);
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptOrder | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setStats(data.stats);
          setStatusCounts(data.statusCounts || {});
          setPaymentMethodsDist(data.paymentMethodsDist || {});
          setLocationComparison(data.locationComparison || []);
          setRecentOrders(data.recentOrders || []);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar mobileOpen={mobileMenuOpen} onMobileClose={() => setMobileMenuOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        <Navbar
          title="Executive Dashboard"
          subtitle="Real-Time Branch Operations & Financial Analytics (₹)"
          onMenuClick={() => setMobileMenuOpen(true)}
        />

        <main className="p-3 sm:p-5 md:p-8 space-y-6 flex-1 overflow-y-auto max-w-7xl w-full mx-auto">
          {/* Quick POS Banner */}
          <div className="rounded-3xl bg-gradient-to-r from-blue-700 via-indigo-700 to-cyan-600 p-5 md:p-8 text-white shadow-xl shadow-blue-600/15 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <span className="px-3 py-1 rounded-full bg-white/20 text-white text-[11px] font-bold backdrop-blur-xs">
                Indian Rupee Multi-Location POS
              </span>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-black mt-2 tracking-tight">
                Item-Based Counter Billing & QR Tracker
              </h2>
              <p className="text-blue-100 text-xs md:text-sm mt-1 max-w-xl">
                Create clothing orders, record advance/partial payments, print dual receipts with QR tracking, and manage delivery handovers.
              </p>
            </div>
            <div className="flex items-center space-x-2 shrink-0">
              <Link
                href="/transactions"
                className="px-5 py-2.5 rounded-2xl bg-white text-blue-700 font-bold text-xs sm:text-sm hover:bg-blue-50 shadow-md transition flex items-center space-x-1.5"
              >
                <PlusCircle className="w-4 h-4" />
                <span>New POS Order</span>
              </Link>
              <Link
                href="/payments"
                className="px-5 py-2.5 rounded-2xl bg-blue-900/60 text-white font-bold text-xs sm:text-sm hover:bg-blue-900 border border-white/20 transition flex items-center space-x-1.5"
              >
                <Wallet className="w-4 h-4" />
                <span>Balances</span>
              </Link>
            </div>
          </div>

          {/* KPI Analytics Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Total Collected Revenue */}
            <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Revenue Collected</span>
                <span className="p-1.5 rounded-xl bg-emerald-50 text-emerald-600">
                  <TrendingUp className="w-4 h-4" />
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
                {formatINR(stats.totalRevenue)}
              </h3>
              <p className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center space-x-1">
                <span>Today: {formatINR(stats.todayRevenue)}</span>
              </p>
            </div>

            {/* Total Outstanding Dues */}
            <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Pending Balances</span>
                <span className="p-1.5 rounded-xl bg-rose-50 text-rose-600">
                  <Wallet className="w-4 h-4" />
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-rose-600 font-mono">
                {formatINR(stats.totalOutstanding)}
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">To collect before handover</p>
            </div>

            {/* Active in Queue */}
            <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Active in Station</span>
                <span className="p-1.5 rounded-xl bg-blue-50 text-blue-600">
                  <Clock className="w-4 h-4" />
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-blue-600 font-mono">
                {stats.activeCount}
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">{stats.totalOrders} total orders processed</p>
            </div>

            {/* Total Customers */}
            <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Customer Base</span>
                <span className="p-1.5 rounded-xl bg-cyan-50 text-cyan-600">
                  <Users className="w-4 h-4" />
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
                {stats.totalCustomers}
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">+{stats.newCustomers} registered this month</p>
            </div>
          </div>

          {/* Operational Stations Grid */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm">Station Pipeline Status</h3>
              <Link href="/queue" className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center space-x-1">
                <span>Open Queue Board</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
              {[
                { label: 'Received', key: 'pending', icon: '⏳', color: 'bg-amber-50 text-amber-800 border-amber-200' },
                { label: 'Washing & Drying', key: 'washing_drying', icon: '🧼', color: 'bg-cyan-50 text-cyan-800 border-cyan-200' },
                { label: 'Ironing', key: 'ironing', icon: '👔', color: 'bg-indigo-50 text-indigo-800 border-indigo-200' },
                { label: 'Dry Clean', key: 'dry_cleaning', icon: '✨', color: 'bg-violet-50 text-violet-800 border-violet-200' },
                { label: 'Ready', key: 'done', icon: '✅', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
                { label: 'Delivered', key: 'claimed', icon: '📦', color: 'bg-slate-50 text-slate-800 border-slate-200' },
              ].map((st) => (
                <div
                  key={st.key}
                  className={`p-3 rounded-2xl border text-center space-y-1 ${st.color}`}
                >
                  <span className="text-lg">{st.icon}</span>
                  <p className="text-[11px] font-bold uppercase">{st.label}</p>
                  <p className="text-xl font-black font-mono">{statusCounts[st.key] || 0}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Location Comparison & Payment Modes Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Location-wise Comparison (for Admin) */}
            <div className="lg:col-span-7 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Branch Comparison</h3>
                  <p className="text-xs text-slate-500">Revenue & orders across registered laundry hubs</p>
                </div>
                <Building2 className="w-4 h-4 text-slate-400" />
              </div>

              <div className="space-y-3">
                {locationComparison.map((loc) => (
                  <div
                    key={loc.id}
                    className="p-3.5 rounded-2xl border border-slate-100 bg-slate-50 flex items-center justify-between gap-3"
                  >
                    <div>
                      <p className="font-bold text-slate-800 text-xs">{loc.name}</p>
                      <p className="text-[11px] text-slate-400 font-mono">Code: {loc.code} • {loc.ordersCount} orders</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono font-black text-slate-900 text-sm">{formatINR(loc.revenue)}</p>
                      {loc.outstanding > 0 && (
                        <p className="text-[10px] font-bold text-rose-600 font-mono">
                          Dues: {formatINR(loc.outstanding)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Method Distribution */}
            <div className="lg:col-span-5 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Payment Methods</h3>
                  <p className="text-xs text-slate-500">Cash vs UPI vs Card breakdown</p>
                </div>
                <CreditCard className="w-4 h-4 text-slate-400" />
              </div>

              <div className="space-y-2.5">
                {Object.entries(paymentMethodsDist).map(([mode, amt]) => {
                  const pct = stats.totalRevenue > 0 ? Math.round((amt / stats.totalRevenue) * 100) : 0;
                  return (
                    <div key={mode} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-slate-700">{mode}</span>
                        <span className="font-mono font-bold text-slate-900">{formatINR(amt)} ({pct}%)</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            mode === 'UPI' ? 'bg-indigo-600' : mode === 'Card' ? 'bg-cyan-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Recent Orders List */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm">Recent Transactions</h3>
              <Link href="/transactions" className="text-xs font-bold text-blue-600 hover:text-blue-800">
                View All Transactions →
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 uppercase font-bold text-[10px]">
                    <th className="py-2.5 px-3">Order #</th>
                    <th className="py-2.5 px-3">Customer</th>
                    <th className="py-2.5 px-3">Amount</th>
                    <th className="py-2.5 px-3">Paid</th>
                    <th className="py-2.5 px-3">Balance</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentOrders.map((ro) => (
                    <tr key={ro.orderNumber} className="hover:bg-slate-50 transition">
                      <td className="py-2.5 px-3 font-mono font-bold text-blue-600">#{ro.orderNumber}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">{ro.customerName}</td>
                      <td className="py-2.5 px-3 font-mono font-bold">{formatINR(ro.total)}</td>
                      <td className="py-2.5 px-3 font-mono text-emerald-600">{formatINR(ro.amountPaid)}</td>
                      <td className="py-2.5 px-3 font-mono text-rose-600">
                        {formatINR(ro.balance !== undefined ? ro.balance : Math.max(0, ro.total - ro.amountPaid))}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                          {ro.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => setSelectedReceipt(ro)}
                          className="px-2.5 py-1 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 text-[11px] font-semibold inline-flex items-center space-x-1"
                        >
                          <Eye className="w-3 h-3" />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {/* Dual Printable Receipt Modal */}
      <ReceiptModal order={selectedReceipt} onClose={() => setSelectedReceipt(null)} />
    </div>
  );
}
