import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import sql from '@/lib/db';
import Link from 'next/link';
import { Users, CalendarDays, Clock, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';

export default async function AdminDashboardPage() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== 'admin') redirect('/login');

  const now = new Date().toISOString();
  const weekEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const [tutorCount, studentCount, upcomingThisWeek, pendingCount, upcomingFive] =
    await Promise.all([
      sql`SELECT COUNT(*) AS count FROM users WHERE role = 'tutor' AND active = true`,
      sql`SELECT COUNT(*) AS count FROM users WHERE role = 'student' AND active = true`,
      sql`SELECT COUNT(*) AS count FROM sessions WHERE proposed_time >= ${now} AND proposed_time <= ${weekEnd}`,
      sql`SELECT COUNT(*) AS count FROM sessions WHERE status = 'pending'`,
      sql`
        SELECT s.id, s.proposed_time, s.status,
               t.name AS tutor_name, st.name AS student_name
        FROM sessions s
        JOIN users t  ON t.id  = s.tutor_id
        JOIN users st ON st.id = s.student_id
        WHERE s.proposed_time >= ${now}
        ORDER BY s.proposed_time ASC
        LIMIT 5
      `,
    ]);

  const stats = [
    { label: 'Active Tutors', value: tutorCount[0].count, icon: Users, accent: 'sky', href: '/admin/users?role=tutor' },
    { label: 'Active Students', value: studentCount[0].count, icon: Users, accent: 'rose', href: '/admin/users?role=student' },
    { label: 'Sessions This Week', value: upcomingThisWeek[0].count, icon: CalendarDays, accent: 'sky', href: '/admin/schedule' },
    { label: 'Pending Approvals', value: pendingCount[0].count, icon: Clock, accent: 'rose', href: '/admin/schedule' },
  ];

  const quickActions = [
    { label: 'Add User', href: '/admin/users', description: 'Create a new tutor or student account' },
    { label: 'Schedule Session', href: '/admin/schedule', description: 'Propose a session or set recurring times' },
    { label: 'Assign Tutor', href: '/admin/assignments', description: 'Pair a tutor with a student' },
    { label: 'Create Problem Set', href: '/admin/problem-sets', description: 'Upload and assign PDF work' },
  ];

  return (
    <div style={{ padding: '40px 48px', fontFamily: "'Syne', sans-serif", minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ marginBottom: 36 }}>
        <h1
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 34,
            fontWeight: 700,
            color: 'var(--charcoal)',
            margin: 0,
            lineHeight: 1.2,
            letterSpacing: '-0.025em',
          }}
        >
          Dashboard
        </h1>
        <p style={{ color: 'var(--slate)', marginTop: 6, fontSize: 15 }}>
          {format(new Date(), "EEEE, MMMM d, yyyy")}
        </p>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 40 }}>
        {stats.map(({ label, value, icon: Icon, accent, href }) => {
          const isRose = accent === 'rose';
          return (
            <Link key={label} href={href} style={{ textDecoration: 'none' }}>
              <div
                className="hover-lift"
                style={{
                  background: 'var(--white)',
                  borderRadius: 14,
                  padding: '22px 20px',
                  border: isRose
                    ? '1px solid rgba(224,166,175,0.3)'
                    : '1px solid rgba(168,203,222,0.3)',
                  boxShadow: '0 2px 8px rgba(26,29,35,0.04)',
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Soft corner gradient */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    width: 80,
                    height: 80,
                    background: isRose
                      ? 'radial-gradient(ellipse at top right, rgba(224,166,175,0.2) 0%, transparent 70%)'
                      : 'radial-gradient(ellipse at top right, rgba(168,203,222,0.2) 0%, transparent 70%)',
                  }}
                />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <span style={{ fontSize: 13, color: 'var(--slate)', fontWeight: 500 }}>{label}</span>
                  <div
                    style={{
                      background: isRose ? 'rgba(224,166,175,0.18)' : 'rgba(168,203,222,0.18)',
                      borderRadius: 8,
                      padding: 8,
                    }}
                  >
                    <Icon size={16} style={{ color: isRose ? 'var(--rose-deeper)' : 'var(--sky-deeper)' }} />
                  </div>
                </div>
                <div
                  style={{
                    fontSize: 36,
                    fontWeight: 700,
                    color: 'var(--charcoal)',
                    fontFamily: "'Cormorant Garamond', serif",
                    letterSpacing: '-0.02em',
                  }}
                >
                  {String(value)}
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Lower section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 28, flex: 1, alignItems: 'start' }}>
        {/* Upcoming sessions */}
        <div
          style={{
            background: 'var(--white)',
            borderRadius: 14,
            border: '1px solid var(--fog)',
            boxShadow: '0 2px 8px rgba(26,29,35,0.04)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '18px 24px',
              borderBottom: '1px solid var(--fog)',
              background: 'linear-gradient(90deg, var(--sky-ultra) 0%, transparent 100%)',
            }}
          >
            <h2
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: 18,
                fontWeight: 600,
                color: 'var(--charcoal)',
                margin: 0,
                letterSpacing: '-0.01em',
              }}
            >
              Upcoming Sessions
            </h2>
            <Link
              href="/admin/schedule"
              style={{
                fontSize: 13,
                color: 'var(--sky-deeper)',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              View all <ArrowRight size={13} />
            </Link>
          </div>

          {upcomingFive.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--mist)', fontSize: 14, flex: 1 }}>
              No upcoming sessions
            </div>
          ) : (
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {upcomingFive.map((s: Record<string, unknown>, i: number) => {
                const status = s.status as string;
                const isLast = i === upcomingFive.length - 1;
                const statusStyle =
                  status === 'approved'
                    ? { color: 'var(--sky-deeper)', bg: 'rgba(168,203,222,0.18)' }
                    : status === 'denied'
                    ? { color: '#991B1B', bg: '#FEF2F2' }
                    : { color: 'var(--rose-deeper)', bg: 'rgba(224,166,175,0.18)' };

                return (
                  <div
                    key={s.id as string}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '14px 24px',
                      borderBottom: isLast ? 'none' : '1px solid var(--fog)',
                      gap: 16,
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--charcoal)' }}>
                        {s.tutor_name as string} → {s.student_name as string}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--slate)', marginTop: 2 }}>
                        {format(new Date(s.proposed_time as string), "EEE MMM d, h:mm a")}
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        color: statusStyle.color,
                        background: statusStyle.bg,
                        padding: '3px 10px',
                        borderRadius: 20,
                      }}
                    >
                      {status}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div
          style={{
            background: 'var(--white)',
            borderRadius: 14,
            border: '1px solid var(--fog)',
            boxShadow: '0 2px 8px rgba(26,29,35,0.04)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '18px 24px',
              borderBottom: '1px solid var(--fog)',
              background: 'linear-gradient(90deg, var(--rose-ultra) 0%, transparent 100%)',
            }}
          >
            <h2
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: 18,
                fontWeight: 600,
                color: 'var(--charcoal)',
                margin: 0,
                letterSpacing: '-0.01em',
              }}
            >
              Quick Actions
            </h2>
          </div>
          <div style={{ padding: '12px 16px' }}>
            {quickActions.map(({ label, href, description }) => (
              <Link
                key={href}
                href={href}
                className="hover-frost"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '11px 12px',
                  borderRadius: 10,
                  textDecoration: 'none',
                  marginBottom: 4,
                }}
              >
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--charcoal)' }}>{label}</div>
                  <div style={{ fontSize: 12, color: 'var(--mist)', marginTop: 2 }}>{description}</div>
                </div>
                <ArrowRight size={14} style={{ color: 'var(--rose)', flexShrink: 0 }} />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
