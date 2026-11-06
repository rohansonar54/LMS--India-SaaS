import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Order, IOrderItem, ILaundryItem, ISupplyUsed } from '@/models/Order';
import { Customer } from '@/models/Customer';
import { Supply } from '@/models/Supply';
import { Location } from '@/models/Location';
import { Payment } from '@/models/Payment';
import { Log } from '@/models/Log';
import { getLocationQueryFilter, getCurrentUser, requireAuth } from '@/lib/auth-helpers';
import { getWorkflowStagesForServices, normalizeWorkflowStages } from '@/lib/workflow';
import crypto from 'crypto';

export async function GET(req: Request) {
  try {
    await connectDB();
    const { user, response } = await requireAuth();
    if (response) return response;

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const paymentStatus = searchParams.get('paymentStatus');
    const search = searchParams.get('search')?.trim();
    const sort = searchParams.get('sort') || 'newest';

    const locationFilter = await getLocationQueryFilter(req);
    const filter: Record<string, unknown> = { ...locationFilter };

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (paymentStatus && paymentStatus !== 'all') {
      filter.paymentStatus = paymentStatus;
    }

    if (search) {
      filter.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
        { customerContact: { $regex: search, $options: 'i' } },
      ];
    }

    let sortOptions: Record<string, 1 | -1> = { createdAt: -1 };
    if (sort === 'oldest') {
      sortOptions = { createdAt: 1 };
    } else if (sort === 'delivery') {
      sortOptions = { expectedDeliveryDate: 1 };
    }

    const limitParam = searchParams.get('limit');
    let orders;

    if (limitParam) {
      orders = await Order.find(filter).sort(sortOptions).limit(Number(limitParam) || 10).lean();
    } else if (status === 'claimed') {
      // Delivered section: limit to newest 150 orders
      orders = await Order.find(filter).sort({ createdAt: -1 }).limit(150).lean();
    } else if (!status || status === 'all') {
      // For queue board view: all active orders in progress, plus at most the newest 150 delivered orders
      const [activeOrders, deliveredOrders] = await Promise.all([
        Order.find({ ...filter, status: { $ne: 'claimed' } }).sort(sortOptions).lean(),
        Order.find({ ...filter, status: 'claimed' }).sort({ createdAt: -1 }).limit(150).lean(),
      ]);
      orders = [...activeOrders, ...deliveredOrders];
      if (sort === 'oldest') {
        orders.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      } else if (sort === 'delivery') {
        orders.sort((a, b) => (new Date(a.expectedDeliveryDate || a.createdAt).getTime()) - (new Date(b.expectedDeliveryDate || b.createdAt).getTime()));
      } else {
        orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
    } else {
      orders = await Order.find(filter).sort(sortOptions).lean();
    }

    const normalizedOrders = orders.map((o: any) => {
      const obj = { ...o };
      if (obj.status === 'washing' || obj.status === 'drying') {
        obj.status = 'washing_drying';
      }
      obj.activeWorkflowSteps = normalizeWorkflowStages(obj.activeWorkflowSteps);
      return obj;
    });
    return NextResponse.json({ success: true, orders: normalizedOrders });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
  
}

export async function POST(req: Request) {
  try {
    await connectDB();
    const { user, response } = await requireAuth();
    if (response) return response;

    const body = await req.json();

    const {
      customerId,
      orderItems,
      items, // legacy weight items
      supplies,
      additionalCharges = 0,
      discount = 0,
      amountPaid = 0,
      paymentMethod = 'Cash',
      referenceNumber = '',
      expectedDeliveryDate,
      staffName,
      locationId: requestedLocId,
      notes,
    } = body;

    if (!customerId) {
      return NextResponse.json({ success: false, message: 'Customer is required' }, { status: 400 });
    }

    const hasItemBased = Array.isArray(orderItems) && orderItems.length > 0;
    const hasWeightBased = Array.isArray(items) && items.length > 0;

    if (!hasItemBased && !hasWeightBased) {
      return NextResponse.json({ success: false, message: 'Please add at least one laundry item' }, { status: 400 });
    }

    const customer = await Customer.findById(customerId).lean();
    if (!customer) {
      return NextResponse.json({ success: false, message: 'Customer not found' }, { status: 404 });
    }

    // Determine target location: Staff is strictly locked to their assigned location
    let targetLocId = requestedLocId;
    if (user.level >= 1) {
      targetLocId = user.locationId;
    } else if (!targetLocId && user?.selectedLocationId && user.selectedLocationId !== 'all') {
      targetLocId = user.selectedLocationId;
    } else if (!targetLocId && customer.locationId) {
      targetLocId = customer.locationId;
    }

    let locationName = '';
    if (targetLocId) {
      const loc = await Location.findById(targetLocId).select('name').lean();
      if (loc) locationName = loc.name;
    }

    // Calculate subtotal
    let subtotal = 0;
    const servicesList: string[] = [];

    if (hasItemBased) {
      subtotal = (orderItems as IOrderItem[]).reduce((sum, it) => {
        if (it.serviceName) servicesList.push(it.serviceName);
        return sum + Number(it.subtotal || it.qty * it.unitPrice || 0);
      }, 0);
    } else if (hasWeightBased) {
      subtotal = (items as ILaundryItem[]).reduce((sum, it) => {
        if (it.typeName) servicesList.push(it.typeName);
        return sum + Number(it.subtotal || it.kilo * it.pricePerUnit || 0);
      }, 0);
    }

    const parsedAddCharges = Math.max(0, Number(additionalCharges) || 0);
    const parsedDiscount = Math.max(0, Number(discount) || 0);
    const total = Math.max(0, subtotal + parsedAddCharges - parsedDiscount);

    const paid = Math.max(0, Number(amountPaid) || 0);
    const change = Math.max(0, paid - total);
    const actualPaidTowardsTotal = Math.min(paid, total);
    const balance = Math.max(0, total - actualPaidTowardsTotal);

    let paymentStatus: 'paid' | 'partial' | 'unpaid' = 'unpaid';
    if (balance === 0) {
      paymentStatus = 'paid';
    } else if (actualPaidTowardsTotal > 0) {
      paymentStatus = 'partial';
    }

    // Dynamic service-based workflow
    const activeWorkflowSteps = getWorkflowStagesForServices(servicesList);

    // Generate Order Number
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = `LMS-${randomSuffix}`;

    // Deduct supplies if provided
    if (supplies && supplies.length > 0) {
      for (const sup of supplies as ISupplyUsed[]) {
        if (sup.supplyId) {
          await Supply.findByIdAndUpdate(sup.supplyId, {
            $inc: { stock: -Math.max(1, sup.qty || 1) },
          });
        }
      }
    }

    const now = new Date();
    const trackingToken = 'trk_' + crypto.randomBytes(12).toString('hex');
    const newOrder = await Order.create({
      orderNumber,
      trackingToken,
      locationId: targetLocId || null,
      locationName,
      customerId: customer._id,
      customerName: customer.fullname,
      customerContact: customer.contact,
      customerAddress: customer.address,
      userId: user?.id || null,
      staffName: staffName || user?.name || 'Staff',
      pricingType: hasItemBased ? 'item' : 'weight',
      orderItems: orderItems || [],
      items: items || [],
      supplies: supplies || [],
      subtotal,
      additionalCharges: parsedAddCharges,
      discount: parsedDiscount,
      total,
      amountPaid: actualPaidTowardsTotal,
      balance,
      change,
      paymentStatus,
      paymentMethod,
      status: 'pending',
      activeWorkflowSteps,
      expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : new Date(Date.now() + 86400000 * 2),
      timeline: { pendingAt: now },
      statusHistory: [
        {
          status: 'pending',
          timestamp: now,
          staffName: staffName || user?.name || 'Staff',
          notes: 'Order created',
        },
      ],
      notes: notes || '',
    });

    // Parallelize post-creation tasks (Payment, Customer Balance, and Audit Log) to save ~400ms-600ms
    const postTasks: Promise<any>[] = [];

    // Record Advance Payment if any amount paid
    if (actualPaidTowardsTotal > 0) {
      postTasks.push(
        Payment.create({
          orderId: newOrder._id,
          orderNumber: newOrder.orderNumber,
          customerId: customer._id,
          customerName: customer.fullname,
          locationId: targetLocId || null,
          locationName,
          amount: actualPaidTowardsTotal,
          method: paymentMethod || 'Cash',
          referenceNumber: referenceNumber || '',
          staffName: staffName || user?.name || 'Staff',
          notes: `Advance payment recorded at order creation`,
          isAdvance: true,
        })
      );
    }

    // Update customer outstanding balance if balance exists
    if (balance > 0) {
      postTasks.push(
        Customer.findByIdAndUpdate(customer._id, {
          $inc: { outstandingBalance: balance },
        })
      );
    }

    // Log transaction
    postTasks.push(
      Log.create({
        username: staffName || user?.name || 'Staff',
        type: 'Transaction',
        logs: `Created order #${orderNumber} for ${customer.fullname} - Total: ₹${total}, Paid: ₹${actualPaidTowardsTotal}, Balance: ₹${balance}`,
        locationId: targetLocId || null,
        locationName,
      })
    );

    await Promise.all(postTasks);

    return NextResponse.json({ success: true, order: newOrder });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
