import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getWorksheetStepProblems,
  insertWorksheetStepProblem,
  deleteWorksheetStepProblem,
  updateWorksheetStepProblemAnswerKey,
  updateWorksheetStepProblemMetadata,
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
  const { questionNumber, questionImageUrl, skill, difficulty, category } = await req.json() as {
    questionNumber: number;
    questionImageUrl: string;
    skill?: string | null;
    difficulty?: string | null;
    category?: string | null;
  };
  const problem = await insertWorksheetStepProblem(stepId, questionNumber, questionImageUrl, {
    skill, difficulty, category,
  });
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
  const body = await req.json() as {
    // metadata update fields
    problemId?: string;
    skill?: string | null;
    difficulty?: string | null;
    category?: string | null;
    // answer key update fields
    questionNumber?: number;
    correctAnswer?: string | null;
    explanationImageUrl?: string | null;
    explanationImageUrls?: string[];
    questionType?: 'multiple_choice' | 'open_ended';
    acceptedAnswers?: string[];
    answerBoxX?: number | null;
    answerBoxY?: number | null;
    answerBoxWidth?: number | null;
    answerBoxHeight?: number | null;
    answerBoxBottomPadding?: number | null;
  };

  // Metadata-only update (problemId present + at least one metadata field)
  if (body.problemId && ('skill' in body || 'difficulty' in body || 'category' in body)) {
    const problem = await updateWorksheetStepProblemMetadata(body.problemId, {
      skill: body.skill ?? null,
      difficulty: body.difficulty ?? null,
      category: body.category ?? null,
    });
    return NextResponse.json({ problem });
  }

  // Answer key update (existing behaviour)
  const {
    questionNumber, correctAnswer, explanationImageUrl, explanationImageUrls,
    questionType, acceptedAnswers, answerBoxX, answerBoxY, answerBoxWidth,
    answerBoxHeight, answerBoxBottomPadding,
  } = body;
  const resolvedUrls = explanationImageUrls ?? (explanationImageUrl ? [explanationImageUrl] : []);
  const hasAnswerBox = answerBoxX !== undefined;
  const problem = await updateWorksheetStepProblemAnswerKey(
    stepId, questionNumber!, correctAnswer ?? null, explanationImageUrl ?? null,
    questionType ?? 'multiple_choice',
    acceptedAnswers ?? [],
    answerBoxX ?? null,
    answerBoxY ?? null,
    answerBoxWidth ?? null,
    answerBoxHeight ?? null,
    resolvedUrls,
    hasAnswerBox,
    answerBoxBottomPadding ?? null,
  );
  return NextResponse.json({ problem });
}
