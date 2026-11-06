import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Payment } from '@/models/Payment';
import { Order } from '@/models/Order';
import { Customer } from '@/models/Customer';
import { Log } from '@/models/Log';
import { getLocationQueryFilter, requireAuth } from '@/lib/auth-helpers';

export async function GET(req: Request) {
  try {
    const auth = await requireAuth();
    if (!auth.user) return auth.response;

    await connectDB();
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get('orderId');
    const customerId = searchParams.get('customerId');
    const method = searchParams.get('method');

    const locationFilter = await getLocationQueryFilter(req);
    const filter: Record<string, unknown> = { ...locationFilter };

    if (orderId) filter.orderId = orderId;
    if (customerId) filter.customerId = customerId;
    if (method && method !== 'all') filter.method = method;

    const [payments, ordersWithBalance] = await Promise.all([
      Payment.find(filter).sort({ createdAt: -1 }),
      Order.find({ ...locationFilter, balance: { $gt: 0 }, status: { $ne: 'cancelled' } })
        .select('orderNumber customerId customerName customerContact total amountPaid balance status createdAt')
        .sort({ balance: -1 }),
    ]);

    // Financial summaries
    const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0);
    const totalOutstanding = ordersWithBalance.reduce((sum, o) => sum + o.balance, 0);

    // Customer-wise aggregated outstanding balances
    const customerOutstandingMap: Record<string, { customerId: string; customerName: string; contact: string; totalBalance: number; unpaidOrdersCount: number }> = {};
    for (const o of ordersWithBalance) {
      const cId = o.customerId.toString();
      if (!customerOutstandingMap[cId]) {
        customerOutstandingMap[cId] = {
          customerId: cId,
          customerName: o.customerName,
          contact: o.customerContact || '',
          totalBalance: 0,
          unpaidOrdersCount: 0,
        };
      }
      customerOutstandingMap[cId].totalBalance += o.balance;
      customerOutstandingMap[cId].unpaidOrdersCount += 1;
    }

    return NextResponse.json({
      success: true,
      payments,
      customerBalances: Object.values(customerOutstandingMap),
      ordersWithBalance,
      summary: {
        totalCollected,
        totalOutstanding,
        paymentCount: payments.length,
        unpaidOrdersCount: ordersWithBalance.length,
      },
    });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireAuth();
    if (!auth.user) return auth.response;

    await connectDB();
    const user = auth.user;
    const body = await req.json();

    const {
      orderId,
      amount,
      method = 'Cash',
      referenceNumber = '',
      notes = '',
      staffName,
    } = body;

    if (!orderId || !amount || Number(amount) <= 0) {
      return NextResponse.json({ success: false, message: 'Valid Order ID and amount are required' }, { status: 400 });
    }

    const payAmount = Number(amount);

    // Fetch order
    const order = await Order.findById(orderId);
    if (!order) {
      return NextResponse.json({ success: false, message: 'Order not found' }, { status: 404 });
    }

    // Location isolation for staff
    if (user.level > 0 && order.locationId?.toString() !== user.locationId?.toString()) {
      return NextResponse.json(
        { success: false, message: 'Access denied: cannot collect payment for another location' },
        { status: 403 }
      );
    }

    if (order.balance <= 0) {
      return NextResponse.json({ success: false, message: 'This order is already fully paid!' }, { status: 400 });
    }

    // Guard against paying more than the remaining balance
    const actualCollection = Math.min(payAmount, order.balance);

    // Create Payment Record
    const newPayment = await Payment.create({
      orderId: order._id,
      orderNumber: order.orderNumber,
      customerId: order.customerId,
      customerName: order.customerName,
      locationId: order.locationId,
      locationName: order.locationName,
      amount: actualCollection,
      method,
      referenceNumber,
      staffName: staffName || user?.name || 'Staff',
      notes,
      isAdvance: false,
    });

    // Update Order Balance and Payment Status
    order.amountPaid += actualCollection;
    order.balance = Math.max(0, order.total - order.amountPaid);
    order.change = payAmount > actualCollection ? payAmount - actualCollection : order.change;
    order.paymentStatus = order.balance === 0 ? 'paid' : 'partial';
    order.updatedAt = new Date();
    await order.save();

    // Decrement customer outstanding balance
    await Customer.findByIdAndUpdate(order.customerId, {
      $inc: { outstandingBalance: -actualCollection },
    });

    // Audit Log
    await Log.create({
      username: staffName || user?.name || 'Staff',
      type: 'Payment',
      logs: `Recorded payment of ₹${actualCollection} via ${method} for Order #${order.orderNumber} (${order.customerName}). Remaining: ₹${order.balance}`,
      locationId: order.locationId,
      locationName: order.locationName,
    });

    return NextResponse.json({
      success: true,
      payment: newPayment,
      remainingBalance: order.balance,
      order,
    });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

