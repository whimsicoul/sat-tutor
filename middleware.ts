import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const role = (req.auth?.user as { role?: string } | undefined)?.role;

  if (!req.auth && (pathname.startsWith('/student') || pathname.startsWith('/tutor'))) {
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
  matcher: ['/student/:path*', '/tutor/:path*'],
};
