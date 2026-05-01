import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getProblemSetQuestions, getProblemSetById } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const ps = await getProblemSetById(id);
  if (!ps) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const userId = session.user.id;
  const role = (session.user as { role?: string }).role;

  // Students can only access their own problem sets; tutors can access any they own
  if (role === 'student' && ps.student_id !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (role === 'tutor' && ps.tutor_id !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const questions = await getProblemSetQuestions(id);
  return NextResponse.json({ questions });
}
