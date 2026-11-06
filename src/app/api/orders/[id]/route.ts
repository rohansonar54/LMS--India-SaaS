import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Order, OrderStatus } from '@/models/Order';
import { Payment } from '@/models/Payment';
import { Customer } from '@/models/Customer';
import { Log } from '@/models/Log';
import { requireAuth } from '@/lib/auth-helpers';
import { normalizeWorkflowStages } from '@/lib/workflow';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    if (!auth.user) return auth.response;

    await connectDB();
    const { id } = await params;
    const order = await Order.findById(id);
    if (!order) {
      return NextResponse.json({ success: false, message: 'Order not found' }, { status: 404 });
    }

    // Location isolation for staff
    if (auth.user.level > 0 && order.locationId?.toString() !== auth.user.locationId?.toString()) {
      return NextResponse.json(
        { success: false, message: 'Access denied: order belongs to another location' },
        { status: 403 }
      );
    }

    // Attach payment history
    const payments = await Payment.find({ orderId: order._id }).sort({ createdAt: -1 });

    return NextResponse.json({ success: true, order, payments });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    if (!auth.user) return auth.response;

    await connectDB();
    const user = auth.user;
    const { id } = await params;
    const body = await req.json();

    const order = await Order.findById(id);
    if (!order) {
      return NextResponse.json({ success: false, message: 'Order not found' }, { status: 404 });
    }

    // Location isolation for staff
    if (user.level > 0 && order.locationId?.toString() !== user.locationId?.toString()) {
      return NextResponse.json(
        { success: false, message: 'Access denied: cannot modify order from another location' },
        { status: 403 }
      );
    }

    const {
      status,
      staffName,
      paymentAmount,
      paymentMethod,
      referenceNumber,
      adminOverride,
      notes,
    } = body;

    const prevStatus = order.status;
    const targetStatus = (status as OrderStatus) || prevStatus;

    // Requirement 3 & 4: Before delivery / handover ('claimed'), check outstanding balance!
    if (targetStatus === 'claimed' && order.balance > 0) {
      const payingNow = Number(paymentAmount) || 0;

      if (payingNow > 0) {
        // Record payment
        const collected = Math.min(payingNow, order.balance);
        await Payment.create({
          orderId: order._id,
          orderNumber: order.orderNumber,
          customerId: order.customerId,
          customerName: order.customerName,
          locationId: order.locationId,
          locationName: order.locationName,
          amount: collected,
          method: paymentMethod || 'Cash',
          referenceNumber: referenceNumber || '',
          staffName: staffName || user?.name || 'Staff',
          notes: notes || 'Collected at pickup / delivery handover',
          isAdvance: false,
        });

        // Deduct from customer outstanding balance
        await Customer.findByIdAndUpdate(order.customerId, {
          $inc: { outstandingBalance: -collected },
        });

        order.amountPaid += collected;
        order.balance = Math.max(0, order.total - order.amountPaid);
        if (order.balance === 0) {
          order.paymentStatus = 'paid';
        } else {
          order.paymentStatus = 'partial';
        }
      } else if (!adminOverride && user?.level !== 0) {
        // Block delivery without payment or admin authorization
        return NextResponse.json(
          {
            success: false,
            requiresPayment: true,
            balance: order.balance,
            orderTotal: order.total,
            amountPaid: order.amountPaid,
            message: `Order #${order.orderNumber} has an outstanding balance of ₹${order.balance}. Payment must be recorded before releasing clothes.`,
          },
          { status: 400 }
        );
      }
    }

    // Normalize target status if legacy washing/drying is passed
    const effectiveStatus = (targetStatus === 'washing' || targetStatus === 'drying') ? 'washing_drying' : targetStatus;
    order.status = effectiveStatus;
    order.activeWorkflowSteps = normalizeWorkflowStages(order.activeWorkflowSteps);

    // Update timeline
    const now = new Date();
    if (effectiveStatus === 'processing') order.timeline.processingAt = now;
    if (effectiveStatus === 'washing_drying') {
      order.timeline.washingDryingAt = now;
      order.timeline.washingAt = now;
      order.timeline.dryingAt = now;
    }
    if (effectiveStatus === 'ironing') order.timeline.ironingAt = now;
    if (effectiveStatus === 'dry_cleaning') order.timeline.dryCleaningAt = now;
    if (effectiveStatus === 'folding') order.timeline.foldingAt = now;
    if (effectiveStatus === 'done') order.timeline.doneAt = now;
    if (effectiveStatus === 'claimed') order.timeline.claimedAt = now;

    // Push into status history
    if (!order.statusHistory) order.statusHistory = [];
    order.statusHistory.push({
      status: effectiveStatus,
      timestamp: now,
      staffName: staffName || user?.name || 'Staff',
      notes: notes || (adminOverride ? 'Handover with Admin Override' : undefined),
    });

    order.updatedAt = now;

    // Parallelize save and audit logging to eliminate a roundtrip (~200ms faster)
    await Promise.all([
      order.save(),
      Log.create({
        username: staffName || user?.name || 'Staff',
        type: 'Queue',
        logs: `Updated order #${order.orderNumber} status from "${prevStatus}" to "${targetStatus}"`,
        locationId: order.locationId,
        locationName: order.locationName,
      }),
    ]);

    return NextResponse.json({ success: true, order });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Only Admin can cancel/delete orders
    const auth = await requireAuth(0);
    if (!auth.user) return auth.response;

    await connectDB();
    const user = auth.user;
    const { id } = await params;
    const order = await Order.findByIdAndUpdate(id, { status: 'cancelled' }, { new: true });

    if (!order) {
      return NextResponse.json({ success: false, message: 'Order not found' }, { status: 404 });
    }

    await Log.create({
      username: user.name || user.username || 'Admin',
      type: 'Transaction',
      logs: `Cancelled order #${order?.orderNumber}`,
      locationId: order?.locationId,
      locationName: order?.locationName,
    });

    return NextResponse.json({ success: true, order });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
