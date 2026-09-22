import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
 
const TOKEN_COOKIE_KEY = 'accessToken';
const HOME_PAGE = '/home';
 
export function proxy(request: NextRequest) {
  // 1. Get the access token from the request cookies
  const accessToken = request.cookies.get(TOKEN_COOKIE_KEY)?.value;
 
  // 2. Get the path the user is trying to access
  const { pathname } = request.nextUrl;
 
  // 3. Define public paths that do not require authentication
  const publicPaths = ['/login', '/forgot-password', '/reset-password'];
 
  // Check if the current path is a public path
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path));
 
  // 4. Redirect Logic
  // If the user has a token and is trying to access a public page (like login),
  // redirect them to the home page.
  if (accessToken) {
    // If the user is logged in and tries to access a public path OR the root path,
    // redirect them to the main application page.
    if (isPublicPath || pathname === '/') {
      return NextResponse.redirect(new URL(HOME_PAGE, request.url));
    }
  }
 
  // If the user does not have a token and is trying to access a protected page,
  // redirect them to the login page.
  if (!accessToken && !isPublicPath) {
    // Store the original URL they tried to access to redirect them back after login
    const loginUrl = new URL('/login', request.url);
    // Include query parameters in the redirect if they exist
    const fullPathname = pathname + (request.nextUrl.search || '');
    loginUrl.searchParams.set('redirect', fullPathname);
    return NextResponse.redirect(loginUrl);
  }
 
  // 5. If none of the above conditions are met, allow the request to continue
  return NextResponse.next();
}
 
// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     *
     * This ensures the middleware runs on all pages but not on static assets.
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};