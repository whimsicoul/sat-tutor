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
    { label: 'Active Tutors', value: tutorCount[0].count, icon: Users, color: '#8BB5AE', href: '/admin/users?role=tutor' },
    { label: 'Active Students', value: studentCount[0].count, icon: Users, color: '#E0A6AF', href: '/admin/users?role=student' },
    { label: 'Sessions This Week', value: upcomingThisWeek[0].count, icon: CalendarDays, color: '#8BB5AE', href: '/admin/schedule' },
    { label: 'Pending Approvals', value: pendingCount[0].count, icon: Clock, color: '#E0A6AF', href: '/admin/schedule' },
  ];

  const quickActions = [
    { label: 'Add User', href: '/admin/users', description: 'Create a new tutor or student account' },
    { label: 'Schedule Session', href: '/admin/schedule', description: 'Propose a session or set recurring times' },
    { label: 'Assign Tutor', href: '/admin/assignments', description: 'Pair a tutor with a student' },
    { label: 'Create Problem Set', href: '/admin/problem-sets', description: 'Upload and assign PDF work' },
  ];

  return (
    <div style={{ padding: '40px 48px', maxWidth: 1100, fontFamily: "'Syne', sans-serif" }}>
      {/* Header */}
      <div style={{ marginBottom: 36 }}>
        <h1
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 32,
            fontWeight: 700,
            color: '#1F1F1F',
            margin: 0,
            lineHeight: 1.2,
          }}
        >
          Dashboard
        </h1>
        <p style={{ color: '#4A4F5A', marginTop: 6, fontSize: 15, fontFamily: "'Syne', sans-serif" }}>
          {format(new Date(), "EEEE, MMMM d, yyyy")}
        </p>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 40 }}>
        {stats.map(({ label, value, icon: Icon, color, href }) => (
          <Link key={label} href={href} style={{ textDecoration: 'none' }}>
            <div
              style={{
                background: '#fff',
                borderRadius: 12,
                padding: '24px 20px',
                border: '1px solid #D5D9E1',
                boxShadow: '0 1px 4px rgba(31,31,31,0.06)',
                transition: 'box-shadow 0.15s, transform 0.15s',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <span style={{ fontSize: 13, color: '#4A4F5A', fontWeight: 500, fontFamily: "'Syne', sans-serif" }}>{label}</span>
                <div style={{ background: color + '22', borderRadius: 8, padding: 8 }}>
                  <Icon size={16} style={{ color }} />
                </div>
              </div>
              <div style={{ fontSize: 34, fontWeight: 700, color: '#1F1F1F', fontFamily: "'Cormorant Garamond', serif" }}>
                {String(value)}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Lower section: upcoming sessions + quick actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 28 }}>
        {/* Upcoming sessions */}
        <div
          style={{
            background: '#fff',
            borderRadius: 12,
            border: '1px solid #D5D9E1',
            boxShadow: '0 1px 4px rgba(31,31,31,0.06)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '20px 24px',
              borderBottom: '1px solid #D5D9E1',
            }}
          >
            <h2
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: 18,
                fontWeight: 600,
                color: '#1F1F1F',
                margin: 0,
              }}
            >
              Upcoming Sessions
            </h2>
            <Link
              href="/admin/schedule"
              style={{ fontSize: 13, color: '#8BB5AE', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, fontFamily: "'Syne', sans-serif" }}
            >
              View all <ArrowRight size={13} />
            </Link>
          </div>

          {upcomingFive.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: '#8A9099', fontSize: 14, fontFamily: "'Syne', sans-serif" }}>
              No upcoming sessions
            </div>
          ) : (
            <div>
              {upcomingFive.map((s: Record<string, unknown>, i: number) => {
                const statusColor =
                  s.status === 'approved' ? '#8BB5AE' :
                  s.status === 'denied'   ? '#EF4444' : '#E0A6AF';
                const isLast = i === upcomingFive.length - 1;
                return (
                  <div
                    key={s.id as string}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '14px 24px',
                      borderBottom: isLast ? 'none' : '1px solid #E4E7EC',
                      gap: 16,
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#1F1F1F', fontFamily: "'Syne', sans-serif" }}>
                        {s.tutor_name as string} → {s.student_name as string}
                      </div>
                      <div style={{ fontSize: 13, color: '#4A4F5A', marginTop: 2, fontFamily: "'Syne', sans-serif" }}>
                        {format(new Date(s.proposed_time as string), "EEE MMM d, h:mm a")}
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        color: statusColor,
                        background: statusColor + '22',
                        padding: '3px 8px',
                        borderRadius: 20,
                        fontFamily: "'Syne', sans-serif",
                      }}
                    >
                      {s.status as string}
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
            background: '#fff',
            borderRadius: 12,
            border: '1px solid #D5D9E1',
            boxShadow: '0 1px 4px rgba(31,31,31,0.06)',
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #D5D9E1' }}>
            <h2
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: 18,
                fontWeight: 600,
                color: '#1F1F1F',
                margin: 0,
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
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 12px',
                  borderRadius: 8,
                  textDecoration: 'none',
                  marginBottom: 4,
                  transition: 'background 0.15s',
                }}
              >
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#1F1F1F', fontFamily: "'Syne', sans-serif" }}>{label}</div>
                  <div style={{ fontSize: 12, color: '#8A9099', marginTop: 2, fontFamily: "'Syne', sans-serif" }}>{description}</div>
                </div>
                <ArrowRight size={15} style={{ color: '#8BB5AE', flexShrink: 0 }} />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
