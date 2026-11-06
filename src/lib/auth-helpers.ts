import { cookies } from 'next/headers';
import { verifySession, SessionUser } from './session';
import { NextResponse } from 'next/server';

export type { SessionUser } from './session';

export async function getCurrentUser(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('lms_session');
    if (!sessionCookie) return null;

    const user = await verifySession(sessionCookie.value);
    if (!user) return null;

    // Check for an active selectedLocation cookie for admin
    const selectedLocCookie = cookieStore.get('lms_selected_location');
    if (selectedLocCookie && user.level === 0) {
      user.selectedLocationId = selectedLocCookie.value;
    } else if (user.level === 0 && !user.selectedLocationId) {
      user.selectedLocationId = 'all';
    }

    return user;
  } catch {
    return null;
  }
}

/**
 * Validates that an API request has an active session and meets the optional level requirement.
 * Returns { user } on success, or { response } on failure (401 or 403) ready to return.
 */
export async function requireAuth(maxLevel?: number): Promise<{ user: SessionUser; response?: never } | { user?: never; response: NextResponse }> {
  const user = await getCurrentUser();
  if (!user) {
    return {
      response: NextResponse.json(
        { success: false, message: 'Unauthorized. Please log in to continue.' },
        { status: 401 }
      ),
    };
  }

  // If a maxLevel is set (e.g. 0 for Admin only), verify permissions
  if (maxLevel !== undefined && user.level > maxLevel) {
    return {
      response: NextResponse.json(
        { success: false, message: 'Forbidden. You do not have permission to perform this action.' },
        { status: 403 }
      ),
    };
  }

  return { user };
}

/**
 * Returns a MongoDB query filter object based on the caller's role & location context.
 * Staff members are strictly locked to their assigned locationId.
 * Admins can filter by specific location or view consolidated data across all locations.
 */
export async function getLocationQueryFilter(
  req?: Request,
  overrideLocationId?: string | null
): Promise<Record<string, unknown>> {
  const user = await getCurrentUser();

  // If user is Staff (level >= 1), strictly force their assigned location
  if (user && user.level >= 1) {
    if (user.locationId) {
      return { locationId: user.locationId };
    }
    return { locationId: null };
  }

  // If user is Admin (level === 0)
  let locId = overrideLocationId;

  if (!locId && req) {
    const url = new URL(req.url);
    locId = url.searchParams.get('locationId');
  }

  if (!locId && user?.selectedLocationId) {
    locId = user.selectedLocationId;
  }

  if (locId && locId !== 'all') {
    return { locationId: locId };
  }

  // Consolidated / All locations for Admin
  return {};
}
