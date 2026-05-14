import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import sql from '@/lib/db';

export async function POST(req: Request) {
  const authSession = await auth();
  const user = authSession?.user as { id?: string; role?: string } | undefined;
  if (!authSession || user?.role !== 'tutor') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { worksheetId, studentId } = (await req.json()) as { worksheetId: string; studentId: string };
  if (!worksheetId || !studentId) {
    return NextResponse.json({ error: 'Missing worksheetId or studentId' }, { status: 400 });
  }

  // Verify this student is assigned to this tutor
  const [assignment] = await sql`
    SELECT 1 FROM tutor_student_assignments
    WHERE tutor_id = ${user!.id} AND student_id = ${studentId}
  `;
  if (!assignment) {
    return NextResponse.json({ error: 'Student not assigned to you' }, { status: 403 });
  }

  // Verify worksheet exists
  const [worksheet] = await sql`SELECT id FROM worksheets WHERE id = ${worksheetId}`;
  if (!worksheet) {
    return NextResponse.json({ error: 'Worksheet not found' }, { status: 404 });
  }

  // Create a new session and attach the worksheet
  const [session] = await sql`
    INSERT INTO sessions (tutor_id, student_id, proposed_time, status, worksheet_id)
    VALUES (${user!.id}, ${studentId}, now(), 'approved', ${worksheetId})
    RETURNING id
  `;

  return NextResponse.json({ ok: true, sessionId: session.id });
}
