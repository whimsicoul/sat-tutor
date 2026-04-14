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
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F0F2F5' }}>
      {/* Sidebar */}
      <aside
        style={{
          width: 240,
          background: '#1F1F1F',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          position: 'sticky',
          top: 0,
          height: '100vh',
          overflowY: 'auto',
        }}
      >
        {/* Logo */}
        <div style={{ padding: '28px 24px 20px', borderBottom: '1px solid rgba(139,181,174,0.2)' }}>
          <div
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: 18,
              fontWeight: 700,
              color: '#8BB5AE',
              letterSpacing: '0.01em',
              lineHeight: 1.2,
            }}
          >
            DC SAT Tutor
          </div>
          <div style={{ fontSize: 11, color: 'rgba(240,242,245,0.35)', marginTop: 4, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: "'Syne', sans-serif" }}>
            Admin Portal
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
                  borderRadius: 8,
                  marginBottom: 2,
                  textDecoration: 'none',
                  fontSize: 14,
                  fontWeight: active ? 600 : 400,
                  color: active ? '#8BB5AE' : 'rgba(240,242,245,0.55)',
                  background: active ? 'rgba(139,181,174,0.12)' : 'transparent',
                  transition: 'all 0.15s',
                  fontFamily: "'Syne', sans-serif",
                }}
              >
                <Icon size={17} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Sign out */}
        <div style={{ padding: '12px 12px 24px' }}>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 12px',
              borderRadius: 8,
              width: '100%',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontSize: 14,
              color: 'rgba(240,242,245,0.4)',
              transition: 'color 0.15s',
              fontFamily: "'Syne', sans-serif",
            }}
          >
            <LogOut size={17} />
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
