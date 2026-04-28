import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import sql from '@/lib/db';
import Link from 'next/link';
import { CalendarDays, BookOpen, BarChart2, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import TodayDate from './TodayDate';

export default async function StudentDashboardPage() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== 'student') redirect('/login');

  const userId = session!.user.id;
  const now = new Date().toISOString();

  const [upcomingCount, problemSetsCount, testResultsCount, nextSessionRaw] =
    await Promise.all([
      sql`SELECT COUNT(*) AS count FROM sessions WHERE student_id = ${userId} AND proposed_time >= ${now}`,
      sql`SELECT COUNT(*) AS count FROM problem_sets WHERE student_id = ${userId}`,
      sql`SELECT COUNT(*) AS count FROM test_results WHERE student_id = ${userId}`,
      sql`
        SELECT s.id, s.proposed_time, s.status, u.name AS tutor_name
        FROM sessions s
        JOIN users u ON u.id = s.tutor_id
        WHERE s.student_id = ${userId} AND s.proposed_time >= ${now}
        ORDER BY s.proposed_time ASC
        LIMIT 1
      `,
    ]);

  const [upcomingRow] = upcomingCount as Record<string, number>[];
  const [problemSetsRow] = problemSetsCount as Record<string, number>[];
  const [testResultsRow] = testResultsCount as Record<string, number>[];
  const nextSession = (nextSessionRaw as Record<string, unknown>[])[0] ?? null;

  const stats = [
    { label: 'Upcoming Sessions', value: upcomingRow.count, icon: CalendarDays, accent: 'sky', href: '/student/schedule' },
    { label: 'Problem Sets', value: problemSetsRow.count, icon: BookOpen, accent: 'sky', href: '/student/problem-sets' },
    { label: 'Test Results', value: testResultsRow.count, icon: BarChart2, accent: 'rose', href: '/student/test-results' },
  ];

  const quickActions = [
    { label: 'View Schedule', href: '/student/schedule', description: 'Check your upcoming sessions' },
    { label: 'Breakfast Problems', href: '/student/breakfast-problems', description: 'Complete your daily practice' },
    { label: 'Problem Sets', href: '/student/problem-sets', description: 'Access your assigned materials' },
    { label: 'Test Results', href: '/student/test-results', description: 'Review your practice test scores' },
  ];

  const nextStatus = nextSession?.status as string | undefined;
  const nextStatusStyle = nextStatus === 'approved'
    ? { color: 'var(--sky-deeper)', bg: 'rgba(168,203,222,0.18)' }
    : nextStatus === 'denied'
    ? { color: '#991B1B', bg: '#FEF2F2' }
    : { color: 'var(--rose-deeper)', bg: 'rgba(224,166,175,0.18)' };

  return (
    <div style={{ margin: '-40px -20px', padding: '40px 48px', fontFamily: "'Syne', sans-serif", minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
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
          <TodayDate />
        </p>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 40 }}>
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
        {/* Next session */}
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
              Next Session
            </h2>
            <Link
              href="/student/schedule"
              style={{ fontSize: 13, color: 'var(--rose-deeper)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}
            >
              View all <ArrowRight size={13} />
            </Link>
          </div>

          {!nextSession ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--mist)', fontSize: 14, flex: 1 }}>
              No upcoming sessions scheduled
            </div>
          ) : (
            <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--charcoal)', marginBottom: 4 }}>
                  with {nextSession.tutor_name as string}
                </div>
                <div style={{ fontSize: 14, color: 'var(--slate)' }}>
                  {format(new Date(nextSession.proposed_time as string), "EEEE, MMMM d 'at' h:mm a")}
                </div>
              </div>
              {nextStatus && (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: nextStatusStyle.color,
                    background: nextStatusStyle.bg,
                    padding: '3px 10px',
                    borderRadius: 20,
                    flexShrink: 0,
                  }}
                >
                  {nextStatus}
                </span>
              )}
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
