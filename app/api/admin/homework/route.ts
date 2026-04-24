import { auth } from '@/lib/auth';
import { getAllHomework, createHomework } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const rows = await getAllHomework();
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { title, studentId, scheduledDate, problemPdfUrl, answerPdfUrl } = await req.json();
  if (!title || !studentId || !scheduledDate || !problemPdfUrl) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const row = await createHomework(title, studentId, session.user.id, scheduledDate, problemPdfUrl, answerPdfUrl);
  return NextResponse.json(row, { status: 201 });
}
