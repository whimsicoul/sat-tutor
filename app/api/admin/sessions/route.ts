import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getAllSessions, adminCreateSession } from '@/lib/db';

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if ((session.user as { role?: string }).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const sessions = await getAllSessions();
  return NextResponse.json(sessions);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if ((session.user as { role?: string }).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { tutorId, studentId, proposedTime, seriesId } = await req.json();
  if (!tutorId || !studentId || !proposedTime) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const newSession = await adminCreateSession(tutorId, studentId, proposedTime, seriesId);
  return NextResponse.json(newSession, { status: 201 });
}
