import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { connectDB } from '@/lib/db';
import { Location } from '@/models/Location';
import { verifySession } from '@/lib/session';

export async function GET() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('lms_session');

  if (!sessionCookie) {
    return NextResponse.json({ authenticated: false, user: null });
  }

  try {
    const user = await verifySession(sessionCookie.value);
    if (!user) {
      return NextResponse.json({ authenticated: false, user: null });
    }
    
    // Check if admin has selected a specific location
    const selectedCookie = cookieStore.get('lms_selected_location');
    if (user.level === 0 && selectedCookie) {
      user.selectedLocationId = selectedCookie.value;
    } else if (user.level === 0 && !user.selectedLocationId) {
      user.selectedLocationId = 'all';
    } else if (user.level > 0) {
      // Staff cannot switch locations - strictly enforced
      user.selectedLocationId = user.locationId;
    }

    // Attach active location name if single location selected
    if (user.selectedLocationId && user.selectedLocationId !== 'all') {
      try {
        await connectDB();
        const loc = await Location.findById(user.selectedLocationId);
        if (loc) {
          user.selectedLocationName = loc.name;
        }
      } catch {
        // ignore
      }
    } else if (user.selectedLocationId === 'all') {
      user.selectedLocationName = 'All Locations (Consolidated)';
    }

    return NextResponse.json({ authenticated: true, user });
  } catch {
    return NextResponse.json({ authenticated: false, user: null });
  }
}
