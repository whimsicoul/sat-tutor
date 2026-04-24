import { auth } from '@/lib/auth';
import { getHomeworkByStudent, getHomeworkForTutorStudents, createHomework } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (session.user.role === 'student') {
    const rows = await getHomeworkByStudent(session.user.id);
    return NextResponse.json(rows);
  }

  if (session.user.role === 'tutor') {
    const rows = await getHomeworkForTutorStudents(session.user.id);
    return NextResponse.json(rows);
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'tutor') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { title, studentId, scheduledDate, problemPdfUrl, answerPdfUrl } = await req.json();
  if (!title || !studentId || !scheduledDate || !problemPdfUrl) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const row = await createHomework(title, studentId, session.user.id, scheduledDate, problemPdfUrl, answerPdfUrl);
  return NextResponse.json(row, { status: 201 });
}
