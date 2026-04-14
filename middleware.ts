import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const role = (req.auth?.user as { role?: string } | undefined)?.role;

  // Unauthenticated — redirect to login for all protected paths
  if (!req.auth) {
    if (
      pathname.startsWith('/student') ||
      pathname.startsWith('/tutor') ||
      pathname.startsWith('/admin')
    ) {
      return NextResponse.redirect(new URL('/login', req.url));
    }
    return NextResponse.next();
  }

  // Admin trying to access non-admin portals — just let them stay in /admin
  if (role === 'admin') {
    if (pathname.startsWith('/student') || pathname.startsWith('/tutor')) {
      return NextResponse.redirect(new URL('/admin', req.url));
    }
    return NextResponse.next();
  }

  // Non-admin trying to access /admin
  if (pathname.startsWith('/admin')) {
    if (role === 'student') {
      return NextResponse.redirect(new URL('/student/problem-sets', req.url));
    }
    if (role === 'tutor') {
      return NextResponse.redirect(new URL('/tutor/problem-sets', req.url));
    }
    return NextResponse.redirect(new URL('/login', req.url));
  }

  if (role === 'student' && pathname.startsWith('/tutor')) {
    return NextResponse.redirect(new URL('/student/problem-sets', req.url));
  }

  if (role === 'tutor' && pathname.startsWith('/student')) {
    return NextResponse.redirect(new URL('/tutor/problem-sets', req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/student/:path*', '/tutor/:path*', '/admin/:path*'],
};
