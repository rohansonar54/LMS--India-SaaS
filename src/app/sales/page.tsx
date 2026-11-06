'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import Pagination from '@/components/Pagination';
import { formatINR } from '@/lib/currency';
import {
  exportReportToExcel,
  exportReportToCSV,
  printReportDocument,
  ReportMeta,
  SummaryTotalItem,
} from '@/lib/report-export';
import {
  BarChart3,
  Printer,
  Download,
  Calendar,
  Filter,
  RefreshCw,
  Building2,
  FileSpreadsheet,
  TrendingUp,
} from 'lucide-react';

interface ReportOption {
  key: string;
  label: string;
  category: string;
}

const REPORT_TYPES: ReportOption[] = [
  { key: 'daily_revenue', label: '1. Daily Revenue Report', category: 'Financial' },
  { key: 'weekly_revenue', label: '2. Weekly Revenue Report', category: 'Financial' },
  { key: 'monthly_revenue', label: '3. Monthly Revenue Report', category: 'Financial' },
  { key: 'yearly_revenue', label: '4. Yearly Revenue Report', category: 'Financial' },
  { key: 'order_summary', label: '5. Order Summary Report', category: 'Operations' },
  { key: 'pending_orders', label: '6. Pending Orders Report', category: 'Operations' },
  { key: 'completed_orders', label: '7. Completed / Delivered Report', category: 'Operations' },
  { key: 'customer_revenue', label: '8. Customer-wise Revenue Report', category: 'Financial' },
  { key: 'outstanding_payments', label: '9. Outstanding Payments Report', category: 'Financial' },
  { key: 'payment_collections', label: '10. Payment Collection Details', category: 'Financial' },
  { key: 'location_comparison', label: '11. Location Revenue Comparison', category: 'Executive' },
  { key: 'staff_performance', label: '12. Staff Performance Report', category: 'Executive' },
];

