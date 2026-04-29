import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import sql from '@/lib/db';
import { emailStudentSessionProposed } from '@/lib/email';

export async function POST(req: Request) {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session || role !== 'tutor') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { studentId, startDate, time, recurrenceRule, endDate } = await req.json();
  if (!studentId || !startDate || !time || !recurrenceRule) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Parse which weekdays to schedule (from recurrence rule BYDAY=MO,WE etc.)
  const bydayMatch = recurrenceRule.match(/BYDAY=([A-Z,]+)/);
  const dayAbbrs = bydayMatch ? bydayMatch[1].split(',') : [];
  const DAY_MAP: Record<string, number> = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };
  const targetDays = dayAbbrs.map((a: string) => DAY_MAP[a]).filter((d: number) => d !== undefined);

  if (targetDays.length === 0) {
    return NextResponse.json({ error: 'No valid days in recurrence rule' }, { status: 400 });
  }

  // Build occurrences as UTC timestamps so server timezone never shifts the date.
  const [startYear, startMonth, startDay] = (startDate as string).split('-').map(Number);
  const [h, m] = time.split(':').map(Number);

  const windowEndUtc = endDate
    ? (() => { const [y, mo, d] = (endDate as string).split('-').map(Number); return Date.UTC(y, mo - 1, d, 23, 59, 59); })()
    : Date.UTC(startYear, startMonth - 1, startDay, h, m, 0) + 6 * 30 * 24 * 60 * 60 * 1000;

  const dayMs = 24 * 60 * 60 * 1000;
  const occurrences: Date[] = [];
  // Iterate day by day in UTC
  let cur = Date.UTC(startYear, startMonth - 1, startDay);
  while (cur <= windowEndUtc) {
    const dayOfWeek = new Date(cur).getUTCDay();
    if (targetDays.includes(dayOfWeek)) {
      occurrences.push(new Date(Date.UTC(
        new Date(cur).getUTCFullYear(),
        new Date(cur).getUTCMonth(),
        new Date(cur).getUTCDate(),
        h, m, 0, 0
      )));
    }
    cur += dayMs;
  }

  if (occurrences.length === 0) {
    return NextResponse.json({ error: 'No occurrences generated' }, { status: 400 });
  }

  // Cap at 52 sessions to prevent runaway creation
  const capped = occurrences.slice(0, 52);

  // Create series record
  const [series] = await sql`
    INSERT INTO session_series (tutor_id, student_id, recurrence_rule, start_date, end_date)
    VALUES (${session.user.id}, ${studentId}, ${recurrenceRule}, ${startDate}, ${endDate || null})
    RETURNING id
  `;

  // Insert all sessions
  const newSessions = await Promise.all(
    capped.map((time) =>
      sql`
        INSERT INTO sessions (tutor_id, student_id, proposed_time, status, series_id)
        VALUES (${session.user.id}, ${studentId}, ${time.toISOString()}, 'pending', ${series.id})
        RETURNING *
      `.then((rows) => rows[0])
    )
  );

  // Send one email for the series
  try {
    const [student] = await sql`SELECT name, email FROM users WHERE id = ${studentId}`;
    const [tutor] = await sql`SELECT name FROM users WHERE id = ${session.user.id}`;
    await emailStudentSessionProposed({
      studentEmail: student.email as string,
      studentName: student.name as string,
      proposedTime: capped[0],
      tutorName: tutor.name as string,
    });
  } catch (err) {
    console.error('[email error]', err);
  }

  return NextResponse.json(newSessions, { status: 201 });
}
