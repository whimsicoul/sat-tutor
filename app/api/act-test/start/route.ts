import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { startActAttempt, getActiveActAttempt } from '@/lib/db';

const VALID_SECTIONS = ['english', 'math', 'reading', 'science'];

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { section } = await req.json();
  if (!VALID_SECTIONS.includes(section)) {
    return NextResponse.json({ error: 'Invalid section' }, { status: 400 });
  }

  const userId = session.user.id as string;

  // Resume an existing in-progress attempt if one exists
  const existing = await getActiveActAttempt(userId, section);
  if (existing) {
    return NextResponse.json({ attemptId: existing.id, startedAt: existing.started_at });
  }

  const attempt = await startActAttempt(userId, section);
  return NextResponse.json({ attemptId: attempt.id, startedAt: attempt.started_at });
}
