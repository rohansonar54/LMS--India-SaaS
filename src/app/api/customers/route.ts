import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Customer } from '@/models/Customer';
import { Location } from '@/models/Location';
import { Log } from '@/models/Log';
import { getLocationQueryFilter, requireAuth } from '@/lib/auth-helpers';

export async function GET(req: Request) {
  try {
    const auth = await requireAuth();
    if (!auth.user) return auth.response;

    await connectDB();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.trim();

    const locationFilter = await getLocationQueryFilter(req);
    const filter: Record<string, unknown> = { ...locationFilter };

    if (search) {
      filter.$or = [
        { fullname: { $regex: search, $options: 'i' } },
        { contact: { $regex: search, $options: 'i' } },
      ];
    }

    const customers = await Customer.find(filter).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, customers });
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
    const { fullname, address, contact, locationId: reqLocId } = await req.json();

    if (!fullname || !contact) {
      return NextResponse.json({ success: false, message: 'Name and contact are required' }, { status: 400 });
    }

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

    const newCustomer = await Customer.create({
      fullname: fullname.trim(),
      address: address?.trim() || '',
      contact: contact.trim(),
      locationId: targetLocId || null,
      locationName,
      outstandingBalance: 0,
    });

    await Log.create({
      username: user.name || user.username || 'Staff',
      type: 'Customer',
      logs: `Added new customer: ${fullname} (${contact})`,
      locationId: targetLocId || null,
      locationName,
    });

    return NextResponse.json({ success: true, customer: newCustomer });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const auth = await requireAuth();
    if (!auth.user) return auth.response;

    await connectDB();
    const user = auth.user;
    const { id, fullname, address, contact, locationId: reqLocId } = await req.json();

    const existing = await Customer.findById(id);
    if (!existing) {
      return NextResponse.json({ success: false, message: 'Customer not found' }, { status: 404 });
    }

    // Location isolation for staff
    if (user.level > 0 && existing.locationId && existing.locationId.toString() !== user.locationId) {
      return NextResponse.json(
        { success: false, message: 'Access denied: cannot modify customer from another location' },
        { status: 403 }
      );
    }

    const updateData: Record<string, unknown> = {
      fullname: fullname?.trim() || existing.fullname,
      address: address?.trim() !== undefined ? address.trim() : existing.address,
      contact: contact?.trim() || existing.contact,
    };

    // Only admin can change customer location
    if (user.level === 0 && reqLocId) {
      updateData.locationId = reqLocId;
      const loc = await Location.findById(reqLocId);
      if (loc) updateData.locationName = loc.name;
    }

    const updated = await Customer.findByIdAndUpdate(id, updateData, { new: true });

    await Log.create({
      username: user.name || user.username || 'Staff',
      type: 'Customer',
      logs: `Updated customer: ${updated?.fullname || fullname}`,
      locationId: updated?.locationId,
      locationName: updated?.locationName,
    });

    return NextResponse.json({ success: true, customer: updated });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    // Restrict deletion to Admin
    const auth = await requireAuth(0);
    if (!auth.user) return auth.response;

    await connectDB();
    const user = auth.user;
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, message: 'Customer ID required' }, { status: 400 });
    }

    const removed = await Customer.findByIdAndDelete(id);

    await Log.create({
      username: user.name || user.username || 'Admin',
      type: 'Customer',
      logs: `Removed customer: ${removed?.fullname || id}`,
      locationId: removed?.locationId,
      locationName: removed?.locationName,
    });

    return NextResponse.json({ success: true, customer: removed });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
