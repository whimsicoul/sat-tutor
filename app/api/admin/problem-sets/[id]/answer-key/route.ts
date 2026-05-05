import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getProblemSetAnswerKey, bulkUpsertProblemSetAnswerKey } from '@/lib/db';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user as { role?: string }).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { id } = await params;
  const answerKey = await getProblemSetAnswerKey(id);
  return NextResponse.json({ answerKey });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user as { role?: string }).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { id } = await params;

  const body = await req.json() as { entries: { questionNumber: number; correctAnswer: string }[] };
  if (!Array.isArray(body.entries) || body.entries.length === 0) {
    return NextResponse.json({ error: 'entries array required' }, { status: 400 });
  }

  const valid = body.entries.filter(e => e.questionNumber && /^[A-Da-d]$/.test(e.correctAnswer));
  if (valid.length === 0) return NextResponse.json({ error: 'No valid entries' }, { status: 400 });

  await bulkUpsertProblemSetAnswerKey(id, valid);
  return NextResponse.json({ ok: true, saved: valid.length });
}
