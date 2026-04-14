import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import sql from '@/lib/db';
import { generateICS } from '@/lib/calendar';

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = session.user.id;
  const [row] = await sql`
    SELECT * FROM sessions
    WHERE id = ${params.id}
      AND (student_id = ${userId} OR tutor_id = ${userId})
  `;

  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const ics = await generateICS({
    title: 'SAT Tutoring Session',
    start: new Date(row.proposed_time as string),
    durationMinutes: 60,
  });

  return new NextResponse(ics, {
    headers: {
      'Content-Type': 'text/calendar',
      'Content-Disposition': 'attachment; filename="session.ics"',
    },
  });
}