export default function SalesReportsPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState('daily_revenue');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [orderStatus, setOrderStatus] = useState('all');
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reportPage, setReportPage] = useState(1);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated && data.user?.level > 0) {
          window.location.href = '/access-denied';
        }
      })
      .catch(() => {});
  }, []);

  const fetchReport = () => {
    setLoading(true);
    setReportPage(1);
    let url = `/api/reports?type=${selectedReport}`;
    if (startDate) url += `&startDate=${startDate}`;
    if (endDate) url += `&endDate=${endDate}`;
    if (orderStatus !== 'all') url += `&status=${orderStatus}`;

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setReportData(data.data);
        } else {
          setReportData(null);
        }
      })
      .catch(() => setReportData(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setReportData(null); // Clear previous report data immediately to prevent mismatch render crash
    fetchReport();
  }, [selectedReport, startDate, endDate, orderStatus]);

  const currentReportMeta = REPORT_TYPES.find((r) => r.key === selectedReport);

  const dateRangeStr =
    startDate || endDate
      ? `${startDate || 'Earliest'} to ${endDate || 'Latest'}`
      : 'All Time';

  // Helper to extract rows and columns for Export/Print
  const getPreparedReportData = (): {
    columns: { key: string; label: string; isCurrency?: boolean }[];
    rows: Record<string, unknown>[];
    summaryTotals: SummaryTotalItem[];
  } => {
    if (!reportData) return { columns: [], rows: [], summaryTotals: [] };

    if (selectedReport === 'daily_revenue' && Array.isArray(reportData)) {
      const totalRev = reportData.reduce((s: number, r: any) => s + (r.amount || 0), 0);
      const totalCount = reportData.reduce((s: number, r: any) => s + (r.count || 0), 0);
      return {
        columns: [
          { key: 'date', label: 'Date' },
          { key: 'count', label: 'Payments Count' },
          { key: 'amount', label: 'Revenue Collected', isCurrency: true },
        ],
        rows: reportData,
        summaryTotals: [
          { label: 'Total Days', value: reportData.length },
          { label: 'Total Transactions', value: totalCount },
          { label: 'Total Revenue', value: totalRev, isCurrency: true },
        ],
      };
    }

    if (
      (selectedReport === 'weekly_revenue' ||
        selectedReport === 'monthly_revenue' ||
        selectedReport === 'yearly_revenue') &&
      Array.isArray(reportData)
    ) {
      const keyName =
        selectedReport === 'weekly_revenue'
          ? 'week'
          : selectedReport === 'monthly_revenue'
          ? 'month'
          : 'year';
      const totalRev = reportData.reduce((s: number, r: any) => s + (r.amount || 0), 0);
      return {
        columns: [
          { key: keyName, label: 'Period' },
          { key: 'count', label: 'Payments Count' },
          { key: 'amount', label: 'Total Revenue', isCurrency: true },
        ],
        rows: reportData,
        summaryTotals: [
          { label: 'Periods Count', value: reportData.length },
          { label: 'Total Revenue', value: totalRev, isCurrency: true },
        ],
      };
    }

    if (selectedReport === 'order_summary') {
      const orders = Array.isArray(reportData?.orders) ? reportData.orders : [];
      return {
        columns: [
          { key: 'orderNumber', label: 'Order #' },
          { key: 'customerName', label: 'Customer' },
          { key: 'customerContact', label: 'Contact' },
          { key: 'locationName', label: 'Location' },
          { key: 'items', label: 'Items' },
          { key: 'total', label: 'Total Amount', isCurrency: true },
          { key: 'amountPaid', label: 'Paid Amount', isCurrency: true },
          { key: 'balance', label: 'Balance Due', isCurrency: true },
          { key: 'status', label: 'Order Status' },
          { key: 'paymentStatus', label: 'Payment Status' },
          { key: 'createdAt', label: 'Order Date' },
        ],
        rows: orders,
        summaryTotals: [
          { label: 'Total Orders', value: reportData?.totalOrders || orders.length },
          { label: 'Total Order Value', value: reportData?.totalOrderValue || 0, isCurrency: true },
          { label: 'Total Collected', value: reportData?.totalCollected || 0, isCurrency: true },
          { label: 'Total Outstanding', value: reportData?.totalOutstanding || 0, isCurrency: true },
        ],
      };
    }

    if (
      (selectedReport === 'pending_orders' ||
        selectedReport === 'completed_orders' ||
        selectedReport === 'outstanding_payments') &&
      Array.isArray(reportData)
    ) {
      const totalAmount = reportData.reduce((s: number, r: any) => s + (r.total || 0), 0);
      const totalPaid = reportData.reduce((s: number, r: any) => s + (r.amountPaid || 0), 0);
      const totalBalance = reportData.reduce((s: number, r: any) => s + (r.balance || 0), 0);
      return {
        columns: [
          { key: 'orderNumber', label: 'Order #' },
          { key: 'customerName', label: 'Customer' },
          { key: 'customerContact', label: 'Contact' },
          { key: 'locationName', label: 'Location' },
          { key: 'total', label: 'Total Amount', isCurrency: true },
          { key: 'amountPaid', label: 'Amount Paid', isCurrency: true },
          { key: 'balance', label: 'Balance Due', isCurrency: true },
          { key: 'status', label: 'Status' },
          { key: 'createdAt', label: 'Date' },
        ],
        rows: reportData,
        summaryTotals: [
          { label: 'Total Records', value: reportData.length },
          { label: 'Total Amount', value: totalAmount, isCurrency: true },
          { label: 'Amount Paid', value: totalPaid, isCurrency: true },
          { label: 'Outstanding Balance', value: totalBalance, isCurrency: true },
        ],
      };
    }

    if (selectedReport === 'customer_revenue' && Array.isArray(reportData)) {
      const totalPaid = reportData.reduce((s: number, r: any) => s + (r.totalPaid || 0), 0);
      return {
        columns: [
          { key: 'customerName', label: 'Customer Name' },
          { key: 'transactionsCount', label: 'Transactions' },
          { key: 'totalPaid', label: 'Total Amount Paid', isCurrency: true },
        ],
        rows: reportData,
        summaryTotals: [
          { label: 'Customers Count', value: reportData.length },
          { label: 'Total Revenue', value: totalPaid, isCurrency: true },
        ],
      };
    }

    if (selectedReport === 'payment_collections' && Array.isArray(reportData)) {
      const totalAmt = reportData.reduce((s: number, r: any) => s + (r.amount || 0), 0);
      return {
        columns: [
          { key: 'date', label: 'Date' },
          { key: 'orderNumber', label: 'Order #' },
          { key: 'customerName', label: 'Customer' },
          { key: 'amount', label: 'Amount', isCurrency: true },
          { key: 'method', label: 'Payment Method' },
          { key: 'referenceNumber', label: 'Ref / Notes' },
          { key: 'staffName', label: 'Staff' },
          { key: 'locationName', label: 'Location' },
        ],
        rows: reportData,
        summaryTotals: [
          { label: 'Total Payments', value: reportData.length },
          { label: 'Total Amount Collected', value: totalAmt, isCurrency: true },
        ],
      };
    }

    if (selectedReport === 'location_comparison' && Array.isArray(reportData)) {
      const totalRev = reportData.reduce((s: number, r: any) => s + (r.revenueCollected || 0), 0);
      const totalOrders = reportData.reduce((s: number, r: any) => s + (r.ordersCount || 0), 0);
      const totalDues = reportData.reduce((s: number, r: any) => s + (r.outstandingBalance || 0), 0);
      return {
        columns: [
          { key: 'locationName', label: 'Branch Location' },
          { key: 'locationCode', label: 'Code' },
          { key: 'ordersCount', label: 'Total Orders' },
          { key: 'revenueCollected', label: 'Revenue Collected', isCurrency: true },
          { key: 'outstandingBalance', label: 'Outstanding Balance', isCurrency: true },
        ],
        rows: reportData,
        summaryTotals: [
          { label: 'Total Locations', value: reportData.length },
          { label: 'Total Orders', value: totalOrders },
          { label: 'Total Revenue', value: totalRev, isCurrency: true },
          { label: 'Total Dues', value: totalDues, isCurrency: true },
        ],
      };
    }

    if (selectedReport === 'staff_performance' && Array.isArray(reportData)) {
      const totalOrders = reportData.reduce((s: number, r: any) => s + (r.ordersCreated || 0), 0);
      const totalAmt = reportData.reduce((s: number, r: any) => s + (r.totalCollected || 0), 0);
      return {
        columns: [
          { key: 'staffName', label: 'Staff Member' },
          { key: 'ordersCreated', label: 'Orders Handled' },
          { key: 'totalCollected', label: 'Payments Handled', isCurrency: true },
        ],
        rows: reportData,
        summaryTotals: [
          { label: 'Staff Count', value: reportData.length },
          { label: 'Orders Handled', value: totalOrders },
          { label: 'Total Collected', value: totalAmt, isCurrency: true },
        ],
      };
    }

    // Generic fallback
    if (Array.isArray(reportData) && reportData.length > 0) {
      const cols = Object.keys(reportData[0])
        .filter((k) => !['_id', '__v'].includes(k))
        .map((k) => ({
          key: k,
          label: k.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()),
          isCurrency: /amount|total|price|balance/i.test(k),
        }));
      return { columns: cols, rows: reportData, summaryTotals: [] };
    }

    return { columns: [], rows: [], summaryTotals: [] };
  };

  // Export handlers
  const handleExportExcel = () => {
    const { columns, rows, summaryTotals } = getPreparedReportData();
    if (rows.length === 0) {
      alert('No data available to export.');
      return;
    }
    const meta: ReportMeta = {
      title: currentReportMeta?.label || 'Business Report',
      category: currentReportMeta?.category,
      dateRange: dateRangeStr,
      locationName: 'All Locations / Assigned Branch',
    };
    exportReportToExcel({ meta, columns, rows, summaryTotals });
  };

  const handleExportCSV = () => {
    const { columns, rows, summaryTotals } = getPreparedReportData();
    if (rows.length === 0) {
      alert('No data available to export.');
      return;
    }
    const meta: ReportMeta = {
      title: currentReportMeta?.label || 'Business Report',
      dateRange: dateRangeStr,
      locationName: 'All Locations / Assigned Branch',
    };
    exportReportToCSV({ meta, columns, rows, summaryTotals });
  };

  const handlePrint = () => {
    const { columns, rows, summaryTotals } = getPreparedReportData();
    if (rows.length === 0) {
      alert('No report data available to print.');
      return;
    }
    const meta: ReportMeta = {
      title: currentReportMeta?.label || 'Business Report',
      dateRange: dateRangeStr,
      locationName: 'All Locations / Assigned Branch',
    };
    printReportDocument({ meta, columns, rows, summaryTotals });
  };

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar mobileOpen={mobileMenuOpen} onMobileClose={() => setMobileMenuOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        <Navbar
          title="Business Analytics & Reports"
          subtitle="12 Comprehensive Operational & Financial Reports (₹)"
          onMenuClick={() => setMobileMenuOpen(true)}
        />

        <main className="p-3 sm:p-5 md:p-8 space-y-6 flex-1 max-w-7xl w-full mx-auto">
          {/* Controls Bar */}
          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
              {/* Report Selector Dropdown */}
              <div className="flex-1 max-w-md">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Select Business Report
                </label>
                <select
                  value={selectedReport}
                  onChange={(e) => setSelectedReport(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-bold text-slate-900 rounded-2xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {REPORT_TYPES.map((rep) => (
                    <option key={rep.key} value={rep.key}>
                      {rep.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Filters & Order Status */}
              <div className="flex flex-wrap items-center gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">From</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 bg-white font-medium text-slate-800"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">To</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 bg-white font-medium text-slate-800"
                  />
                </div>

                {['order_summary', 'pending_orders', 'completed_orders', 'outstanding_payments'].includes(
                  selectedReport
                ) && (
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Status</label>
                    <select
                      value={orderStatus}
                      onChange={(e) => setOrderStatus(e.target.value)}
                      className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 bg-white font-medium text-slate-800"
                    >
                      <option value="all">All Statuses</option>
                      <option value="pending">Pending</option>
                      <option value="washing_drying">Washing & Drying</option>
                      <option value="ironing">Ironing</option>
                      <option value="done">Done / Ready</option>
                      <option value="claimed">Delivered</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Action Buttons: Excel, CSV & Print */}
              <div className="flex items-center space-x-2 shrink-0 pt-2 lg:pt-0">
                <button
                  onClick={handleExportExcel}
                  className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs"
                  title="Download professional Excel spreadsheet with full styling"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Export Excel</span>
                </button>
                <button
                  onClick={handleExportCSV}
                  className="flex items-center space-x-1.5 px-3 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition"
                  title="Download CSV"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>CSV</span>
                </button>
                <button
                  onClick={handlePrint}
                  className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 shadow-xs transition"
                  title="Print report on A4 paper"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Report</span>
                </button>
              </div>
            </div>
          </div>

          {/* Report Content Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/50">
              <div>
                <h3 className="font-black text-slate-900 text-base">{currentReportMeta?.label}</h3>
                <p className="text-xs text-slate-500">
                  {dateRangeStr} • Currency: Indian Rupee (₹) • Shyam Laundrywala
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold uppercase tracking-wider self-start sm:self-auto">
                {currentReportMeta?.category}
              </span>
            </div>

            <div className="p-4 overflow-x-auto">
              {loading ? (
                <div className="py-16 text-center text-slate-400 text-xs flex flex-col items-center justify-center">
                  <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mb-2" />
                  <span>Generating report data...</span>
                </div>
              ) : !reportData ||
                (Array.isArray(reportData) && reportData.length === 0) ||
                (selectedReport === 'order_summary' &&
                  (!reportData.orders || reportData.orders.length === 0)) ? (
                <div className="py-16 text-center text-slate-400 text-xs">
                  No records found matching filters for this period.
                </div>
              ) : (
                renderReportTable(selectedReport, reportData, reportPage, setReportPage)
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function renderReportTable(
  type: string,
  data: any,
  page: number = 1,
  onPageChange?: (p: number) => void
) {
  if (!data) return null;
  const PAGE_SIZE = 20;

  // 1. Daily Revenue
  if (type === 'daily_revenue') {
    if (!Array.isArray(data)) return null;
    const totalRev = data.reduce((s: number, r: any) => s + (r.amount || 0), 0);
    const totalTxn = data.reduce((s: number, r: any) => s + (r.count || 0), 0);
    const paginatedData = data.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200 text-center">
          <div>
            <p className="text-[10px] text-slate-500 uppercase font-bold">Total Days</p>
            <p className="text-lg font-black font-mono text-slate-900">{data.length}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-500 uppercase font-bold">Transactions</p>
            <p className="text-lg font-black font-mono text-blue-600">{totalTxn}</p>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <p className="text-[10px] text-slate-500 uppercase font-bold">Total Revenue</p>
            <p className="text-lg font-black font-mono text-emerald-600">{formatINR(totalRev)}</p>
          </div>
        </div>

        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] border-b">
              <th className="py-3 px-4">Date</th>
              <th className="py-3 px-4">Payments Count</th>
              <th className="py-3 px-4 text-right">Revenue Collected</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedData.map((r: any, idx: number) => (
              <tr key={idx} className="hover:bg-slate-50 transition">
                <td className="py-3 px-4 font-bold text-slate-800">
                  {new Date(r.date).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                </td>
                <td className="py-3 px-4 text-slate-600 font-medium">{r.count} transaction(s)</td>
                <td className="py-3 px-4 text-right font-mono font-black text-emerald-600 text-sm">
                  {formatINR(r.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {onPageChange && (
          <Pagination
            currentPage={page}
            totalItems={data.length}
            pageSize={PAGE_SIZE}
            onPageChange={onPageChange}
            label="days"
          />
        )}
      </div>
    );
  }

  // 2, 3, 4: Weekly / Monthly / Yearly Revenue
  if (type === 'weekly_revenue' || type === 'monthly_revenue' || type === 'yearly_revenue') {
    if (!Array.isArray(data)) return null;
    const keyName =
      type === 'weekly_revenue' ? 'week' : type === 'monthly_revenue' ? 'month' : 'year';
    const totalRev = data.reduce((s: number, r: any) => s + (r.amount || 0), 0);

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200 text-center">
          <div>
            <p className="text-[10px] text-slate-500 uppercase font-bold">Total Periods</p>
            <p className="text-lg font-black font-mono text-slate-900">{data.length}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-500 uppercase font-bold">Total Revenue</p>
            <p className="text-lg font-black font-mono text-emerald-600">{formatINR(totalRev)}</p>
          </div>
        </div>

        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] border-b">
              <th className="py-3 px-4">Period</th>
              <th className="py-3 px-4">Payments Count</th>
              <th className="py-3 px-4 text-right">Total Revenue</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((r: any, idx: number) => (
              <tr key={idx} className="hover:bg-slate-50 transition">
                <td className="py-3 px-4 font-bold text-slate-800">{r[keyName]}</td>
                <td className="py-3 px-4 text-slate-600 font-medium">{r.count} payment(s)</td>
                <td className="py-3 px-4 text-right font-mono font-black text-emerald-600 text-sm">
                  {formatINR(r.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // 5. Order Summary Report
  if (type === 'order_summary') {
    if (!data || !Array.isArray(data.orders)) return null;
    const paginatedOrders = data.orders.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    return (
      <div className="space-y-4">
        {/* KPI Banner */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-center">
          <div>
            <p className="text-[10px] text-slate-500 uppercase font-bold">Total Orders</p>
            <p className="text-xl font-black font-mono text-slate-900">{data.totalOrders}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-500 uppercase font-bold">Total Order Value</p>
            <p className="text-xl font-black font-mono text-blue-600">
              {formatINR(data.totalOrderValue)}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-slate-500 uppercase font-bold">Actual Collected</p>
            <p className="text-xl font-black font-mono text-emerald-600">
              {formatINR(data.totalCollected)}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-slate-500 uppercase font-bold">Outstanding Dues</p>
            <p className="text-xl font-black font-mono text-rose-600">
              {formatINR(data.totalOutstanding || 0)}
            </p>
          </div>
        </div>

        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] border-b">
              <th className="py-3 px-3">Order #</th>
              <th className="py-3 px-3">Customer & Contact</th>
              <th className="py-3 px-3">Items Summary</th>
              <th className="py-3 px-3">Location</th>
              <th className="py-3 px-3">Total (₹)</th>
              <th className="py-3 px-3">Paid (₹)</th>
              <th className="py-3 px-3">Balance (₹)</th>
              <th className="py-3 px-3">Order Status</th>
              <th className="py-3 px-3 text-right">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedOrders.map((o: any, idx: number) => (
              <tr key={idx} className="hover:bg-slate-50 transition">
                <td className="py-2.5 px-3 font-mono font-bold text-blue-600">#{o.orderNumber}</td>
                <td className="py-2.5 px-3">
                  <div className="font-semibold text-slate-900">{o.customerName}</div>
                  <div className="text-[10px] text-slate-400 font-mono">{o.customerContact || '—'}</div>
                </td>
                <td className="py-2.5 px-3 text-slate-700 max-w-xs truncate" title={o.items}>
                  {o.items || '—'}
                </td>
                <td className="py-2.5 px-3 text-slate-600 font-medium">
                  {o.locationName || 'Central'}
                </td>
                <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                  {formatINR(o.total)}
                </td>
                <td className="py-2.5 px-3 font-mono text-emerald-600 font-medium">
                  {formatINR(o.amountPaid)}
                </td>
                <td className="py-2.5 px-3 font-mono font-bold text-rose-600">
                  {formatINR(o.balance)}
                </td>
                <td className="py-2.5 px-3">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                    {o.status}
                  </span>
                </td>
                <td className="py-2.5 px-3 text-right text-slate-500 text-[11px] font-mono whitespace-nowrap">
                  {o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-IN') : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {onPageChange && (
          <Pagination
            currentPage={page}
            totalItems={data.orders.length}
            pageSize={PAGE_SIZE}
            onPageChange={onPageChange}
            label="orders"
          />
        )}
      </div>
    );
  }

  // 6, 7, 9: Orders Lists (Pending, Completed, Outstanding)
  if (type === 'pending_orders' || type === 'completed_orders' || type === 'outstanding_payments') {
    if (!Array.isArray(data)) return null;
    const paginatedData = data.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    return (
      <div className="space-y-4">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] border-b">
              <th className="py-3 px-4">Order #</th>
              <th className="py-3 px-4">Customer</th>
              <th className="py-3 px-4">Location</th>
              <th className="py-3 px-4">Total</th>
              <th className="py-3 px-4">Amount Paid</th>
              <th className="py-3 px-4">Outstanding</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedData.map((o: any, idx: number) => (
              <tr key={idx} className="hover:bg-slate-50 transition">
                <td className="py-3 px-4 font-mono font-bold text-blue-600">#{o.orderNumber}</td>
                <td className="py-3 px-4">
                  <div className="font-semibold text-slate-900">{o.customerName}</div>
                  <div className="text-[10px] text-slate-400 font-mono">{o.customerContact || '—'}</div>
                </td>
                <td className="py-3 px-4 text-slate-600 font-medium">{o.locationName || 'Central'}</td>
                <td className="py-3 px-4 font-mono font-bold">{formatINR(o.total)}</td>
                <td className="py-3 px-4 font-mono text-emerald-600">{formatINR(o.amountPaid)}</td>
                <td className="py-3 px-4 font-mono font-black text-rose-600">
                  {formatINR(o.balance !== undefined ? o.balance : Math.max(0, o.total - o.amountPaid))}
                </td>
                <td className="py-3 px-4">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                    {o.status}
                  </span>
                </td>
                <td className="py-3 px-4 text-right text-slate-500 text-[11px] font-mono">
                  {o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-IN') : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {onPageChange && (
          <Pagination
            currentPage={page}
            totalItems={data.length}
            pageSize={PAGE_SIZE}
            onPageChange={onPageChange}
            label="orders"
          />
        )}
      </div>
    );
  }

  // 8. Customer Revenue
  if (type === 'customer_revenue') {
    if (!Array.isArray(data)) return null;
    const paginatedData = data.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    return (
      <div className="space-y-4">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] border-b">
              <th className="py-3 px-4">Customer Name</th>
              <th className="py-3 px-4">Transactions Count</th>
              <th className="py-3 px-4 text-right">Total Amount Paid</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedData.map((r: any, idx: number) => (
              <tr key={idx} className="hover:bg-slate-50 transition">
                <td className="py-3 px-4 font-bold text-slate-900">{r.customerName}</td>
                <td className="py-3 px-4 text-slate-600 font-medium">{r.transactionsCount}</td>
                <td className="py-3 px-4 text-right font-mono font-black text-emerald-600 text-sm">
                  {formatINR(r.totalPaid)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {onPageChange && (
          <Pagination
            currentPage={page}
            totalItems={data.length}
            pageSize={PAGE_SIZE}
            onPageChange={onPageChange}
            label="customers"
          />
        )}
      </div>
    );
  }

  // 10. Payment Collections
  if (type === 'payment_collections') {
    if (!Array.isArray(data)) return null;
    const paginatedData = data.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    return (
      <div className="space-y-4">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] border-b">
              <th className="py-3 px-4">Date</th>
              <th className="py-3 px-4">Order #</th>
              <th className="py-3 px-4">Customer</th>
              <th className="py-3 px-4">Mode</th>
              <th className="py-3 px-4">Reference</th>
              <th className="py-3 px-4">Staff</th>
              <th className="py-3 px-4 text-right">Amount (₹)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedData.map((p: any, idx: number) => (
              <tr key={idx} className="hover:bg-slate-50 transition">
                <td className="py-3 px-4 text-slate-600 text-[11px] font-mono">
                  {p.date ? new Date(p.date).toLocaleDateString('en-IN') : '—'}
                </td>
                <td className="py-3 px-4 font-mono font-bold text-blue-600">#{p.orderNumber}</td>
                <td className="py-3 px-4 font-semibold text-slate-800">{p.customerName}</td>
                <td className="py-3 px-4">
                  <span className="px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 font-bold text-[10px] border border-blue-200">
                    {p.method}
                  </span>
                </td>
                <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">{p.referenceNumber || '—'}</td>
                <td className="py-3 px-4 text-slate-700">{p.staffName || 'Staff'}</td>
                <td className="py-3 px-4 text-right font-mono font-black text-emerald-600 text-sm">
                  {formatINR(p.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {onPageChange && (
          <Pagination
            currentPage={page}
            totalItems={data.length}
            pageSize={PAGE_SIZE}
            onPageChange={onPageChange}
            label="collections"
          />
        )}
      </div>
    );
  }

  // 11. Location Comparison
  if (type === 'location_comparison') {
    if (!Array.isArray(data)) return null;
    return (
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] border-b">
            <th className="py-3 px-4">Branch Location</th>
            <th className="py-3 px-4">Code</th>
            <th className="py-3 px-4">Total Orders</th>
            <th className="py-3 px-4">Revenue Collected</th>
            <th className="py-3 px-4 text-right">Outstanding Balances</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {data.map((r: any, idx: number) => (
            <tr key={idx} className="hover:bg-slate-50 transition">
              <td className="py-3 px-4 font-bold text-slate-800">{r.locationName}</td>
              <td className="py-3 px-4 font-mono text-slate-600 font-bold">{r.locationCode}</td>
              <td className="py-3 px-4 text-slate-600 font-medium">{r.ordersCount} orders</td>
              <td className="py-3 px-4 font-mono font-bold text-emerald-600">
                {formatINR(r.revenueCollected)}
              </td>
              <td className="py-3 px-4 text-right font-mono font-black text-rose-600">
                {formatINR(r.outstandingBalance)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  // 12. Staff Performance
  if (type === 'staff_performance') {
    if (!Array.isArray(data)) return null;
    return (
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] border-b">
            <th className="py-3 px-4">Staff Member</th>
            <th className="py-3 px-4">Orders Handled</th>
            <th className="py-3 px-4 text-right">Payments Handled</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {data.map((r: any, idx: number) => (
            <tr key={idx} className="hover:bg-slate-50 transition">
              <td className="py-3 px-4 font-bold text-slate-800">{r.staffName}</td>
              <td className="py-3 px-4 text-slate-600 font-medium">{r.ordersCreated} orders</td>
              <td className="py-3 px-4 text-right font-mono font-black text-blue-600 text-sm">
                {formatINR(r.totalCollected)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  return null;
}
