import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getProblemSetById, getProblemSetAnswerKey } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session || role !== 'student') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const ps = await getProblemSetById(id);
  if (!ps || ps.student_id !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (ps.answer_key_status !== 'done') {
    return NextResponse.json({ error: 'No answer key available' }, { status: 404 });
  }

  const answerKey = await getProblemSetAnswerKey(id);
  return NextResponse.json({ answerKey });
}
