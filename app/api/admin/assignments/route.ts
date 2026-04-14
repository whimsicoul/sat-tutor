import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getTutorStudentAssignments, createTutorStudentAssignment } from '@/lib/db';

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if ((session.user as { role?: string }).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const assignments = await getTutorStudentAssignments();
  return NextResponse.json(assignments);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if ((session.user as { role?: string }).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { tutorId, studentId } = await req.json();
  if (!tutorId || !studentId) {
    return NextResponse.json({ error: 'Missing tutorId or studentId' }, { status: 400 });
  }

  const assignment = await createTutorStudentAssignment(tutorId, studentId);
  return NextResponse.json(assignment, { status: 201 });
}
