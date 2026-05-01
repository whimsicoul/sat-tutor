import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getProblemSetById, getProblemSetResponses, upsertProblemSetResponse } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session || role !== 'student') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const ps = await getProblemSetById(id);
  if (!ps || ps.student_id !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const responses = await getProblemSetResponses(id, session.user.id);
  return NextResponse.json({ responses });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session || role !== 'student') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const ps = await getProblemSetById(id);
  if (!ps || ps.student_id !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await req.json() as {
    questionNumber: number;
    selectedAnswer: string | null;
    eliminatedChoices: string[];
  };

  const { questionNumber, selectedAnswer, eliminatedChoices } = body;
  if (typeof questionNumber !== 'number') {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  await upsertProblemSetResponse(id, session.user.id, questionNumber, selectedAnswer ?? null, eliminatedChoices ?? []);
  return NextResponse.json({ ok: true });
}
