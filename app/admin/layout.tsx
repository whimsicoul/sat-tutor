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

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--page-bg)' }}>
      {/* Sidebar */}
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
            background: 'linear-gradient(135deg, var(--rose-ultra) 0%, var(--sky-ultra) 100%)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 4,
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                background: 'linear-gradient(135deg, var(--rose) 0%, var(--rose-dark) 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                fontWeight: 700,
                color: 'var(--white)',
                flexShrink: 0,
              }}
            >
              DC
            </div>
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

        {/* Divider + Sign out */}
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

      {/* Main content */}
      <main style={{ flex: 1, overflowX: 'hidden' }}>
        {children}
      </main>
    </div>
  );
}
