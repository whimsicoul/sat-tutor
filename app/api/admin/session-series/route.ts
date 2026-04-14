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
  const series = await createSessionSeries(tutorId, studentId, rrule, startDate, endDate);

  const [hours, minutes] = (time as string).split(':').map(Number);
  const start = new Date(startDate + 'T00:00:00');
  const cutoff = endDate
    ? new Date(endDate + 'T23:59:59')
    : new Date(start.getTime() + 6 * 30 * 24 * 60 * 60 * 1000);

  const intervalDays = recurrence === 'biweekly' ? 14 : 7;
  const occurrences: string[] = [];
  let current = new Date(start);
  current.setHours(hours, minutes, 0, 0);
  while (current <= cutoff) {
    occurrences.push(current.toISOString());
    current = new Date(current.getTime() + intervalDays * 24 * 60 * 60 * 1000);
  }

  const created = await Promise.all(
    occurrences.map((t) => adminCreateSession(tutorId, studentId, t, series.id))
  );

  return NextResponse.json({ series, sessions: created }, { status: 201 });
}
