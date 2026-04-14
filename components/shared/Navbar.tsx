'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { BookOpen, Calendar, MessageSquare, LogOut } from 'lucide-react';

interface NavbarProps {
  role: 'student' | 'tutor';
  userName: string;
}

const STUDENT_LINKS = [
  { href: '/student/problem-sets', label: 'Problem Sets', icon: BookOpen },
  { href: '/student/schedule', label: 'Schedule', icon: Calendar },
];

const TUTOR_LINKS = [
  { href: '/tutor/problem-sets', label: 'Problem Sets', icon: BookOpen },
  { href: '/tutor/schedule', label: 'Schedule', icon: Calendar },
  { href: '/tutor/testimonials', label: 'Testimonials', icon: MessageSquare },
];

export default function Navbar({ role, userName }: NavbarProps) {
  const pathname = usePathname();
  const links = role === 'tutor' ? TUTOR_LINKS : STUDENT_LINKS;
  const initials = userName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <nav
      style={{
        background: '#12192C',
        borderBottom: '1px solid rgba(201,168,76,0.15)',
      }}
    >
      <div className="max-w-5xl mx-auto px-5 h-14 flex items-center justify-between gap-4">
        {/* Brand */}
        <Link
          href="/"
          className="flex items-center gap-2.5 shrink-0"
          style={{ textDecoration: 'none' }}
        >
          <div
            className="w-7 h-7 rounded flex items-center justify-center text-xs font-bold"
            style={{ background: '#C9A84C', color: '#12192C', fontFamily: "'DM Sans', sans-serif" }}
          >
            DC
          </div>
          <span
            className="hidden sm:block text-sm font-semibold tracking-tight"
            style={{ color: '#F8F6F1', fontFamily: "'DM Sans', sans-serif" }}
          >
            DC SAT Tutor
          </span>
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-1">
          {links.map((link) => {
            const active = pathname === link.href;
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-all"
                style={{
                  background: active ? 'rgba(201,168,76,0.15)' : 'transparent',
                  color: active ? '#C9A84C' : 'rgba(248,246,241,0.6)',
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{link.label}</span>
              </Link>
            );
          })}
        </div>

        {/* User + sign out */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden sm:flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold"
              style={{ background: 'rgba(201,168,76,0.2)', color: '#C9A84C' }}
            >
              {initials}
            </div>
            <div className="leading-none">
              <p className="text-xs font-medium" style={{ color: '#F8F6F1', fontFamily: "'DM Sans', sans-serif" }}>
                {userName}
              </p>
              <p className="text-xs capitalize" style={{ color: 'rgba(248,246,241,0.4)', fontFamily: "'DM Sans', sans-serif" }}>
                {role}
              </p>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-all"
            style={{
              color: 'rgba(248,246,241,0.5)',
              border: '1px solid rgba(248,246,241,0.1)',
              fontFamily: "'DM Sans', sans-serif",
              background: 'transparent',
              cursor: 'pointer',
            }}
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
