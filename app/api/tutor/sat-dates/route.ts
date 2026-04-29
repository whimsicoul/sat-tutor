import { auth } from '@/lib/auth';
import { getSatDatesForTutorStudents, createSatDate } from '@/lib/db';
import sql from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  const session = await auth();
  if (!session || (session.user as { role?: string }).role !== 'tutor') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const dates = await getSatDatesForTutorStudents(session.user.id);
  return NextResponse.json(dates);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session || (session.user as { role?: string }).role !== 'tutor') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { studentId, testDate } = await req.json();
  if (!studentId || !testDate) {
    return NextResponse.json({ error: 'studentId and testDate are required' }, { status: 400 });
  }

  const [assignment] = await sql`
    SELECT 1 FROM tutor_student_assignments
    WHERE tutor_id = ${session.user.id} AND student_id = ${studentId}
  `;
  if (!assignment) {
    return NextResponse.json({ error: 'Student not assigned to you' }, { status: 403 });
  }

  const row = await createSatDate(studentId, testDate, session.user.id);
  return NextResponse.json(row, { status: 201 });
}
