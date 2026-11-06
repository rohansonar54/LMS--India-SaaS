import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySession } from './lib/session';

// Admin-only page routes (Staff cannot access these pages)
const ADMIN_ONLY_PAGES = ['/locations', '/staff', '/settings', '/sales', '/reports'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Allow static Next.js assets, public images, icons
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/_next') ||
    pathname === '/favicon.ico' ||
    pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|webp)$/)
  ) {
    return NextResponse.next();
  }

  // 2. Identify public routes
  const isPublicRoute =
    pathname === '/login' ||
    pathname === '/tracking' ||
    pathname.startsWith('/tracking/') ||
    pathname === '/api/auth/login' ||
    pathname === '/api/auth/logout' ||
    pathname.startsWith('/api/tracking/') ||
    pathname === '/not-found' ||
    pathname === '/unauthorized' ||
    pathname === '/access-denied';

  // 3. Extract and verify session cookie
  const sessionCookie = request.cookies.get('lms_session')?.value;
  const user = sessionCookie ? await verifySession(sessionCookie) : null;
  const isAuthenticated = Boolean(user && user.id && user.username);

  // 4. If user is authenticated and visits /login, redirect to /dashboard
  if (isAuthenticated && pathname === '/login') {
    const dashboardUrl = new URL('/dashboard', request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  // 5. If route is public, allow access
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // 6. Handle unauthenticated access to protected routes
  if (!isAuthenticated) {
    // If an API route is called without authentication -> return 401 JSON
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized. Please log in to continue.' },
        { status: 401 }
      );
    }

    // If an internal page is visited -> redirect to /login
    const loginUrl = new URL('/login', request.url);
    // If the path was not root, append redirect parameter
    if (pathname !== '/') {
      loginUrl.searchParams.set('redirect', pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  // 7. Role-Based Access Control: Restrict Staff from Admin-Only Management Pages
  if (user && user.level > 0) {
    const isAdminOnlyPage = ADMIN_ONLY_PAGES.some(
      (adminPath) => pathname === adminPath || pathname.startsWith(`${adminPath}/`)
    );
    if (isAdminOnlyPage) {
      const accessDeniedUrl = new URL('/access-denied', request.url);
      return NextResponse.redirect(accessDeniedUrl);
    }
  }

  // 8. Authenticated request to protected route:
  // Forward request with security headers to prevent browser caching of sensitive data
  const response = NextResponse.next();
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');

  // Forward verified user identity to down-stream server components
  if (user) {
    response.headers.set('x-user-id', user.id);
    response.headers.set('x-user-role', String(user.level));
    if (user.locationId) {
      response.headers.set('x-user-location', user.locationId);
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for static files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

