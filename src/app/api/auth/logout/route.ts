import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getCurrentUser } from '@/lib/auth-helpers';
import { Log } from '@/models/Log';
import { connectDB } from '@/lib/db';

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (user) {
      try {
        await connectDB();
        await Log.create({
          username: user.username,
          type: 'Login',
          logs: `${user.username} (${user.level === 0 ? 'Admin' : 'Staff'}) logged out`,
          locationId: user.locationId,
          locationName: user.locationName,
        });
      } catch {
        // ignore log error on logout
      }
    }

    const cookieStore = await cookies();
    cookieStore.delete('lms_session');
    cookieStore.delete('lms_selected_location');

    const res = NextResponse.json({ success: true, message: 'Logged out successfully' });
    // Also explicitly expire cookies in headers
    res.cookies.set('lms_session', '', { maxAge: 0, path: '/' });
    res.cookies.set('lms_selected_location', '', { maxAge: 0, path: '/' });
    return res;
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
