import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Service } from '@/models/Service';
import { Log } from '@/models/Log';
import { requireAuth } from '@/lib/auth-helpers';

const DEFAULT_SERVICES = [
  { name: 'Wash & Iron', code: 'wash_iron', defaultPrice: 25, category: 'Laundry', description: 'Complete water wash and hot iron finish', order: 1, active: true },
  { name: 'Iron Only', code: 'iron_only', defaultPrice: 12, category: 'Pressing', description: 'Crisp steam / hot press only', order: 2, active: true },
  { name: 'Dry Clean', code: 'dry_clean', defaultPrice: 60, category: 'Dry Cleaning', description: 'Special solvent chemical clean & press', order: 3, active: true },
  { name: 'Wash & Fold', code: 'wash_fold', defaultPrice: 20, category: 'Laundry', description: 'Gentle wash, tumble dry and neat fold', order: 4, active: true },
];

export async function GET(req: Request) {
  try {
    const auth = await requireAuth();
    if (!auth.user) return auth.response;

    await connectDB();
    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get('active') === 'true';

    const count = await Service.countDocuments();
    if (count === 0) {
      await Service.insertMany(DEFAULT_SERVICES);
    }

    const filter: Record<string, unknown> = {};
    if (activeOnly) {
      filter.active = true;
    }

    const services = await Service.find(filter).sort({ order: 1, createdAt: 1 });
    return NextResponse.json({ success: true, services });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireAuth(0);
    if (!auth.user) return auth.response;

    await connectDB();
    const user = auth.user;
    const body = await req.json();
    const { name, defaultPrice, category, description } = body;

    if (!name || name.trim() === '') {
      return NextResponse.json({ success: false, message: 'Service name is required' }, { status: 400 });
    }

    const trimmedName = name.trim();
    const existing = await Service.findOne({ name: { $regex: new RegExp(`^${trimmedName}$`, 'i') } });
    if (existing) {
      return NextResponse.json({ success: false, message: 'Service with this name already exists' }, { status: 400 });
    }

    const totalCount = await Service.countDocuments();
    const newService = await Service.create({
      name: trimmedName,
      code: trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
      defaultPrice: Math.max(0, Number(defaultPrice) || 25),
      category: category || 'Laundry',
      description: description?.trim() || '',
      active: true,
      order: totalCount + 1,
    });

    await Log.create({
      username: user.name || user.username || 'Admin',
      type: 'Services',
      logs: `Created laundry service: ${newService.name} (₹${newService.defaultPrice})`,
      locationId: user.selectedLocationId && user.selectedLocationId !== 'all' ? user.selectedLocationId : undefined,
    });

    return NextResponse.json({ success: true, service: newService });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const auth = await requireAuth(0);
    if (!auth.user) return auth.response;

    await connectDB();
    const user = auth.user;
    const body = await req.json();
    const { id, name, defaultPrice, category, description, active, order } = body;

    if (!id) {
      return NextResponse.json({ success: false, message: 'Service ID is required' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name.trim();
    if (defaultPrice !== undefined) updateData.defaultPrice = Math.max(0, Number(defaultPrice) || 0);
    if (category !== undefined) updateData.category = category;
    if (description !== undefined) updateData.description = description.trim();
    if (active !== undefined) updateData.active = Boolean(active);
    if (order !== undefined) updateData.order = Number(order) || 0;

    const updated = await Service.findByIdAndUpdate(id, updateData, { new: true });
    if (!updated) {
      return NextResponse.json({ success: false, message: 'Service not found' }, { status: 404 });
    }

    await Log.create({
      username: user.name || user.username || 'Admin',
      type: 'Services',
      logs: `Updated service: ${updated.name} (₹${updated.defaultPrice}, Active: ${updated.active})`,
      locationId: user.selectedLocationId && user.selectedLocationId !== 'all' ? user.selectedLocationId : undefined,
    });

    return NextResponse.json({ success: true, service: updated });
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
      return NextResponse.json({ success: false, message: 'Service ID is required' }, { status: 400 });
    }

    const deleted = await Service.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json({ success: false, message: 'Service not found' }, { status: 404 });
    }

    await Log.create({
      username: user.name || user.username || 'Admin',
      type: 'Services',
      logs: `Deleted laundry service: ${deleted.name}`,
      locationId: user.selectedLocationId && user.selectedLocationId !== 'all' ? user.selectedLocationId : undefined,
    });

    return NextResponse.json({ success: true, message: 'Service removed' });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
