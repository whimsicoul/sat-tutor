import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getWorksheetStepAnswerKey, saveWorksheetStepAnswerKey } from '@/lib/db';

async function requireAdmin() {
  const session = await auth();
  return (session?.user as { role?: string } | undefined)?.role === 'admin';
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; stepId: string }> },
) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { stepId } = await params;
  const answerKey = await getWorksheetStepAnswerKey(stepId);
  return NextResponse.json({ answerKey });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; stepId: string }> },
) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { stepId } = await params;
  const { entries } = await req.json() as {
    entries: { questionNumber: number; correctAnswer: string }[];
  };
  await saveWorksheetStepAnswerKey(stepId, entries);
  return NextResponse.json({ ok: true });
}
