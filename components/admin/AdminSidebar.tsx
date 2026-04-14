'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { LayoutDashboard, Users, Link2, CalendarDays, BookOpen, LogOut } from 'lucide-react';

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/assignments', label: 'Assignments', icon: Link2 },
  { href: '/admin/schedule', label: 'Schedule', icon: CalendarDays },
  { href: '/admin/problem-sets', label: 'Problem Sets', icon: BookOpen },
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
            {/* DC Flag */}
            <svg
              width="46"
              height="31"
              viewBox="0 0 90 60"
              xmlns="http://www.w3.org/2000/svg"
              style={{ borderRadius: 6, flexShrink: 0, boxShadow: '0 1px 6px rgba(0,0,0,0.22)', border: '0.5px solid rgba(0,0,0,0.08)' }}
            >
              <rect width="90" height="60" fill="#FFFFFF" />
              <rect x="0" y="25" width="90" height="10" fill="#C8102E" />
              <rect x="0" y="42" width="90" height="10" fill="#C8102E" />
              <polygon fill="#C8102E" points="15,4.5 17.18,10.84 23.89,10.84 18.36,14.82 20.54,21.16 15,17.18 9.46,21.16 11.64,14.82 6.11,10.84 12.82,10.84" />
              <polygon fill="#C8102E" points="45,4.5 47.18,10.84 53.89,10.84 48.36,14.82 50.54,21.16 45,17.18 39.46,21.16 41.64,14.82 36.11,10.84 42.82,10.84" />
              <polygon fill="#C8102E" points="75,4.5 77.18,10.84 83.89,10.84 78.36,14.82 80.54,21.16 75,17.18 69.46,21.16 71.64,14.82 66.11,10.84 72.82,10.84" />
            </svg>
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
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 12px',
            borderRadius: 10,
            width: '100%',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            fontSize: 14,
            color: 'var(--mist)',
            transition: 'color 0.15s, background 0.15s',
            fontFamily: "'Syne', sans-serif",
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
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
