import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getWorksheetStepProblems,
  insertWorksheetStepProblem,
  deleteWorksheetStepProblem,
  updateWorksheetStepProblemAnswerKey,
} from '@/lib/db';

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
  const problems = await getWorksheetStepProblems(stepId);
  return NextResponse.json({ problems });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; stepId: string }> },
) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { stepId } = await params;
  const { questionNumber, questionImageUrl } = await req.json() as {
    questionNumber: number;
    questionImageUrl: string;
  };
  const problem = await insertWorksheetStepProblem(stepId, questionNumber, questionImageUrl);
  return NextResponse.json({ problem }, { status: 201 });
}

export async function DELETE(
  req: NextRequest,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _routeContext: { params: Promise<{ id: string; stepId: string }> },
) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { problemId } = await req.json() as { problemId: string };
  await deleteWorksheetStepProblem(problemId);
  return NextResponse.json({ ok: true });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; stepId: string }> },
) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { stepId } = await params;
  const { questionNumber, correctAnswer, explanationImageUrl, questionType, acceptedAnswers } = await req.json() as {
    questionNumber: number;
    correctAnswer: string | null;
    explanationImageUrl: string | null;
    questionType?: 'multiple_choice' | 'open_ended';
    acceptedAnswers?: string[];
  };
  const problem = await updateWorksheetStepProblemAnswerKey(
    stepId, questionNumber, correctAnswer, explanationImageUrl,
    questionType ?? 'multiple_choice',
    acceptedAnswers ?? [],
  );
  return NextResponse.json({ problem });
}
