import { auth } from '@/lib/auth';
import { getAssignedTutorForStudent } from '@/lib/db';
import sql from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const session = await auth();
  if (!session || (session.user as { role?: string }).role !== 'student') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { proposedTime } = await req.json();
  if (!proposedTime) {
    return NextResponse.json({ error: 'proposedTime is required' }, { status: 400 });
  }

  const tutor = await getAssignedTutorForStudent(session.user.id);
  if (!tutor) {
    return NextResponse.json({ error: 'No tutor assigned yet. Please contact admin.' }, { status: 422 });
  }

  const [row] = await sql`
    INSERT INTO sessions (tutor_id, student_id, proposed_time, status)
    VALUES (${tutor.id as string}, ${session.user.id}, ${proposedTime}, 'approved')
    RETURNING id, tutor_id, student_id, proposed_time, status, created_at
  `;

  return NextResponse.json({ ...row, tutor_name: tutor.name }, { status: 201 });
}
