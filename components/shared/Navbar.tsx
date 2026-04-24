'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { BookOpen, Calendar, LogOut, Settings, BarChart2, ClipboardList } from 'lucide-react';
import { DCFlagIcon } from '@/components/ui/dc-flag';

interface NavbarProps {
  role: 'student' | 'tutor';
  userName: string;
}

const STUDENT_LINKS = [
  { href: '/student/schedule', label: 'Schedule', icon: Calendar },
  { href: '/student/test-results', label: 'Test Results', icon: BarChart2 },
  { href: '/student/problem-sets', label: 'Problem Sets', icon: BookOpen },
  { href: '/student/homework', label: 'Homework', icon: ClipboardList },
  { href: '/student/settings', label: 'Settings', icon: Settings },
];

const TUTOR_LINKS = [
  { href: '/tutor/schedule', label: 'Schedule', icon: Calendar },
  { href: '/tutor/test-results', label: 'Test Results', icon: BarChart2 },
  { href: '/tutor/problem-sets', label: 'Problem Sets', icon: BookOpen },
  { href: '/tutor/homework', label: 'Homework', icon: ClipboardList },
  { href: '/tutor/settings', label: 'Settings', icon: Settings },
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
          <DCFlagIcon width={28} height={19} />
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
            className="nav-signout flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
