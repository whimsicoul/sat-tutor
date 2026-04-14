import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getAllProblemSets, adminCreateProblemSet } from '@/lib/db';

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if ((session.user as { role?: string }).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const problemSets = await getAllProblemSets();
  return NextResponse.json(problemSets);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if ((session.user as { role?: string }).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { title, tutorId, studentId, problemPdfUrl, answerPdfUrl } = await req.json();
  if (!title || !tutorId || !studentId || !problemPdfUrl) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const ps = await adminCreateProblemSet(title, tutorId, studentId, problemPdfUrl, answerPdfUrl);
  return NextResponse.json(ps, { status: 201 });
}
