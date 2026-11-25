import { NextResponse } from 'next/server';
import { COOKIE_NAME, isValidToken } from './lib/auth';

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/admin/login')) return NextResponse.next();

  const isApi = pathname.startsWith('/api/');
  // Reading the catalog is public; only writes need admin.
  if (isApi && request.method === 'GET') return NextResponse.next();

  if (await isValidToken(request.cookies.get(COOKIE_NAME)?.value)) return NextResponse.next();

  if (isApi) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.redirect(new URL('/admin/login', request.url));
}

export const config = {
  matcher: ['/admin/:path*', '/api/products/:path*'],
};
