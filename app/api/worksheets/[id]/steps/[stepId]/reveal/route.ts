import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getWorksheetStepAnswerKey } from '@/lib/db';

async function requireAuth() {
  const session = await auth();
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id) return null;
  return user as { id: string; role: string };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; stepId: string }> },
) {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { stepId } = await params;
  const answerKey = await getWorksheetStepAnswerKey(stepId);
  if (!answerKey || (answerKey as unknown[]).length === 0) {
    return NextResponse.json({ error: 'No answer key available' }, { status: 404 });
  }
  return NextResponse.json({ answerKey });
}
