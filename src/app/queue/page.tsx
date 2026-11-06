'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import ReceiptModal, { ReceiptOrder } from '@/components/ReceiptModal';
import { formatINR } from '@/lib/currency';
import { ALL_STAGES, WorkflowStageKey, getNextStage } from '@/lib/workflow';
import {
  Clock,
  ChevronRight,
  Eye,
  CheckCircle2,
  RefreshCw,
  Search,
  Filter,
  AlertTriangle,
  ArrowUpDown,
  CreditCard,
  Building2,
  Calendar,
  Phone,
  User,
  ShieldCheck,
  Loader2,
} from 'lucide-react';

interface QueueOrderItem {
  itemName?: string;
  serviceName?: string;
  qty?: number;
  unitPrice?: number;
  subtotal: number;
  // Legacy
  typeName?: string;
  kilo?: number;
  unit?: string;
}

interface QueueOrder {
  _id: string;
  orderNumber: string;
  customerName: string;
  customerContact?: string;
  customerAddress?: string;
  locationName?: string;
  staffName?: string;
  orderItems?: QueueOrderItem[];
  items?: QueueOrderItem[]; // legacy
  total: number;
  amountPaid: number;
  balance: number;
  paymentStatus: 'paid' | 'partial' | 'unpaid';
  paymentMethod?: string;
  status: WorkflowStageKey;
  activeWorkflowSteps?: WorkflowStageKey[];
  expectedDeliveryDate?: string;
  createdAt: string;
}

