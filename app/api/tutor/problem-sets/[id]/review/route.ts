import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getProblemSetById, getProblemSetResponsesForReview } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session || (role !== 'tutor' && role !== 'admin')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const ps = await getProblemSetById(id);
  if (!ps) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (role === 'tutor' && ps.tutor_id !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const studentId = searchParams.get('studentId') ?? (ps.student_id as string);

  const questions = await getProblemSetResponsesForReview(id, studentId);
  return NextResponse.json({ questions, problemSet: ps });
}
