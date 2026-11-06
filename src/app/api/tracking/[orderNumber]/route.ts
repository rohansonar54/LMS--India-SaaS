import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Order } from '@/models/Order';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ orderNumber: string }> }
) {
  try {
    await connectDB();
    const { orderNumber } = await params;
    const cleanIdentifier = (orderNumber || '').trim();

    if (!cleanIdentifier) {
      return NextResponse.json(
        {
          success: false,
          message: 'This tracking link is invalid or has expired. Please contact the laundry store for assistance.',
        },
        { status: 404 }
      );
    }

    // Lookup either by unique tracking token or exact orderNumber
    const order = await Order.findOne({
      $or: [
        { trackingToken: cleanIdentifier },
        { orderNumber: { $regex: new RegExp(`^${cleanIdentifier}$`, 'i') } },
      ],
    }).lean();

    if (!order) {
      return NextResponse.json(
        {
          success: false,
          message: 'This tracking link is invalid or has expired. Please contact the laundry store for assistance.',
        },
        { status: 404 }
      );
    }

    // Sanitize order data - strictly exclude private contact info, staff identifiers, and internal notes
    const sanitizedOrder = {
      orderNumber: order.orderNumber,
      trackingToken: order.trackingToken || null,
      customerName: order.customerName,
      locationName: order.locationName || 'Main Branch',
      status: order.status,
      activeWorkflowSteps: order.activeWorkflowSteps || [],
      timeline: order.timeline || {},
      expectedDeliveryDate: order.expectedDeliveryDate || null,
      createdAt: order.createdAt,
      orderItems: ((order.orderItems && order.orderItems.length > 0) ? order.orderItems : (order.items || [])).map((item: any) => ({
        itemName: item.itemName || item.typeName || 'Item',
        serviceName: item.serviceName || item.unit || 'Standard',
        qty: item.qty || 1,
        unitPrice: item.unitPrice || item.pricePerUnit || 0,
        subtotal: item.subtotal || 0,
      })),
      total: order.total || 0,
      amountPaid: order.amountPaid || 0,
      balance: order.balance !== undefined ? order.balance : Math.max(0, (order.total || 0) - (order.amountPaid || 0)),
      paymentStatus: order.paymentStatus || 'Pending',
    };

    return NextResponse.json({ success: true, order: sanitizedOrder });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
