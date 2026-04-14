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
  const isRose = role === 'student';

  return (
    <nav
      style={{
        background: 'var(--white)',
        borderBottom: '1px solid var(--fog)',
        boxShadow: '0 1px 8px rgba(26,29,35,0.04)',
      }}
    >
      <div className="max-w-5xl mx-auto px-5 h-14 flex items-center justify-between gap-4">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0" style={{ textDecoration: 'none' }}>
          {/* DC Flag */}
          <svg
            width="28"
            height="19"
            viewBox="0 0 90 60"
            xmlns="http://www.w3.org/2000/svg"
            style={{ borderRadius: 4, flexShrink: 0, boxShadow: '0 1px 4px rgba(0,0,0,0.18)', border: '0.5px solid rgba(0,0,0,0.08)' }}
          >
            <rect width="90" height="60" fill="#FFFFFF" />
            <rect x="0" y="25" width="90" height="10" fill="#C8102E" />
            <rect x="0" y="42" width="90" height="10" fill="#C8102E" />
            <polygon fill="#C8102E" points="15,4.5 17.18,10.84 23.89,10.84 18.36,14.82 20.54,21.16 15,17.18 9.46,21.16 11.64,14.82 6.11,10.84 12.82,10.84" />
            <polygon fill="#C8102E" points="45,4.5 47.18,10.84 53.89,10.84 48.36,14.82 50.54,21.16 45,17.18 39.46,21.16 41.64,14.82 36.11,10.84 42.82,10.84" />
            <polygon fill="#C8102E" points="75,4.5 77.18,10.84 83.89,10.84 78.36,14.82 80.54,21.16 75,17.18 69.46,21.16 71.64,14.82 66.11,10.84 72.82,10.84" />
          </svg>
          <span
            className="hidden sm:block text-sm font-semibold tracking-tight"
            style={{ color: 'var(--charcoal)' }}
          >
            DC SAT Tutor
          </span>
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-0.5">
          {links.map((link) => {
            const active = pathname === link.href;
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                style={{
                  background: active
                    ? (isRose ? 'rgba(224,166,175,0.18)' : 'rgba(168,203,222,0.18)')
                    : 'transparent',
                  color: active
                    ? (isRose ? 'var(--rose-deeper)' : 'var(--sky-deeper)')
                    : 'var(--slate)',
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
              style={{
                background: isRose ? 'rgba(224,166,175,0.22)' : 'rgba(168,203,222,0.22)',
                color: isRose ? 'var(--rose-deeper)' : 'var(--sky-deeper)',
              }}
            >
              {initials}
            </div>
            <div className="leading-none">
              <p className="text-xs font-semibold" style={{ color: 'var(--charcoal)' }}>
                {userName}
              </p>
              <p className="text-xs capitalize" style={{ color: 'var(--mist)' }}>
                {role}
              </p>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
            style={{
              color: 'var(--mist)',
              border: '1px solid var(--fog)',
              background: 'transparent',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--charcoal)';
              e.currentTarget.style.background = 'var(--frost)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--mist)';
              e.currentTarget.style.background = 'transparent';
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
