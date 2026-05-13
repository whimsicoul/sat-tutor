import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getWorksheetAnnotations, saveWorksheetAnnotations } from '@/lib/db';
import type { Annotations } from '@/types/annotations';

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
  const questionNumber = Number(new URL(req.url).searchParams.get('questionNumber'));
  if (!questionNumber) return NextResponse.json({ error: 'questionNumber required' }, { status: 400 });
  const annotations = await getWorksheetAnnotations(stepId, user.id, questionNumber);
  return NextResponse.json({ annotations });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; stepId: string }> },
) {
  const user = await requireStudent();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { stepId } = await params;
  const { questionNumber, annotations } = await req.json() as {
    questionNumber: number;
    annotations: Annotations;
  };
  await saveWorksheetAnnotations(stepId, user.id, questionNumber, annotations);
  return NextResponse.json({ ok: true });
}
