import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { User } from '@/models/User';
import { Location } from '@/models/Location';
import { Log } from '@/models/Log';
import { requireAuth } from '@/lib/auth-helpers';
import bcrypt from 'bcryptjs';

export async function GET() {
  try {
    const auth = await requireAuth(0);
    if (!auth.user) return auth.response;

    await connectDB();
    const staff = await User.find({ level: { $gte: 1 } })
      .select('-password')
      .sort({ createdAt: -1 });
    return NextResponse.json({ success: true, staff });
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
    const currentUser = auth.user;

    const { username, password, name, level, locationId } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ success: false, message: 'Username and password required' }, { status: 400 });
    }

    const existing = await User.findOne({ username: username.trim() });
    if (existing) {
      return NextResponse.json({ success: false, message: 'Username already taken' }, { status: 400 });
    }

    let locationName = '';
    if (locationId) {
      const loc = await Location.findById(locationId);
      if (loc) locationName = loc.name;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newStaff = await User.create({
      username: username.trim(),
      password: hashedPassword,
      name: name?.trim() || username,
      level: Number(level) || 1,
      locationId: locationId || null,
      locationName,
    });

    await Log.create({
      username: currentUser.name || currentUser.username || 'Admin',
      type: 'Staff',
      logs: `Registered new staff: ${newStaff.name} (${newStaff.username}) assigned to ${locationName || 'All Locations'}`,
    });

    return NextResponse.json({
      success: true,
      staff: {
        id: newStaff._id,
        username: newStaff.username,
        name: newStaff.name,
        level: newStaff.level,
        locationId: newStaff.locationId,
        locationName: newStaff.locationName,
      },
    });
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
      return NextResponse.json({ success: false, message: 'Staff ID required' }, { status: 400 });
    }

    await User.findByIdAndDelete(id);
    return NextResponse.json({ success: true, message: 'Staff account removed' });
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
    const currentUser = auth.user;
    const body = await req.json();
    const { id, username, password, name, level, locationId } = body;

    if (!id) {
      return NextResponse.json({ success: false, message: 'Staff ID is required' }, { status: 400 });
    }

    const staff = await User.findById(id);
    if (!staff) {
      return NextResponse.json({ success: false, message: 'Staff account not found' }, { status: 404 });
    }

    // Check if new username is already taken by another account
    if (username && username.trim().toLowerCase() !== staff.username.toLowerCase()) {
      const existing = await User.findOne({
        username: username.trim(),
        _id: { $ne: staff._id },
      });
      if (existing) {
        return NextResponse.json(
          { success: false, message: `Username "${username.trim()}" is already taken by another account` },
          { status: 400 }
        );
      }
      staff.username = username.trim();
    }

    if (name && name.trim()) {
      staff.name = name.trim();
    }

    if (level !== undefined) {
      staff.level = Number(level);
    }

    // Update password if provided
    if (password && password.trim()) {
      const hashedPassword = await bcrypt.hash(password.trim(), 10);
      staff.password = hashedPassword;
    }

    // Update location assignment
    if (locationId !== undefined) {
      if (locationId && locationId !== 'all') {
        const loc = await Location.findById(locationId);
        if (loc) {
          staff.locationId = loc._id;
          staff.locationName = loc.name;
        }
      } else {
        staff.locationId = null as any;
        staff.locationName = 'All Locations';
      }
    }

    await staff.save();

    await Log.create({
      username: currentUser.name || currentUser.username || 'Admin',
      type: 'Staff',
      logs: `Updated staff account: ${staff.name} (${staff.username}) - Location: ${staff.locationName || 'All Locations'}`,
      locationId: staff.locationId,
      locationName: staff.locationName,
    });

    return NextResponse.json({
      success: true,
      message: 'Staff account updated successfully',
      staff: {
        id: staff._id,
        username: staff.username,
        name: staff.name,
        level: staff.level,
        locationId: staff.locationId,
        locationName: staff.locationName,
      },
    });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
