import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import sql from '@/lib/db';
import { emailStudentSessionProposed } from '@/lib/email';

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const role = (session.user as { role?: string }).role;
  const userId = session.user.id;

  if (role === 'student') {
    const rows = await sql`
      SELECT s.id, s.proposed_time, s.status, s.created_at,
             u.name AS tutor_name
      FROM sessions s
      JOIN users u ON u.id = s.tutor_id
      WHERE s.student_id = ${userId}
      ORDER BY s.proposed_time DESC
    `;
    return NextResponse.json(rows);
  }

  if (role === 'tutor') {
    const rows = await sql`
      SELECT s.id, s.proposed_time, s.status, s.created_at,
             u.name AS student_name, u.email AS student_email
      FROM sessions s
      JOIN users u ON u.id = s.student_id
      WHERE s.tutor_id = ${userId}
      ORDER BY s.proposed_time DESC
    `;
    return NextResponse.json(rows);
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

export async function POST(req: Request) {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session || role !== 'tutor') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { studentId, proposedTime } = await req.json();
  if (!studentId || !proposedTime) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const [newSession] = await sql`
    INSERT INTO sessions (tutor_id, student_id, proposed_time, status)
    VALUES (${session.user.id}, ${studentId}, ${proposedTime}, 'pending')
    RETURNING *
  `;

  try {
    const [student] = await sql`SELECT name, email FROM users WHERE id = ${studentId}`;
    const [tutor] = await sql`SELECT name FROM users WHERE id = ${session.user.id}`;
    await emailStudentSessionProposed({
      studentEmail: student.email as string,
      studentName: student.name as string,
      proposedTime: new Date(proposedTime),
      tutorName: tutor.name as string,
    });
  } catch {
    // Email failure is non-fatal
  }

  return NextResponse.json(newSession, { status: 201 });
}
