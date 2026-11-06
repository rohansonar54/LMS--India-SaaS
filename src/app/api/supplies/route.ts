import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Supply } from '@/models/Supply';
import { Location } from '@/models/Location';
import { Log } from '@/models/Log';
import { getLocationQueryFilter, requireAuth } from '@/lib/auth-helpers';

export async function GET(req: Request) {
  try {
    const auth = await requireAuth();
    if (!auth.user) return auth.response;

    await connectDB();
    const locationFilter = await getLocationQueryFilter(req);
    const supplies = await Supply.find(locationFilter).sort({ name: 1 });
    return NextResponse.json({ success: true, supplies });
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

    // Check if it's a Stock-In / Stock-Out action
    if (body.action === 'stock-in' || body.action === 'stock-out') {
      const { id, quantity, note } = body;
      const supply = await Supply.findById(id);
      if (!supply) {
        return NextResponse.json({ success: false, message: 'Item not found' }, { status: 404 });
      }

      // Location isolation for staff
      if (user.level > 0 && supply.locationId && supply.locationId.toString() !== user.locationId) {
        return NextResponse.json(
          { success: false, message: 'Access denied: cannot adjust inventory for another location' },
          { status: 403 }
        );
      }

      const qty = Number(quantity);
      if (body.action === 'stock-in') {
        supply.stock += qty;
        await Log.create({
          username: user.name || user.username || 'Staff',
          type: 'Stock In',
          logs: `Added ${qty} ${supply.unit} of ${supply.name}. Reason: ${note || 'Restock'}`,
          locationId: supply.locationId,
          locationName: supply.locationName,
        });
      } else {
        if (supply.stock < qty) {
          return NextResponse.json({ success: false, message: 'Not enough stock available' }, { status: 400 });
        }
        supply.stock -= qty;
        await Log.create({
          username: user.name || user.username || 'Staff',
          type: 'Stock Out',
          logs: `Deducted ${qty} ${supply.unit} of ${supply.name}. Reason: ${note || 'Usage'}`,
          locationId: supply.locationId,
          locationName: supply.locationName,
        });
      }

      await supply.save();
      return NextResponse.json({ success: true, supply });
    }

    // Otherwise create new supply item
    const { name, unit, stock, cost, locationId: reqLocId } = body;

    let targetLocId = reqLocId;
    if (user.level > 0 && user.locationId) {
      targetLocId = user.locationId;
    } else if (!targetLocId && user.selectedLocationId && user.selectedLocationId !== 'all') {
      targetLocId = user.selectedLocationId;
    }

    let locationName = '';
    if (targetLocId) {
      const loc = await Location.findById(targetLocId);
      if (loc) locationName = loc.name;
    }

    const newSupply = await Supply.create({
      name: name.trim(),
      unit: unit || 'pcs',
      stock: Number(stock) || 0,
      cost: Number(cost) || 0,
      locationId: targetLocId || null,
      locationName,
    });

    await Log.create({
      username: user.name || user.username || 'Staff',
      type: 'Supply',
      logs: `Created new inventory item: ${name} (${stock} ${unit}) in ${locationName || 'General'}`,
      locationId: targetLocId || null,
      locationName,
    });

    return NextResponse.json({ success: true, supply: newSupply });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const auth = await requireAuth(0);
    if (!auth.user) return auth.response;

    await connectDB();
    const user = auth.user;
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, message: 'Supply ID required' }, { status: 400 });
    }

    const supply = await Supply.findByIdAndDelete(id);
    await Log.create({
      username: user.name || user.username || 'Admin',
      type: 'Supply',
      logs: `Deleted supply item: ${supply?.name || id}`,
      locationId: supply?.locationId,
      locationName: supply?.locationName,
    });

    return NextResponse.json({ success: true, message: 'Supply item deleted' });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
