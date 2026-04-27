import { auth } from '@/lib/auth';
import { upsertBreakfastProblemFlag } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'student') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { problemId, reason } = (await req.json()) as {
    problemId: string;
    reason?: string;
  };
  if (!problemId) {
    return NextResponse.json({ error: 'problemId required' }, { status: 400 });
  }

  await upsertBreakfastProblemFlag(problemId, session.user.id, reason ?? null);
  return NextResponse.json({ success: true });
}
