'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { Users, CalendarDays, Coffee, LogOut, Settings, MessageSquare, BarChart2, FileText, Layers, TrendingUp } from 'lucide-react';
import { DCFlagIcon } from '@/components/ui/dc-flag';

const navItems = [
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/schedule', label: 'Schedule', icon: CalendarDays },
  { href: '/admin/worksheets', label: 'Worksheets', icon: Layers },
  { href: '/admin/breakfast-problems', label: 'Breakfast Problems', icon: Coffee },
  { href: '/admin/act-test', label: 'ACT Test', icon: FileText },
  { href: '/admin/test-results', label: 'Test Results', icon: BarChart2 },
  { href: '/admin/analytics', label: 'Analytics', icon: TrendingUp },
  { href: '/admin/testimonials', label: 'Testimonials', icon: MessageSquare },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside
      style={{
        width: 248,
        background: 'var(--white)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        position: 'sticky',
        top: 0,
        height: '100vh',
        overflowY: 'auto',
        borderRight: '1px solid var(--fog)',
        boxShadow: '2px 0 12px rgba(26,29,35,0.03)',
      }}
    >
      {/* Logo */}
      <Link
        href="/"
        style={{ textDecoration: 'none', display: 'block' }}
      >
      <div
        style={{
          padding: '28px 24px 20px',
          borderBottom: '1px solid var(--fog)',
          backgroundImage: 'url(/cherry-blossom.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(255,255,255,0.55)',
            backdropFilter: 'blur(1px)',
          }}
        />
        <div style={{ position: 'relative' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: 4,
            }}
          >
            <DCFlagIcon width={46} height={31} />
            <div>
              <div
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: 16,
                  fontWeight: 700,
                  color: 'var(--charcoal)',
                  lineHeight: 1.2,
                }}
              >
                DC SAT Tutor
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: 'var(--mist)',
                  marginTop: 2,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  fontFamily: "'Syne', sans-serif",
                }}
              >
                Admin Portal
              </div>
            </div>
          </div>
        </div>
      </div>
      </Link>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '16px 12px' }}>
        {navItems.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                borderRadius: 10,
                marginBottom: 2,
                textDecoration: 'none',
                fontSize: 14,
                fontWeight: active ? 600 : 400,
                color: active ? 'var(--rose-deeper)' : 'var(--slate)',
                background: active ? 'rgba(224,166,175,0.14)' : 'transparent',
                transition: 'all 0.15s',
                fontFamily: "'Syne', sans-serif",
                borderLeft: active ? '2px solid var(--rose)' : '2px solid transparent',
              }}
            >
              <Icon size={16} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Sign out */}
      <div style={{ padding: '12px 12px 24px', borderTop: '1px solid var(--fog)' }}>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="nav-signout"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 12px',
            borderRadius: 10,
            width: '100%',
            border: 'none',
            cursor: 'pointer',
            fontSize: 14,
            fontFamily: "'Syne', sans-serif",
          }}
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
