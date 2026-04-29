import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getSessionSeries, createSessionSeries, adminCreateSession } from '@/lib/db';

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if ((session.user as { role?: string }).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const series = await getSessionSeries();
  return NextResponse.json(series);
}

/**
 * Creates a session_series record and bulk-generates individual session rows.
 * Body: { tutorId, studentId, recurrence: 'weekly'|'biweekly', startDate, endDate?, time }
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if ((session.user as { role?: string }).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { tutorId, studentId, recurrence, startDate, endDate, time } = await req.json();
  if (!tutorId || !studentId || !recurrence || !startDate || !time) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const rrule = recurrence === 'biweekly' ? 'FREQ=WEEKLY;INTERVAL=2' : 'FREQ=WEEKLY';
  const series = await createSessionSeries(tutorId, studentId, rrule, startDate, endDate) as { id: string };

  // Build occurrences as UTC timestamps so server timezone never shifts the date.
  // startDate/endDate are YYYY-MM-DD strings; time is HH:MM.
  const [startYear, startMonth, startDay] = (startDate as string).split('-').map(Number);
  const [hours, minutes] = (time as string).split(':').map(Number);

  const startUtc = Date.UTC(startYear, startMonth - 1, startDay, hours, minutes, 0, 0);
  const cutoffUtc = endDate
    ? (() => { const [y, mo, d] = (endDate as string).split('-').map(Number); return Date.UTC(y, mo - 1, d, 23, 59, 59, 0); })()
    : startUtc + 6 * 30 * 24 * 60 * 60 * 1000;

  const intervalMs = (recurrence === 'biweekly' ? 14 : 7) * 24 * 60 * 60 * 1000;
  const occurrences: string[] = [];
  let current = startUtc;
  while (current <= cutoffUtc) {
    occurrences.push(new Date(current).toISOString());
    current += intervalMs;
  }

  const created = await Promise.all(
    occurrences.map((t) => adminCreateSession(tutorId, studentId, t, series.id as string))
  );

  return NextResponse.json({ series, sessions: created }, { status: 201 });
}
