import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Order } from '@/models/Order';
import { Payment } from '@/models/Payment';
import { Location } from '@/models/Location';
import { getLocationQueryFilter, requireAuth } from '@/lib/auth-helpers';

export async function GET(req: Request) {
  try {
    // Sales & Reports are strictly restricted to Admin only
    const auth = await requireAuth(0);
    if (!auth.user) return auth.response;

    await connectDB();
    const { searchParams } = new URL(req.url);
    const reportType = searchParams.get('type') || 'daily_revenue';
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const statusParam = searchParams.get('status');

    const locationFilter = await getLocationQueryFilter(req);

    // Date filters
    const dateQuery: Record<string, unknown> = {};
    if (startDateParam || endDateParam) {
      dateQuery.createdAt = {};
      if (startDateParam) {
        (dateQuery.createdAt as Record<string, unknown>).$gte = new Date(startDateParam);
      }
      if (endDateParam) {
        const end = new Date(endDateParam);
        end.setHours(23, 59, 59, 999);
        (dateQuery.createdAt as Record<string, unknown>).$lte = end;
      }
    }

    // Status filter
    const statusQuery: Record<string, unknown> = {};
    if (statusParam && statusParam !== 'all') {
      if (statusParam === 'washing_drying' || statusParam === 'washing') {
        statusQuery.status = { $in: ['washing_drying', 'washing', 'drying'] };
      } else {
        statusQuery.status = statusParam;
      }
    }

    let reportData: unknown = null;

    switch (reportType) {
      // 1. Daily Revenue (strictly from payments collected)
      case 'daily_revenue': {
        const payments = await Payment.find({ ...locationFilter, ...dateQuery }).sort({ createdAt: -1 });
        const grouped: Record<string, { date: string; amount: number; count: number }> = {};
        for (const p of payments) {
          const d = new Date(p.createdAt).toISOString().split('T')[0];
          if (!grouped[d]) grouped[d] = { date: d, amount: 0, count: 0 };
          grouped[d].amount += p.amount;
          grouped[d].count += 1;
        }
        reportData = Object.values(grouped).sort((a, b) => b.date.localeCompare(a.date));
        break;
      }

      // 2. Weekly Revenue
      case 'weekly_revenue': {
        const payments = await Payment.find({ ...locationFilter, ...dateQuery }).sort({ createdAt: -1 });
        const grouped: Record<string, { week: string; amount: number; count: number }> = {};
        for (const p of payments) {
          const d = new Date(p.createdAt);
          const oneJan = new Date(d.getFullYear(), 0, 1);
          const numberOfDays = Math.floor((d.getTime() - oneJan.getTime()) / (24 * 60 * 60 * 1000));
          const weekNumber = Math.ceil((d.getDay() + 1 + numberOfDays) / 7);
          const key = `Year ${d.getFullYear()} - W${weekNumber}`;
          if (!grouped[key]) grouped[key] = { week: key, amount: 0, count: 0 };
          grouped[key].amount += p.amount;
          grouped[key].count += 1;
        }
        reportData = Object.values(grouped);
        break;
      }

      // 3. Monthly Revenue
      case 'monthly_revenue': {
        const payments = await Payment.find({ ...locationFilter, ...dateQuery }).sort({ createdAt: -1 });
        const grouped: Record<string, { month: string; amount: number; count: number }> = {};
        for (const p of payments) {
          const d = new Date(p.createdAt);
          const key = d.toLocaleString('en-IN', { month: 'short', year: 'numeric' });
          if (!grouped[key]) grouped[key] = { month: key, amount: 0, count: 0 };
          grouped[key].amount += p.amount;
          grouped[key].count += 1;
        }
        reportData = Object.values(grouped);
        break;
      }

      // 4. Yearly Revenue
      case 'yearly_revenue': {
        const payments = await Payment.find({ ...locationFilter, ...dateQuery }).sort({ createdAt: -1 });
        const grouped: Record<string, { year: string; amount: number; count: number }> = {};
        for (const p of payments) {
          const year = new Date(p.createdAt).getFullYear().toString();
          if (!grouped[year]) grouped[year] = { year, amount: 0, count: 0 };
          grouped[year].amount += p.amount;
          grouped[year].count += 1;
        }
        reportData = Object.values(grouped);
        break;
      }

      // 5. Order Summary
      case 'order_summary': {
        const orders = await Order.find({
          ...locationFilter,
          ...dateQuery,
          ...statusQuery,
          status: { $ne: 'cancelled' },
        }).sort({ createdAt: -1 });

        const totalOrderValue = orders.reduce((s, o) => s + (o.total || 0), 0);
        const totalCollected = orders.reduce((s, o) => s + (o.amountPaid || 0), 0);
        const totalOutstanding = orders.reduce((s, o) => s + (o.balance !== undefined ? o.balance : Math.max(0, o.total - o.amountPaid)), 0);

        reportData = {
          totalOrders: orders.length,
          totalOrderValue,
          totalCollected,
          totalOutstanding,
          orders: orders.map((o) => {
            const items = (o.orderItems && o.orderItems.length > 0)
              ? o.orderItems.map((i: { itemName?: string; qty?: number; serviceName?: string }) => `${i.itemName || 'Item'} x ${i.qty || 1}`).join(', ')
              : (o.items && o.items.length > 0)
                ? o.items.map((i: { typeName?: string; kilo?: number }) => `${i.typeName || 'Laundry'} ${i.kilo ? `(${i.kilo}kg)` : ''}`).join(', ')
                : '1 Order';

            return {
              orderNumber: o.orderNumber,
              customerName: o.customerName,
              customerContact: o.customerContact || '—',
              locationName: o.locationName || 'Central Hub',
              items,
              total: o.total,
              amountPaid: o.amountPaid,
              balance: o.balance !== undefined ? o.balance : Math.max(0, o.total - o.amountPaid),
              paymentStatus: o.paymentStatus || (o.amountPaid >= o.total ? 'paid' : o.amountPaid > 0 ? 'partial' : 'unpaid'),
              status: o.status,
              createdAt: o.createdAt,
            };
          }),
        };
        break;
      }

      // 6. Pending Orders
      case 'pending_orders': {
        const orders = await Order.find({
          ...locationFilter,
          ...dateQuery,
          status: { $in: ['pending', 'processing', 'washing_drying', 'washing', 'drying', 'ironing', 'dry_cleaning', 'folding'] },
        }).sort({ createdAt: -1 });

        reportData = orders.map((o) => ({
          orderNumber: o.orderNumber,
          customerName: o.customerName,
          customerContact: o.customerContact || '—',
          locationName: o.locationName || 'Central Hub',
          total: o.total,
          amountPaid: o.amountPaid,
          balance: o.balance !== undefined ? o.balance : Math.max(0, o.total - o.amountPaid),
          status: o.status,
          createdAt: o.createdAt,
        }));
        break;
      }

      // 7. Completed / Delivered Orders
      case 'completed_orders': {
        const orders = await Order.find({
          ...locationFilter,
          ...dateQuery,
          status: { $in: ['done', 'claimed'] },
        }).sort({ createdAt: -1 });

        reportData = orders.map((o) => ({
          orderNumber: o.orderNumber,
          customerName: o.customerName,
          customerContact: o.customerContact || '—',
          locationName: o.locationName || 'Central Hub',
          total: o.total,
          amountPaid: o.amountPaid,
          balance: o.balance !== undefined ? o.balance : Math.max(0, o.total - o.amountPaid),
          status: o.status,
          createdAt: o.createdAt,
        }));
        break;
      }

      // 8. Customer-wise Revenue
      case 'customer_revenue': {
        const payments = await Payment.find({ ...locationFilter, ...dateQuery });
        const grouped: Record<string, { customerId: string; customerName: string; totalPaid: number; transactionsCount: number }> = {};
        for (const p of payments) {
          const cId = p.customerId ? p.customerId.toString() : p.customerName;
          if (!grouped[cId]) {
            grouped[cId] = { customerId: cId, customerName: p.customerName, totalPaid: 0, transactionsCount: 0 };
          }
          grouped[cId].totalPaid += p.amount;
          grouped[cId].transactionsCount += 1;
        }
        reportData = Object.values(grouped).sort((a, b) => b.totalPaid - a.totalPaid);
        break;
      }

      // 9. Outstanding Payment Report
      case 'outstanding_payments': {
        const orders = await Order.find({
          ...locationFilter,
          ...dateQuery,
          balance: { $gt: 0 },
          status: { $ne: 'cancelled' },
        }).sort({ balance: -1 });

        reportData = orders.map((o) => ({
          orderNumber: o.orderNumber,
          customerName: o.customerName,
          customerContact: o.customerContact || '—',
          locationName: o.locationName || 'Central Hub',
          total: o.total,
          amountPaid: o.amountPaid,
          balance: o.balance !== undefined ? o.balance : Math.max(0, o.total - o.amountPaid),
          status: o.status,
          createdAt: o.createdAt,
        }));
        break;
      }

      // 10. Payment Collection Report
      case 'payment_collections': {
        const payments = await Payment.find({ ...locationFilter, ...dateQuery }).sort({ createdAt: -1 });
        reportData = payments.map((p) => ({
          date: p.createdAt,
          orderNumber: p.orderNumber,
          customerName: p.customerName,
          amount: p.amount,
          method: p.method,
          referenceNumber: p.referenceNumber || '—',
          staffName: p.staffName || 'Staff',
          locationName: p.locationName || 'Central Hub',
        }));
        break;
      }

      // 11. Location-wise Revenue Comparison
      case 'location_comparison': {
        const locations = await Location.find({ active: true });
        const [orders, payments] = await Promise.all([
          Order.find({ status: { $ne: 'cancelled' }, ...dateQuery }),
          Payment.find(dateQuery),
        ]);

        reportData = locations.map((loc) => {
          const locPayments = payments.filter((p) => p.locationId?.toString() === loc._id.toString());
          const locOrders = orders.filter((o) => o.locationId?.toString() === loc._id.toString());
          const collected = locPayments.reduce((s, p) => s + p.amount, 0);
          const outstanding = locOrders.reduce((s, o) => s + (o.balance || 0), 0);
          return {
            locationName: loc.name,
            locationCode: loc.code,
            ordersCount: locOrders.length,
            revenueCollected: collected,
            outstandingBalance: outstanding,
          };
        });
        break;
      }

      // 12. Staff Performance Report
      case 'staff_performance': {
        const [orders, payments] = await Promise.all([
          Order.find({ status: { $ne: 'cancelled' }, ...locationFilter, ...dateQuery }),
          Payment.find({ ...locationFilter, ...dateQuery }),
        ]);

        const grouped: Record<string, { staffName: string; ordersCreated: number; totalCollected: number }> = {};
        for (const o of orders) {
          const name = o.staffName || 'Staff';
          if (!grouped[name]) grouped[name] = { staffName: name, ordersCreated: 0, totalCollected: 0 };
          grouped[name].ordersCreated += 1;
        }
        for (const p of payments) {
          const name = p.staffName || 'Staff';
          if (!grouped[name]) grouped[name] = { staffName: name, ordersCreated: 0, totalCollected: 0 };
          grouped[name].totalCollected += p.amount;
        }
        reportData = Object.values(grouped);
        break;
      }

      default:
        return NextResponse.json({ success: false, message: 'Invalid report type' }, { status: 400 });
    }

    return NextResponse.json({ success: true, reportType, data: reportData });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
