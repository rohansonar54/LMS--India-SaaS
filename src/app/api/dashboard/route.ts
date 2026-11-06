import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Order } from '@/models/Order';
import { Customer } from '@/models/Customer';
import { Supply } from '@/models/Supply';
import { Payment } from '@/models/Payment';
import { Location } from '@/models/Location';
import { getLocationQueryFilter, requireAuth } from '@/lib/auth-helpers';

export async function GET(req: Request) {
  try {
    const auth = await requireAuth();
    if (!auth.user) return auth.response;

    await connectDB();
    const user = auth.user;
    const locationFilter = await getLocationQueryFilter(req);

    // Date boundaries
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const locationQuery = user.level > 0 && user.locationId 
      ? { _id: user.locationId, active: true } 
      : { active: true };

    // Query in parallel
    const [allOrders, allPayments, customers, supplies, locations] = await Promise.all([
      Order.find({ ...locationFilter, status: { $ne: 'cancelled' } }).sort({ createdAt: -1 }),
      Payment.find(locationFilter).sort({ createdAt: -1 }),
      Customer.find(locationFilter),
      Supply.find(locationFilter),
      Location.find(locationQuery),
    ]);

    // Actual revenue collected (strictly from payments, not unpaid orders)
    const totalRevenue = allPayments.reduce((acc, p) => acc + p.amount, 0);

    const todayRevenue = allPayments
      .filter((p) => new Date(p.createdAt) >= startOfToday)
      .reduce((acc, p) => acc + p.amount, 0);

    const monthlyRevenue = allPayments
      .filter((p) => new Date(p.createdAt) >= startOfMonth)
      .reduce((acc, p) => acc + p.amount, 0);

    // Total outstanding balance across all active orders
    const totalOutstanding = allOrders.reduce((acc, o) => acc + (o.balance || 0), 0);

    // Order counts
    const todayOrdersCount = allOrders.filter((o) => new Date(o.createdAt) >= startOfToday).length;
    const newCustomersCount = customers.filter((c) => new Date(c.createdAt) >= startOfMonth).length;
    const lowStockCount = supplies.filter((s) => s.stock < 20).length;

    // Status breakdown counts
    const statusCounts = {
      pending: allOrders.filter((o) => o.status === 'pending').length,
      processing: allOrders.filter((o) => o.status === 'processing').length,
      washing_drying: allOrders.filter((o) => o.status === 'washing_drying' || o.status === 'washing' || o.status === 'drying').length,
      washing: allOrders.filter((o) => o.status === 'washing').length,
      drying: allOrders.filter((o) => o.status === 'drying').length,
      ironing: allOrders.filter((o) => o.status === 'ironing').length,
      dry_cleaning: allOrders.filter((o) => o.status === 'dry_cleaning').length,
      folding: allOrders.filter((o) => o.status === 'folding').length,
      done: allOrders.filter((o) => o.status === 'done').length,
      claimed: allOrders.filter((o) => o.status === 'claimed').length,
    };

    const activeCount = allOrders.filter(
      (o) => !['done', 'claimed', 'cancelled'].includes(o.status)
    ).length;

    const completedCount = allOrders.filter((o) => ['done', 'claimed'].includes(o.status)).length;

    // Payment methods distribution
    const paymentMethodsDist: Record<string, number> = { Cash: 0, UPI: 0, Card: 0, 'Net Banking': 0 };
    for (const p of allPayments) {
      const m = p.method || 'Cash';
      paymentMethodsDist[m] = (paymentMethodsDist[m] || 0) + p.amount;
    }

    // Location comparison (if admin viewing consolidated)
    const locationComparison = locations.map((loc) => {
      const locOrders = allOrders.filter((o) => o.locationId?.toString() === loc._id.toString());
      const locPayments = allPayments.filter((p) => p.locationId?.toString() === loc._id.toString());
      return {
        id: loc._id,
        name: loc.name,
        code: loc.code,
        ordersCount: locOrders.length,
        revenue: locPayments.reduce((sum, p) => sum + p.amount, 0),
        outstanding: locOrders.reduce((sum, o) => sum + (o.balance || 0), 0),
      };
    });

    // Recent 6 orders
    const recentOrders = allOrders.slice(0, 6);

    return NextResponse.json({
      success: true,
      stats: {
        totalRevenue,
        todayRevenue,
        monthlyRevenue,
        totalOutstanding,
        totalOrders: allOrders.length,
        todayOrders: todayOrdersCount,
        activeCount,
        completedCount,
        totalCustomers: customers.length,
        newCustomers: newCustomersCount,
        lowStockCount,
      },
      statusCounts,
      paymentMethodsDist,
      locationComparison,
      recentOrders,
    });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
