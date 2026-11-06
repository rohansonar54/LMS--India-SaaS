import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { User } from '@/models/User';
import { Log } from '@/models/Log';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { signSession } from '@/lib/session';

export async function POST(req: Request) {
  try {
    await connectDB();
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ success: false, message: 'Please provide username and password' }, { status: 400 });
    }

    const trimmedUser = username.trim();
    const user = await User.findOne({ username: trimmedUser });
    if (!user) {
      return NextResponse.json({ success: false, message: 'Invalid username or password' }, { status: 401 });
    }

    // Support existing validation (both hashed and direct plain-text matching)
    let isMatch = false;
    if (user.password.startsWith('$2')) {
      isMatch = await bcrypt.compare(password, user.password);
    } else {
      isMatch = password === user.password;
    }

    if (!isMatch) {
      return NextResponse.json({ success: false, message: 'Invalid username or password' }, { status: 401 });
    }

    // Generate cryptographically signed session token
    const token = await signSession({
      id: user._id.toString(),
      username: user.username,
      name: user.name,
      level: user.level,
      locationId: user.locationId ? user.locationId.toString() : null,
      locationName: user.locationName || (user.level === 0 ? 'All Locations' : 'Branch'),
      selectedLocationId: user.level === 0 ? 'all' : (user.locationId ? user.locationId.toString() : null),
    });

    const cookieStore = await cookies();
    cookieStore.set('lms_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    });

    // Write audit log
    await Log.create({
      username: user.username,
      type: 'Login',
      logs: `${user.username} (${user.level === 0 ? 'Admin' : 'Staff'}) logged in`,
      locationId: user.locationId,
      locationName: user.locationName,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        name: user.name,
        level: user.level,
        locationId: user.locationId,
        locationName: user.locationName,
        selectedLocationId: user.level === 0 ? 'all' : user.locationId,
      },
    });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
