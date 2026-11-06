import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { ClothingItem } from '@/models/ClothingItem';
import { requireAuth } from '@/lib/auth-helpers';

export async function GET(req: Request) {
  try {
    const auth = await requireAuth();
    if (!auth.user) return auth.response;

    await connectDB();
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');

    const filter: Record<string, unknown> = { active: true };
    if (category && category !== 'All') {
      filter.category = category;
    }

    const items = await ClothingItem.find(filter).sort({ name: 1 });
    return NextResponse.json({ success: true, items });
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

    const { name, category, icon, services, defaultService, defaultPrice } = body;

    if (!name || name.trim() === '') {
      return NextResponse.json({ success: false, message: 'Item name is required' }, { status: 400 });
    }

    // Build services array
    let serviceRates = services;
    if (!serviceRates || serviceRates.length === 0) {
      serviceRates = [
        { serviceName: defaultService || 'Wash & Iron', price: Number(defaultPrice) || 25 },
        { serviceName: 'Iron Only', price: Math.round((Number(defaultPrice) || 25) * 0.5) },
        { serviceName: 'Dry Clean', price: (Number(defaultPrice) || 25) * 2 },
      ];
    }

    const newItem = await ClothingItem.create({
      name: name.trim(),
      category: category || 'General',
      icon: icon || '👕',
      defaultService: defaultService || 'Wash & Iron',
      services: serviceRates,
      active: true,
      locationId: user.level > 0 && user.locationId ? user.locationId : null,
    });

    return NextResponse.json({ success: true, item: newItem });
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

    const { id, name, category, services, defaultService, active } = await req.json();
    if (!id) {
      return NextResponse.json({ success: false, message: 'Item ID is required' }, { status: 400 });
    }

    const updated = await ClothingItem.findByIdAndUpdate(
      id,
      {
        ...(name && { name: name.trim() }),
        ...(category && { category }),
        ...(services && { services }),
        ...(defaultService && { defaultService }),
        ...(active !== undefined && { active }),
      },
      { new: true }
    );

    return NextResponse.json({ success: true, item: updated });
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

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, message: 'Item ID is required' }, { status: 400 });
    }

    await ClothingItem.findByIdAndUpdate(id, { active: false });
    return NextResponse.json({ success: true, message: 'Item deactivated' });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

