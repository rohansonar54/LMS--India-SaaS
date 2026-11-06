import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Price } from '@/models/Price';
import { Log } from '@/models/Log';
import { requireAuth } from '@/lib/auth-helpers';

export async function GET() {
  try {
    const auth = await requireAuth();
    if (!auth.user) return auth.response;

    await connectDB();
    const prices = await Price.find().sort({ createdAt: 1 });
    return NextResponse.json({ success: true, prices });
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
    const { name, unit, price } = await req.json();

    if (!name || price === undefined) {
      return NextResponse.json({ success: false, message: 'Package name and rate are required' }, { status: 400 });
    }

    const newPrice = await Price.create({
      name: name.trim(),
      unit: (unit || 'kg').trim().toLowerCase(),
      price: Math.max(0, Number(price) || 0),
    });

    await Log.create({
      username: user.name || user.username || 'Admin',
      type: 'Pricing',
      logs: `Created bulk rate package: ${newPrice.name} (₹${newPrice.price}/${newPrice.unit})`,
    });

    return NextResponse.json({ success: true, price: newPrice });
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
    const { id, name, unit, price } = await req.json();

    if (!id || !name || price === undefined) {
      return NextResponse.json({ success: false, message: 'Package ID, name, and rate are required' }, { status: 400 });
    }

    const updated = await Price.findByIdAndUpdate(
      id,
      {
        name: name.trim(),
        unit: (unit || 'kg').trim().toLowerCase(),
        price: Math.max(0, Number(price) || 0),
      },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json({ success: false, message: 'Package not found' }, { status: 404 });
    }

    await Log.create({
      username: user.name || user.username || 'Admin',
      type: 'Pricing',
      logs: `Updated bulk rate package: ${updated.name} (₹${updated.price}/${updated.unit})`,
    });

    return NextResponse.json({ success: true, price: updated });
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
      return NextResponse.json({ success: false, message: 'Price ID required' }, { status: 400 });
    }

    const deleted = await Price.findByIdAndDelete(id);

    if (deleted) {
      await Log.create({
        username: user.name || user.username || 'Admin',
        type: 'Pricing',
        logs: `Deleted bulk rate package: ${deleted.name} (₹${deleted.price}/${deleted.unit})`,
      });
    }

    return NextResponse.json({ success: true, message: 'Price removed' });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