export default function QueuePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [orders, setOrders] = useState<QueueOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptOrder | null>(null);

  // Search & Filters with Debouncing
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'delivery'>('newest');
  const [activeTab, setActiveTab] = useState<string>('all'); // For mobile tab switching

  // Track in-flight stage progression per order for instant feedback
  const [updatingOrderIds, setUpdatingOrderIds] = useState<Record<string, boolean>>({});

  // Payment Collection Handover Popup State
  const [pendingHandoverOrder, setPendingHandoverOrder] = useState<QueueOrder | null>(null);
  const [collectAmount, setCollectAmount] = useState<string>('');
  const [collectMethod, setCollectMethod] = useState<'Cash' | 'UPI' | 'Card'>('Cash');
  const [collectRef, setCollectRef] = useState('');
  const [adminOverride, setAdminOverride] = useState(false);
  const [handoverSubmitting, setHandoverSubmitting] = useState(false);

  // Debounce search by 250ms so user typing doesn't spam Atlas queries
  useEffect(() => {
    if (search !== debouncedSearch) {
      setIsSearching(true);
    }
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setIsSearching(false);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchOrders = (searchTerm = debouncedSearch, showLoadingSpinner = true) => {
    if (showLoadingSpinner) setLoading(true);
    fetch(`/api/orders?search=${encodeURIComponent(searchTerm)}&paymentStatus=${paymentStatusFilter}&sort=${sortBy}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setOrders(data.orders || []);
        }
      })
      .catch((err) => console.error('Fetch orders error:', err))
      .finally(() => {
        setLoading(false);
        setIsSearching(false);
      });
  };

  useEffect(() => {
    fetchOrders(debouncedSearch);
  }, [debouncedSearch, paymentStatusFilter, sortBy]);

  // Handle stage progression with INSTANT OPTIMISTIC UI (0ms delay)
  const handleAdvanceStage = async (order: QueueOrder) => {
    const activeSteps = order.activeWorkflowSteps || [
      'pending',
      'washing_drying',
      'ironing',
      'done',
      'claimed',
    ];

    const next = getNextStage(order.status, activeSteps);
    if (!next) return;

    // Check if next step is delivery ('claimed') and has unpaid balance!
    if (next === 'claimed' && order.balance > 0) {
      setPendingHandoverOrder(order);
      setCollectAmount(order.balance.toString());
      setCollectMethod('Cash');
      setCollectRef('');
      setAdminOverride(false);
      return;
    }

    const previousStatus = order.status;

    // 1. Mark this specific order as updating (shows spinner on the button)
    setUpdatingOrderIds((prev) => ({ ...prev, [order._id]: true }));

    // 2. OPTIMISTIC UPDATE: Move the card to next station INSTANTLY (0ms response time!)
    setOrders((prev) =>
      prev.map((o) => (o._id === order._id ? { ...o, status: next } : o))
    );

    // 3. Sync with backend in background
    try {
      const res = await fetch(`/api/orders/${order._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next, staffName: 'Staff' }),
      });
      const data = await res.json();
      if (!data.success) {
        // Revert on error
        setOrders((prev) =>
          prev.map((o) => (o._id === order._id ? { ...o, status: previousStatus } : o))
        );
        alert(data.message || 'Failed to update stage');
      } else if (data.order) {
        // Silently update any server fields without full 150-order re-fetch
        setOrders((prev) =>
          prev.map((o) => (o._id === order._id ? { ...o, ...data.order } : o))
        );
      }
    } catch {
      // Revert on network disconnect
      setOrders((prev) =>
        prev.map((o) => (o._id === order._id ? { ...o, status: previousStatus } : o))
      );
      alert('Network error: Change was reverted.');
    } finally {
      setUpdatingOrderIds((prev) => {
        const nextState = { ...prev };
        delete nextState[order._id];
        return nextState;
      });
    }
  };

  // Submit payment & complete handover with optimistic completion
  const handleCompleteHandover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingHandoverOrder) return;

    const currentOrder = pendingHandoverOrder;
    setHandoverSubmitting(true);

    try {
      const payload: Record<string, unknown> = {
        status: 'claimed',
        staffName: 'Staff Attendant',
      };

      const paidAmount = Number(collectAmount) || 0;
      if (adminOverride) {
        payload.adminOverride = true;
      } else {
        payload.paymentAmount = paidAmount;
        payload.paymentMethod = collectMethod;
        payload.referenceNumber = collectRef;
      }

      const res = await fetch(`/api/orders/${currentOrder._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        // Instantly update local order to claimed
        setOrders((prev) =>
          prev.map((o) =>
            o._id === currentOrder._id
              ? {
                  ...o,
                  status: 'claimed',
                  amountPaid: o.amountPaid + (adminOverride ? 0 : paidAmount),
                  balance: Math.max(0, o.balance - (adminOverride ? 0 : paidAmount)),
                  paymentStatus: (o.balance - (adminOverride ? 0 : paidAmount)) <= 0 ? 'paid' : 'partial',
                }
              : o
          )
        );
        setPendingHandoverOrder(null);
      } else {
        alert(data.message || 'Payment collection failed');
      }
    } catch {
      alert('Network error during handover');
    } finally {
      setHandoverSubmitting(false);
    }
  };

  // Canonical stages to display on the board
  const boardColumns: { key: WorkflowStageKey; title: string; icon: string }[] = [
    { key: 'pending', title: 'Received', icon: '⏳' },
    { key: 'washing_drying', title: 'Washing & Drying', icon: '🧼' },
    { key: 'ironing', title: 'Iron / Press', icon: '👔' },
    { key: 'dry_cleaning', title: 'Dry Clean', icon: '✨' },
    { key: 'done', title: 'Ready for Pickup', icon: '✅' },
    { key: 'claimed', title: 'Delivered', icon: '📦' },
  ];

  const isOrderInCol = (o: QueueOrder, colKey: WorkflowStageKey) => {
    if (colKey === 'pending') return o.status === 'pending' || o.status === 'processing';
    if (colKey === 'washing_drying') return o.status === 'washing_drying' || o.status === 'washing' || o.status === 'drying';
    return o.status === colKey;
  };

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar mobileOpen={mobileMenuOpen} onMobileClose={() => setMobileMenuOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        <Navbar
          title="Query & Order Board"
          subtitle="Real-time Multi-Stage Tracking & Delivery Handover"
          onMenuClick={() => setMobileMenuOpen(true)}
        />

        <main className="p-3 sm:p-5 md:p-8 space-y-4 sm:space-y-6 flex-1 overflow-x-hidden">
          {/* Search & Comprehensive Filters Bar */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Search Bar: Order #, Customer Name, Mobile # */}
              <div className="relative flex-1">
                {isSearching ? (
                  <Loader2 className="w-4 h-4 text-blue-600 absolute left-3.5 top-1/2 -translate-y-1/2 animate-spin" />
                ) : (
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                )}
                <input
                  type="text"
                  placeholder="Search by Order #, Customer Name, Mobile #..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm rounded-2xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 transition"
                />
              </div>

              {/* Filters & Actions */}
              <div className="flex items-center space-x-2 shrink-0">
                {/* Payment Status Filter */}
                <select
                  value={paymentStatusFilter}
                  onChange={(e) => setPaymentStatusFilter(e.target.value)}
                  className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Payments</option>
                  <option value="paid">Fully Paid (₹)</option>
                  <option value="partial">Partial Balance</option>
                  <option value="unpaid">Unpaid Orders</option>
                </select>

                {/* Sort Option */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest' | 'delivery')}
                  className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="delivery">Delivery Date</option>
                </select>

                <button
                  onClick={() => fetchOrders(debouncedSearch, true)}
                  title="Refresh Board"
                  className="p-2.5 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-50 transition"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
                </button>
              </div>
            </div>

            {/* Mobile Tab View Switcher */}
            <div className="md:hidden flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-thin">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition ${activeTab === 'all'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
              >
                All Stations ({orders.length})
              </button>
              {boardColumns.map((col) => {
                const rawCount = orders.filter((o) => isOrderInCol(o, col.key)).length;
                const count = col.key === 'claimed' ? Math.min(rawCount, 150) : rawCount;
                return (
                  <button
                    key={col.key}
                    onClick={() => setActiveTab(col.key)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 flex items-center space-x-1 transition ${activeTab === col.key
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                  >
                    <span>{col.icon} {col.title}</span>
                    <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-[10px]">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Background data sync pulse indicator */}
          {loading && orders.length > 0 && (
            <div className="w-full bg-blue-100/70 h-1 overflow-hidden rounded-full animate-in fade-in">
              <div className="bg-blue-600 h-full w-2/5 rounded-full animate-pulse"></div>
            </div>
          )}

          {/* Kanban Multi-Column Board (Grid on Laptop/Desktop, Side-Scroll on Mobile & Tablet) */}
          <div className="kanban-board-container flex gap-4 items-start overflow-x-auto pb-4 pt-1 px-0.5 scrollbar-thin lg:grid lg:grid-cols-3 2xl:grid-cols-6 lg:overflow-x-visible lg:pb-0">
            {boardColumns
              .filter((col) => activeTab === 'all' || activeTab === col.key)
              .map((col) => {
                const allMatching = orders.filter((o) => isOrderInCol(o, col.key));
                // Delivered section: show at most newest 150 orders
                const colOrders = col.key === 'claimed' ? allMatching.slice(0, 150) : allMatching;

                return (
                  <div
                    key={col.key}
                    className={`${activeTab === 'all'
                        ? 'kanban-column-all w-[285px] sm:w-[315px] shrink-0 min-w-[280px] lg:w-auto lg:min-w-0 lg:shrink'
                        : 'w-full max-w-xl'
                      } bg-slate-200/60 rounded-3xl p-3 sm:p-3.5 border border-slate-300/60 flex flex-col min-h-[450px]`}
                  >
                    {/* Column Header */}
                    <div className="flex items-center justify-between pb-3 px-1 border-b border-slate-300/60 mb-3">
                      <div className="flex items-center space-x-2">
                        <span className="text-base">{col.icon}</span>
                        <div>
                          <h4 className="font-bold text-slate-900 text-xs sm:text-sm tracking-tight">{col.title}</h4>
                          {col.key === 'claimed' && (
                            <span className="text-[10px] text-slate-500 font-normal">Newest 150 max</span>
                          )}
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-slate-900 text-white text-[11px] font-black">
                        {colOrders.length}
                      </span>
                    </div>

                    {/* Order Cards */}
                    <div className="space-y-3 flex-1 overflow-y-auto">
                      {loading && orders.length === 0 ? (
                        <div className="space-y-2.5 py-1">
                          {[1, 2].map((n) => (
                            <div key={n} className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-xs animate-pulse space-y-2.5">
                              <div className="flex justify-between items-center">
                                <div className="h-3.5 bg-slate-200 rounded w-16"></div>
                                <div className="h-4 bg-slate-200 rounded-md w-12"></div>
                              </div>
                              <div className="h-3.5 bg-slate-200 rounded w-28"></div>
                              <div className="h-10 bg-slate-100 rounded-xl"></div>
                              <div className="h-7 bg-slate-200 rounded-xl"></div>
                            </div>
                          ))}
                        </div>
                      ) : colOrders.length === 0 ? (
                        <div className="py-12 text-center text-slate-400 text-xs">
                          No orders in this station
                        </div>
                      ) : (
                        colOrders.map((order) => {
                          const activeSteps = order.activeWorkflowSteps || [
                            'pending',
                            'washing_drying',
                            'ironing',
                            'done',
                            'claimed',
                          ];
                          const next = getNextStage(order.status, activeSteps);
                          const nextStageInfo = next ? ALL_STAGES[next] : null;
                          const displayItems = order.orderItems || order.items || [];
                          const isFullyPaid = order.balance === 0;
                          const isUpdating = !!updatingOrderIds[order._id];

                          return (
                            <div
                              key={order._id}
                              className={`bg-white rounded-2xl p-3.5 border border-slate-200 shadow-xs hover:shadow-md transition space-y-2.5 ${
                                isUpdating ? 'ring-2 ring-blue-500/50 opacity-90' : ''
                              }`}
                            >
                              {/* Order # and Payment Status Badge */}
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-mono font-bold text-blue-600 text-xs flex items-center space-x-1">
                                  <span>#{order.orderNumber}</span>
                                  {isUpdating && <Loader2 className="w-3 h-3 text-blue-500 animate-spin" />}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${isFullyPaid
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : order.amountPaid > 0
                                        ? 'bg-amber-100 text-amber-800'
                                        : 'bg-rose-100 text-rose-800'
                                    }`}
                                >
                                  {isFullyPaid ? 'Paid' : `Bal: ${formatINR(order.balance)}`}
                                </span>
                              </div>

                              {/* Customer Information */}
                              <div>
                                <p className="font-bold text-slate-800 text-xs truncate">
                                  {order.customerName}
                                </p>
                                <p className="text-[11px] text-slate-500 font-medium flex items-center space-x-1">
                                  <Phone className="w-3 h-3 text-slate-400" />
                                  <span>{order.customerContact || 'N/A'}</span>
                                </p>
                              </div>

                              {/* Item Summary Pill */}
                              <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-600 space-y-0.5">
                                <p className="font-medium truncate">
                                  {displayItems.length} Item(s):{' '}
                                  <span className="text-slate-800 font-semibold">
                                    {displayItems.map((i) => i.itemName || i.typeName).slice(0, 2).join(', ')}
                                    {displayItems.length > 2 ? '...' : ''}
                                  </span>
                                </p>
                                <div className="flex justify-between items-baseline pt-0.5 border-t border-slate-200/50">
                                  <span className="text-slate-500 text-[10px]">Total Bill:</span>
                                  <span className="font-mono font-black text-slate-900">{formatINR(order.total)}</span>
                                </div>
                              </div>

                              {/* Expected Delivery Date if present */}
                              {order.expectedDeliveryDate && (
                                <p className="text-[10px] text-slate-500 flex items-center space-x-1">
                                  <Calendar className="w-3 h-3 text-slate-400" />
                                  <span>Due: {new Date(order.expectedDeliveryDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</span>
                                </p>
                              )}

                              {/* Action Buttons: Next Stage / Handover & Receipt */}
                              <div className="pt-1 flex items-center space-x-1.5">
                                <button
                                  onClick={() => setSelectedReceipt(order as unknown as ReceiptOrder)}
                                  title="View / Print Receipt"
                                  className="p-1.5 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>

                                {next ? (
                                  <button
                                    onClick={() => handleAdvanceStage(order)}
                                    disabled={isUpdating}
                                    className={`flex-1 py-1.5 px-2.5 rounded-xl text-[11px] font-bold flex items-center justify-center space-x-1 shadow-xs transition active:scale-95 ${
                                      isUpdating
                                        ? 'bg-blue-400 text-white cursor-wait opacity-90'
                                        : next === 'claimed'
                                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                                    }`}
                                  >
                                    {isUpdating ? (
                                      <>
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        <span>Saving...</span>
                                      </>
                                    ) : (
                                      <>
                                        <span>
                                          {next === 'claimed'
                                            ? order.balance > 0
                                              ? 'Collect & Deliver'
                                              : 'Handover'
                                            : `Move to ${nextStageInfo?.label.split('/')[0].trim() || next}`}
                                        </span>
                                        <ChevronRight className="w-3.5 h-3.5" />
                                      </>
                                    )}
                                  </button>
                                ) : (
                                  <div className="flex-1 py-1 text-center text-[10px] font-bold text-slate-400 uppercase">
                                    Delivered ✓
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </main>
      </div>

      {/* Payment Collection & Handover Confirmation Modal (Requirement 3) */}
      {pendingHandoverOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-center space-x-3 text-amber-600">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-base">Payment Clearance Required</h3>
                <p className="text-xs text-slate-500">Order #{pendingHandoverOrder.orderNumber}</p>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between text-slate-600">
                <span>Customer:</span>
                <span className="font-bold text-slate-800">{pendingHandoverOrder.customerName}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Total Order Amount:</span>
                <span className="font-mono font-semibold">{formatINR(pendingHandoverOrder.total)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Amount Paid Advance:</span>
                <span className="font-mono text-emerald-600">{formatINR(pendingHandoverOrder.amountPaid)}</span>
              </div>
              <div className="flex justify-between text-sm font-black text-rose-600 border-t pt-1.5 mt-1">
                <span>PENDING OUTSTANDING BALANCE:</span>
                <span className="font-mono">{formatINR(pendingHandoverOrder.balance)}</span>
              </div>
            </div>

            {/* Payment Collection Form */}
            <form onSubmit={handleCompleteHandover} className="space-y-3.5">
              {!adminOverride ? (
                <>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Amount Collected Now (₹) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">₹</span>
                      <input
                        type="number"
                        min="1"
                        max={pendingHandoverOrder.balance}
                        required
                        value={collectAmount}
                        onChange={(e) => setCollectAmount(e.target.value)}
                        className="w-full pl-7 pr-3 py-2 text-base font-black font-mono text-slate-900 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Payment Method</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(['Cash', 'UPI', 'Card'] as const).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setCollectMethod(m)}
                          className={`py-2 text-xs font-bold rounded-xl border transition ${collectMethod === m
                              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                            }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>

                  {collectMethod !== 'Cash' && (
                    <input
                      type="text"
                      placeholder={`Enter ${collectMethod} Ref #`}
                      value={collectRef}
                      onChange={(e) => setCollectRef(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  )}
                </>
              ) : (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-1">
                  <p className="font-bold flex items-center space-x-1">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Admin Handover Override Active</span>
                  </p>
                  <p className="text-[11px] text-rose-700">
                    Clothes will be marked as Delivered without collecting full payment now. Balance will remain in customer's outstanding ledger.
                  </p>
                </div>
              )}

              {/* Admin Override Toggle */}
              <div className="pt-1 flex items-center justify-between text-xs text-slate-500">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={adminOverride}
                    onChange={(e) => setAdminOverride(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Authorize Admin Handover Override</span>
                </label>
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPendingHandoverOrder(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={handoverSubmitting}
                  className={`flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition flex items-center justify-center space-x-1.5 ${
                    handoverSubmitting ? 'opacity-80 cursor-wait' : 'active:scale-95'
                  }`}
                >
                  {handoverSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Processing Handover...</span>
                    </>
                  ) : adminOverride ? (
                    'Confirm Handover'
                  ) : (
                    `Collect ₹${collectAmount} & Deliver`
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dual Printable Receipt Modal */}
      <ReceiptModal order={selectedReceipt} onClose={() => setSelectedReceipt(null)} />
    </div>
  );
}
