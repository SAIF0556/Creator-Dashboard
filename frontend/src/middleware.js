import { NextResponse } from 'next/server';

// List of public paths that don't require authentication
const publicPaths = ['/auth/login', '/auth/register'];

// List of admin paths that require admin authentication
const adminPaths = ['/admin'];

export function middleware(request) {
  const { pathname } = request.nextUrl;
  
  // Check if the path is a public route
  const isPublicPath = pathname === '/auth/login' || pathname === '/auth/signup';
  
  // Get the token from cookies
  const token = request.cookies.get('auth-token')?.value;
  const userRole = request.cookies.get('user-role')?.value;

  // If user is on a public path and has a token, redirect to appropriate dashboard
  if (isPublicPath && token) {
    const redirectPath = userRole === 'admin' ? '/admin/dashboard' : '/dashboard';
    return NextResponse.redirect(new URL(redirectPath, request.url));
  }

  // If user is not on a public path and doesn't have a token, redirect to login
  // if (!isPublicPath && !token) {
  //   return NextResponse.redirect(new URL('/auth/login', request.url));
  // }

  return NextResponse.next();
}

// Configure which paths the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}; 