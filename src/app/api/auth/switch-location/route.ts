import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getCurrentUser } from '@/lib/auth-helpers';
import { connectDB } from '@/lib/db';
import { Location } from '@/models/Location';

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthenticated' }, { status: 401 });
    }

    if (user.level !== 0) {
      return NextResponse.json(
        { success: false, message: 'Staff cannot switch locations. Access is restricted to assigned location.' },
        { status: 403 }
      );
    }

    const { locationId } = await req.json();
    const cookieStore = await cookies();

    if (!locationId || locationId === 'all') {
      cookieStore.set('lms_selected_location', 'all', {
        httpOnly: true,
        path: '/',
        maxAge: 60 * 60 * 24 * 30,
      });
      return NextResponse.json({
        success: true,
        selectedLocationId: 'all',
        selectedLocationName: 'All Locations (Consolidated)',
      });
    }

    await connectDB();
    const loc = await Location.findById(locationId);
    if (!loc) {
      return NextResponse.json({ success: false, message: 'Location not found' }, { status: 404 });
    }

    cookieStore.set('lms_selected_location', loc._id.toString(), {
      httpOnly: true,
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });

    return NextResponse.json({
      success: true,
      selectedLocationId: loc._id.toString(),
      selectedLocationName: loc.name,
    });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

