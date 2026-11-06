'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import ReceiptModal, { ReceiptOrder } from '@/components/ReceiptModal';
import Pagination from '@/components/Pagination';
import { formatINR } from '@/lib/currency';
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Search,
  CreditCard,
  User,
  Calendar,
  CheckCircle2,
  Clock,
  Printer,
  Plus,
  RefreshCw,
  Building2,
} from 'lucide-react';

interface PaymentRecord {
  _id: string;
  orderNumber: string;
  customerName: string;
  amount: number;
  method: string;
  referenceNumber?: string;
  staffName: string;
  locationName?: string;
  notes?: string;
  isAdvance: boolean;
  createdAt: string;
}

interface CustomerBalanceItem {
  customerId: string;
  customerName: string;
  contact: string;
  totalBalance: number;
  unpaidOrdersCount: number;
}

interface OrderWithBalance {
  _id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerContact?: string;
  total: number;
  amountPaid: number;
  balance: number;
  status: string;
  createdAt: string;
}

export default function PaymentsPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [customerBalances, setCustomerBalances] = useState<CustomerBalanceItem[]>([]);
  const [ordersWithBalance, setOrdersWithBalance] = useState<OrderWithBalance[]>([]);
  const [summary, setSummary] = useState({
    totalCollected: 0,
    totalOutstanding: 0,
    paymentCount: 0,
    unpaidOrdersCount: 0,
  });

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'balances' | 'history'>('balances');
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('all');
  const [balancesPage, setBalancesPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);
  const PAGE_SIZE = 20;

  // Quick Collect Payment Modal
  const [selectedOrderToPay, setSelectedOrderToPay] = useState<OrderWithBalance | null>(null);
  const [payAmount, setPayAmount] = useState<string>('');
  const [payMethod, setPayMethod] = useState<'Cash' | 'UPI' | 'Card'>('Cash');
  const [payRef, setPayRef] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Completed Receipt Modal
  const [receiptOrder, setReceiptOrder] = useState<ReceiptOrder | null>(null);

  const fetchPaymentsData = () => {
    setLoading(true);
    fetch(`/api/payments?method=${methodFilter}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setPayments(data.payments || []);
          setCustomerBalances(data.customerBalances || []);
          setOrdersWithBalance(data.ordersWithBalance || []);
          setSummary(data.summary || {});
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPaymentsData();
  }, [methodFilter]);

  const handleOpenCollectModal = (order: OrderWithBalance) => {
    setSelectedOrderToPay(order);
    setPayAmount(order.balance.toString());
    setPayMethod('Cash');
    setPayRef('');
    setPayNotes('');
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderToPay || !payAmount) return;

    setSubmittingPayment(true);
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: selectedOrderToPay._id,
          amount: Number(payAmount),
          method: payMethod,
          referenceNumber: payRef,
          notes: payNotes,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSelectedOrderToPay(null);
        fetchPaymentsData();
        if (data.order) {
          setReceiptOrder(data.order as unknown as ReceiptOrder);
        }
      } else {
        alert(data.message || 'Payment recording failed');
      }
    } catch {
      alert('Error connecting to server');
    } finally {
      setSubmittingPayment(false);
    }
  };

  const filteredBalances = customerBalances.filter(
    (c) =>
      c.customerName.toLowerCase().includes(search.toLowerCase()) ||
      c.contact.includes(search)
  );

  const filteredPayments = payments.filter(
    (p) =>
      p.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      p.customerName.toLowerCase().includes(search.toLowerCase()) ||
      (p.referenceNumber && p.referenceNumber.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar mobileOpen={mobileMenuOpen} onMobileClose={() => setMobileMenuOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        <Navbar
          title="Money & Balances"
          subtitle="Customer Outstanding Ledger & Payment History (₹)"
          onMenuClick={() => setMobileMenuOpen(true)}
        />

        <main className="p-3 sm:p-5 md:p-8 space-y-6 flex-1 max-w-7xl w-full mx-auto">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Revenue Collected */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Received (₹)</p>
                <h3 className="text-2xl font-black text-slate-900 font-mono mt-1">
                  {formatINR(summary.totalCollected)}
                </h3>
                <p className="text-xs text-emerald-600 font-medium mt-0.5">
                  Across {summary.paymentCount} payments
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <ArrowDownLeft className="w-6 h-6" />
              </div>
            </div>

            {/* Total Outstanding Balance */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Outstanding (₹)</p>
                <h3 className="text-2xl font-black text-rose-600 font-mono mt-1">
                  {formatINR(summary.totalOutstanding)}
                </h3>
                <p className="text-xs text-rose-600 font-medium mt-0.5">
                  From {summary.unpaidOrdersCount} unpaid orders
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <ArrowUpRight className="w-6 h-6" />
              </div>
            </div>

            {/* Unpaid Orders Count */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Pending Orders</p>
                <h3 className="text-2xl font-black text-slate-900 font-mono mt-1">
                  {summary.unpaidOrdersCount}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Orders with balance</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock className="w-6 h-6" />
              </div>
            </div>

            {/* Customer Accounts with Balance */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Debtor Customers</p>
                <h3 className="text-2xl font-black text-slate-900 font-mono mt-1">
                  {customerBalances.length}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Accounts with dues</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <User className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Tab Switcher & Search Bar */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Tabs */}
              <div className="flex items-center space-x-1.5 p-1 rounded-2xl bg-slate-100">
                <button
                  onClick={() => setActiveTab('balances')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                    activeTab === 'balances'
                      ? 'bg-white text-blue-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Customer Outstanding ({customerBalances.length})
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                    activeTab === 'history'
                      ? 'bg-white text-blue-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Payment History ({payments.length})
                </button>
              </div>

              {/* Search & Method Filter */}
              <div className="flex items-center space-x-2">
                <div className="relative flex-1 sm:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search name, phone, order #..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setBalancesPage(1);
                      setHistoryPage(1);
                    }}
                    className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50"
                  />
                </div>

                {activeTab === 'history' && (
                  <select
                    value={methodFilter}
                    onChange={(e) => {
                      setMethodFilter(e.target.value);
                      setHistoryPage(1);
                    }}
                    className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white"
                  >
                    <option value="all">All Modes</option>
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="Card">Card</option>
                  </select>
                )}

                <button
                  onClick={fetchPaymentsData}
                  className="p-2 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-50 transition"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
                </button>
              </div>
            </div>
          </div>

          {/* TAB 1: Customer Outstanding Balances */}
          {activeTab === 'balances' && (
            <div className="space-y-4">
              <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                  <h3 className="font-bold text-slate-800 text-sm">Customers with Pending Balances</h3>
                  <span className="text-xs text-slate-500">Click &quot;Collect&quot; to clear outstanding dues</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold text-[10px] tracking-wider">
                        <th className="py-3 px-4">Customer Name</th>
                        <th className="py-3 px-4">Contact Phone</th>
                        <th className="py-3 px-4">Unpaid Orders</th>
                        <th className="py-3 px-4">Total Balance (₹)</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {loading ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-400">Loading customer ledger...</td>
                        </tr>
                      ) : filteredBalances.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-emerald-600 font-semibold">
                            ✓ No outstanding balances found! All customer orders are fully cleared.
                          </td>
                        </tr>
                      ) : (
                        filteredBalances
                          .slice((balancesPage - 1) * PAGE_SIZE, balancesPage * PAGE_SIZE)
                          .map((item) => (
                            <tr key={item.customerId} className="hover:bg-slate-50 transition">
                              <td className="py-3 px-4 font-bold text-slate-900">{item.customerName}</td>
                              <td className="py-3 px-4 text-slate-600 font-mono">{item.contact || 'N/A'}</td>
                              <td className="py-3 px-4">
                                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px]">
                                  {item.unpaidOrdersCount} order(s)
                                </span>
                              </td>
                              <td className="py-3 px-4 font-mono font-black text-rose-600 text-sm">
                                {formatINR(item.totalBalance)}
                              </td>
                              <td className="py-3 px-4 text-right">
                                {/* Find first unpaid order for this customer */}
                                {(() => {
                                  const order = ordersWithBalance.find((o) => o.customerId.toString() === item.customerId);
                                  return order ? (
                                    <button
                                      onClick={() => handleOpenCollectModal(order)}
                                      className="px-3 py-1.5 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 shadow-xs transition"
                                    >
                                      Collect ₹
                                    </button>
                                  ) : null;
                                })()}
                              </td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination for Balances */}
                {!loading && filteredBalances.length > 0 && (
                  <div className="p-4 bg-slate-50/50">
                    <Pagination
                      currentPage={balancesPage}
                      totalItems={filteredBalances.length}
                      pageSize={PAGE_SIZE}
                      onPageChange={setBalancesPage}
                      label="debtor customers"
                    />
                  </div>
                )}
              </div>

              {/* Order-wise Breakdown of Unpaid Clothes */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-4 sm:p-5 space-y-3">
                <h4 className="font-bold text-slate-800 text-sm">Active Orders Awaiting Payment</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {ordersWithBalance.map((ord) => (
                    <div
                      key={ord._id}
                      className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 hover:border-blue-300 transition space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-blue-600 text-xs">#{ord.orderNumber}</span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-amber-100 text-amber-800">
                          {ord.status}
                        </span>
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-xs">{ord.customerName}</p>
                        <p className="text-[11px] text-slate-500 font-mono">{ord.customerContact || 'N/A'}</p>
                      </div>
                      <div className="flex justify-between items-baseline border-t border-slate-200 pt-1.5 text-xs">
                        <span className="text-slate-500">Pending:</span>
                        <span className="font-mono font-black text-rose-600">{formatINR(ord.balance)}</span>
                      </div>
                      <button
                        onClick={() => handleOpenCollectModal(ord)}
                        className="w-full py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 shadow-xs transition"
                      >
                        Record Payment
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Payment Transaction History */}
          {activeTab === 'history' && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                <h3 className="font-bold text-slate-800 text-sm">All Recorded Payments Log</h3>
                <span className="text-xs text-slate-500">Immutable ledger of cash, UPI, and card receipts</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold text-[10px] tracking-wider">
                      <th className="py-3 px-4">Date & Time</th>
                      <th className="py-3 px-4">Order #</th>
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">Amount</th>
                      <th className="py-3 px-4">Mode</th>
                      <th className="py-3 px-4">Ref / Notes</th>
                      <th className="py-3 px-4">Staff</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400">Loading payment ledger...</td>
                      </tr>
                    ) : filteredPayments.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400">No payment records found.</td>
                      </tr>
                    ) : (
                      filteredPayments
                        .slice((historyPage - 1) * PAGE_SIZE, historyPage * PAGE_SIZE)
                        .map((p) => (
                          <tr key={p._id} className="hover:bg-slate-50 transition">
                            <td className="py-3 px-4 text-slate-600">
                              {p.createdAt ? new Date(p.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                            </td>
                            <td className="py-3 px-4 font-mono font-bold text-blue-600">#{p.orderNumber}</td>
                            <td className="py-3 px-4 font-semibold text-slate-800">{p.customerName}</td>
                            <td className="py-3 px-4 font-mono font-black text-emerald-600 text-sm">
                              {formatINR(p.amount)}
                            </td>
                            <td className="py-3 px-4">
                              <span className="px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 font-bold text-[11px] border border-blue-200">
                                {p.method}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                              {p.referenceNumber || p.notes || (p.isAdvance ? 'Advance' : 'Handover')}
                            </td>
                            <td className="py-3 px-4 text-slate-700 font-medium">{p.staffName || 'Staff'}</td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination for History */}
              {!loading && filteredPayments.length > 0 && (
                <div className="p-4 bg-slate-50/50">
                  <Pagination
                    currentPage={historyPage}
                    totalItems={filteredPayments.length}
                    pageSize={PAGE_SIZE}
                    onPageChange={setHistoryPage}
                    label="payments"
                  />
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Collect Payment Modal */}
      {selectedOrderToPay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95 space-y-4">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Collect Payment</h3>
              <p className="text-xs text-slate-500">Order #{selectedOrderToPay.orderNumber} • {selectedOrderToPay.customerName}</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1">
              <div className="flex justify-between text-slate-600">
                <span>Total Order Value:</span>
                <span className="font-mono font-semibold">{formatINR(selectedOrderToPay.total)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Amount Already Paid:</span>
                <span className="font-mono text-emerald-600">{formatINR(selectedOrderToPay.amountPaid)}</span>
              </div>
              <div className="flex justify-between font-bold text-rose-600 border-t pt-1">
                <span>Remaining Balance:</span>
                <span className="font-mono">{formatINR(selectedOrderToPay.balance)}</span>
              </div>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Amount to Collect (₹) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">₹</span>
                  <input
                    type="number"
                    min="1"
                    max={selectedOrderToPay.balance}
                    required
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
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
                      onClick={() => setPayMethod(m)}
                      className={`py-2 text-xs font-bold rounded-xl border transition ${
                        payMethod === m
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {payMethod !== 'Cash' && (
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                    {payMethod} Transaction / UTR Ref #
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. UPI/2026/8899"
                    value={payRef}
                    onChange={(e) => setPayRef(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                  />
                </div>
              )}

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Customer cleared remaining dues"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedOrderToPay(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPayment}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition"
                >
                  {submittingPayment ? 'Recording...' : `Record ₹${payAmount}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dual Printable Receipt Modal */}
      <ReceiptModal order={receiptOrder} onClose={() => setReceiptOrder(null)} />
    </div>
  );
}


