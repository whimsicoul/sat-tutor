import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getAssignedTutorForStudent, adminCreateSession, setSessionWorksheet } from '@/lib/db';
import sql from '@/lib/db';

async function requireAdmin() {
  const session = await auth();
  if (!session) return null;
  if ((session.user as { role?: string }).role !== 'admin') return null;
  return session;
}

export async function POST(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { worksheetId, studentId } = (await req.json()) as { worksheetId: string; studentId: string };
  if (!worksheetId || !studentId) {
    return NextResponse.json({ error: 'Missing worksheetId or studentId' }, { status: 400 });
  }

  // Verify worksheet exists
  const [worksheet] = await sql`SELECT id FROM worksheets WHERE id = ${worksheetId}`;
  if (!worksheet) {
    return NextResponse.json({ error: 'Worksheet not found' }, { status: 404 });
  }

  // Verify student exists
  const [student] = await sql`SELECT id FROM users WHERE id = ${studentId} AND role = 'student'`;
  if (!student) {
    return NextResponse.json({ error: 'Student not found' }, { status: 404 });
  }

  // Get student's assigned tutor
  const tutor = await getAssignedTutorForStudent(studentId);
  if (!tutor) {
    return NextResponse.json(
      { error: 'Student has no assigned tutor — assign a tutor first' },
      { status: 400 }
    );
  }

  const tutorRow = tutor as { id: string };

  // Create a new session and attach the worksheet
  const session = await adminCreateSession(tutorRow.id, studentId, new Date().toISOString());
  await setSessionWorksheet((session as { id: string }).id, worksheetId);

  return NextResponse.json({ ok: true, sessionId: (session as { id: string }).id });
}
