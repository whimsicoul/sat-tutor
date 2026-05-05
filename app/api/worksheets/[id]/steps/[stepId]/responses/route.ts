import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getWorksheetStepResponses, upsertWorksheetStepResponse } from '@/lib/db';

async function requireStudent() {
  const session = await auth();
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id || (user.role !== 'student' && user.role !== 'admin')) return null;
  return user as { id: string; role: string };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; stepId: string }> },
) {
  const user = await requireStudent();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { stepId } = await params;
  const studentId = new URL(req.url).searchParams.get('studentId') ?? user.id;
  const responses = await getWorksheetStepResponses(stepId, studentId);
  return NextResponse.json({ responses });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; stepId: string }> },
) {
  const user = await requireStudent();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { stepId } = await params;
  const { questionNumber, selectedAnswer, eliminatedChoices } = await req.json() as {
    questionNumber: number;
    selectedAnswer: string | null;
    eliminatedChoices: string[];
  };
  await upsertWorksheetStepResponse(stepId, user.id, questionNumber, selectedAnswer, eliminatedChoices ?? []);
  return NextResponse.json({ ok: true });
}
